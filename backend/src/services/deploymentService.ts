import * as Sentry from "@sentry/node";
import { ITask } from "pg-promise";
import { Database } from "../db/database";
import { DockerService } from "./dockerService";
import { RouterService } from "./routerService";
import { DeploymentRepository, WorkerRepository, GpuRepository } from "../db";
import { Worker, WorkerCreate, GpuType } from "../types";

interface CreateDeploymentParams {
  name: string;
  modelId: string;
  gpuType?: GpuType;
  workersPerGpu?: number;
}

interface GpuAllocation {
  serverId: number;
  serverName: string;
  gpuId: number;
  port: number;
}

interface PortManager {
  basePort: number;
  maxPort: number;
  currentPort: number;
  usedPorts: Set<number>;
}

export class DeploymentService {
  private portManager: PortManager;

  constructor(
    private dockerService: DockerService,
    private routerService: RouterService,
    private db: Database,
    private deployments: DeploymentRepository,
    private workers: WorkerRepository,
    private gpus: GpuRepository
  ) {
    this.portManager = {
      basePort: 8001,
      maxPort: 9000,
      currentPort: 8001,
      usedPorts: new Set(),
    };
  }

  async createDeployment(params: CreateDeploymentParams): Promise<number> {
    try {
      return await this.db.tx(async (t: ITask<any>) => {
        // Create deployment record
        const deployment = await this.deployments.create(
          {
            name: params.name,
            modelId: params.modelId,
            status: "creating",
          },
          t
        );

        Sentry.addBreadcrumb({
          category: "deployment",
          message: `Created deployment record: ${deployment.id}`,
          level: "info",
        });

        // Allocate GPUs
        const allocations = await this.allocateGpus(
          {
            gpuType: params.gpuType,
            workersPerGpu: params.workersPerGpu,
          },
          t
        );

        // Create workers on allocated GPUs
        const workers = await this.createWorkers(deployment.id, allocations);
        await this.workers.createMany(workers, t);

        // Update router with new workers
        const allWorkers = await this.workers.getAllActiveWorkerAddresses(t);
        await this.routerService.updateWorkers(allWorkers);

        // Update deployment status
        await this.deployments.update(deployment.id, { status: "running" }, t);

        return deployment.id;
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: "create_deployment",
        },
        extra: {
          params,
        },
      });
      throw error;
    }
  }

  async moveDeployment(
    deploymentId: number,
    targetGpuIds: number[]
  ): Promise<void> {
    try {
      await this.db.tx(async (t: ITask<any>) => {
        const deployment = await this.deployments.findById(deploymentId, t);
        if (!deployment) {
          throw new Error("Deployment not found");
        }

        // Create new workers
        const allocations = await this.allocateSpecificGpus(targetGpuIds, t);
        const newWorkers = await this.createWorkers(deploymentId, allocations);
        await this.workers.createMany(newWorkers, t);

        // Update router with all workers
        const allWorkers = await this.workers.getAllActiveWorkerAddresses(t);
        await this.routerService.updateWorkers(allWorkers);

        // Stop old workers
        const oldWorkers = await this.workers.findByDeploymentId(
          deploymentId,
          t
        );
        await this.stopWorkers(oldWorkers);
        await this.workers.deactivateWorkers(
          oldWorkers.map((w) => w.id),
          t
        );

        // Release old ports
        oldWorkers.forEach((worker) => this.releasePort(worker.port));
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: "move_deployment",
        },
        extra: {
          deploymentId,
          targetGpuIds,
        },
      });
      throw error;
    }
  }

  async deleteDeployment(deploymentId: number): Promise<void> {
    try {
      await this.db.tx(async (t: ITask<any>) => {
        const workers = await this.workers.findByDeploymentId(deploymentId, t);
        await this.stopWorkers(workers);
        await this.workers.deactivateWorkers(
          workers.map((w) => w.id),
          t
        );

        // Release ports
        workers.forEach((worker) => this.releasePort(worker.port));

        const remainingWorkers = await this.workers.getAllActiveWorkerAddresses(
          t
        );
        await this.routerService.updateWorkers(remainingWorkers);

        await this.deployments.update(deploymentId, { status: "deleted" }, t);
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: "delete_deployment",
        },
        extra: {
          deploymentId,
        },
      });
      throw error;
    }
  }

  private getNextPort(): number {
    // Try to find the next available port
    while (this.portManager.currentPort <= this.portManager.maxPort) {
      const port = this.portManager.currentPort++;

      // Reset to base port if we've reached max
      if (this.portManager.currentPort > this.portManager.maxPort) {
        this.portManager.currentPort = this.portManager.basePort;
      }

      // If port is not in use, return it
      if (!this.portManager.usedPorts.has(port)) {
        this.portManager.usedPorts.add(port);
        return port;
      }
    }

    throw new Error("No available ports");
  }

  private releasePort(port: number): void {
    this.portManager.usedPorts.delete(port);
  }

  private async createWorkers(
    deploymentId: number,
    allocations: GpuAllocation[]
  ): Promise<WorkerCreate[]> {
    const workers: WorkerCreate[] = [];

    for (const allocation of allocations) {
      const containerConfig = {
        Image: process.env.VLLM_IMAGE || "vllm/vllm-openai:latest",
        Env: ["WORKER_MODE=True", `GPU_DEVICE_ID=${allocation.gpuId}`],
        ExposedPorts: {
          [`${allocation.port}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${allocation.port}/tcp`]: [{ HostPort: String(allocation.port) }],
          },
          Runtime: "nvidia",
          DeviceRequests: [
            {
              Driver: "nvidia",
              Count: 1,
              Capabilities: [["gpu"]],
              DeviceIDs: [String(allocation.gpuId)],
            },
          ],
        },
        name: `vllm-worker-${deploymentId}-gpu${allocation.gpuId}`,
      };

      const container = await this.dockerService.createContainer(
        allocation.serverName,
        containerConfig
      );

      workers.push({
        deploymentId,
        gpuId: allocation.gpuId,
        serverName: allocation.serverName,
        containerId: container.id,
        port: allocation.port,
        status: "running",
      });
    }

    return workers;
  }

  private async stopWorkers(workers: Worker[]): Promise<void> {
    for (const worker of workers) {
      await this.dockerService.stopContainer(
        worker.serverName,
        `vllm-worker-${worker.deploymentId}-gpu${worker.gpuId}`
      );
    }
  }

  private async allocateGpus(
    requirements: {
      gpuType?: GpuType;
      workersPerGpu?: number;
    },
    tx?: ITask<any>
  ): Promise<GpuAllocation[]> {
    const availableGpus = await this.gpus.findAvailableGpus(
      {
        gpuType: requirements.gpuType,
        maxWorkersPerGpu: requirements.workersPerGpu || 1,
      },
      tx
    );

    if (availableGpus.length === 0) {
      throw new Error("No available GPUs found");
    }

    return availableGpus.map((gpu) => ({
      serverId: gpu.serverId,
      serverName: `gpu-server-${gpu.serverId}`,
      gpuId: gpu.deviceId,
      port: this.getNextPort(),
    }));
  }

  private async allocateSpecificGpus(
    gpuIds: number[],
    tx?: ITask<any>
  ): Promise<GpuAllocation[]> {
    const gpus = await this.gpus.findByIds(gpuIds, tx);

    if (gpus.length !== gpuIds.length) {
      throw new Error("One or more requested GPUs not found");
    }

    return gpus.map((gpu) => ({
      serverId: gpu.serverId,
      serverName: `gpu-server-${gpu.serverId}`,
      gpuId: gpu.deviceId,
      port: this.getNextPort(),
    }));
  }
}
