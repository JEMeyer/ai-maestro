import { Registry, Gauge } from "prom-client";
import { Database } from "../db";
import axios from "axios";

interface GpuMetrics {
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
}

interface WorkerMetrics {
  requestsTotal: number;
  requestsInFlight: number;
  latencyP95: number;
  errorRate: number;
}

export class MetricsService {
  private registry: Registry;
  private gpuUtilization: Gauge;
  private gpuMemoryUsed: Gauge;
  private gpuTemperature: Gauge;
  private workerRequestsTotal: Gauge;
  private workerRequestsInFlight: Gauge;
  private workerLatencyP95: Gauge;
  private workerErrorRate: Gauge;

  constructor(private db: Database) {
    this.registry = new Registry();

    // GPU Metrics
    this.gpuUtilization = new Gauge({
      name: "vllm_gpu_utilization",
      help: "GPU utilization percentage",
      labelNames: ["server", "gpu_id", "deployment_id"],
      registers: [this.registry],
    });

    this.gpuMemoryUsed = new Gauge({
      name: "vllm_gpu_memory_used_bytes",
      help: "GPU memory used in bytes",
      labelNames: ["server", "gpu_id", "deployment_id"],
      registers: [this.registry],
    });

    this.gpuTemperature = new Gauge({
      name: "vllm_gpu_temperature_celsius",
      help: "GPU temperature in celsius",
      labelNames: ["server", "gpu_id"],
      registers: [this.registry],
    });

    // Worker Metrics
    this.workerRequestsTotal = new Gauge({
      name: "vllm_worker_requests_total",
      help: "Total number of requests processed",
      labelNames: ["server", "deployment_id", "worker_id"],
      registers: [this.registry],
    });

    this.workerRequestsInFlight = new Gauge({
      name: "vllm_worker_requests_in_flight",
      help: "Number of requests currently being processed",
      labelNames: ["server", "deployment_id", "worker_id"],
      registers: [this.registry],
    });

    this.workerLatencyP95 = new Gauge({
      name: "vllm_worker_latency_p95_seconds",
      help: "95th percentile request latency",
      labelNames: ["server", "deployment_id", "worker_id"],
      registers: [this.registry],
    });

    this.workerErrorRate = new Gauge({
      name: "vllm_worker_error_rate",
      help: "Rate of failed requests",
      labelNames: ["server", "deployment_id", "worker_id"],
      registers: [this.registry],
    });
  }

  async collectMetrics(): Promise<void> {
    await this.db.tx(async (t) => {
      // Get all active workers
      const workers = await t.manyOrNone(`
        SELECT w.*, d.id as deployment_id
        FROM deployment_workers w
        JOIN deployments d ON w.deployment_id = d.id
        WHERE w.status = 'running'
      `);

      // Collect metrics for each worker
      for (const worker of workers) {
        try {
          // GPU Metrics from NVIDIA SMI
          const gpuMetrics = await this.collectGpuMetrics(
            worker.server_name,
            worker.gpu_id
          );
          this.updateGpuMetrics(gpuMetrics, worker);

          // Worker Metrics from vLLM endpoint
          const workerMetrics = await this.collectWorkerMetrics(
            worker.server_name,
            worker.port
          );
          this.updateWorkerMetrics(workerMetrics, worker);
        } catch (error) {
          console.error(
            `Failed to collect metrics for worker ${worker.id}:`,
            (error as Error).message
          );
        }
      }
    });
  }

  private async collectGpuMetrics(
    serverName: string,
    gpuId: number
  ): Promise<GpuMetrics> {
    try {
      // In production, this would call NVIDIA SMI on the remote server
      // For now, we'll simulate the metrics
      return {
        utilization: Math.random() * 100,
        memoryUsed: Math.random() * 24 * 1024 * 1024 * 1024, // Random value up to 24GB
        memoryTotal: 24 * 1024 * 1024 * 1024, // 24GB
        temperature: 30 + Math.random() * 50, // Random temp between 30-80C
      };
    } catch (error) {
      throw new Error(
        `Failed to collect GPU metrics: ${(error as Error).message}`
      );
    }
  }

  private async collectWorkerMetrics(
    serverName: string,
    port: number
  ): Promise<WorkerMetrics> {
    try {
      // In production, this would call the vLLM worker's metrics endpoint
      const response = await axios.get(`http://${serverName}:${port}/metrics`);

      // Parse and return metrics
      return {
        requestsTotal: response.data.requests_total || 0,
        requestsInFlight: response.data.requests_in_flight || 0,
        latencyP95: response.data.latency_p95 || 0,
        errorRate: response.data.error_rate || 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to collect worker metrics: ${(error as Error).message}`
      );
    }
  }

  private updateGpuMetrics(metrics: GpuMetrics, worker: any): void {
    this.gpuUtilization
      .labels(
        worker.server_name,
        String(worker.gpu_id),
        String(worker.deployment_id)
      )
      .set(metrics.utilization);

    this.gpuMemoryUsed
      .labels(
        worker.server_name,
        String(worker.gpu_id),
        String(worker.deployment_id)
      )
      .set(metrics.memoryUsed);

    this.gpuTemperature
      .labels(worker.server_name, String(worker.gpu_id))
      .set(metrics.temperature);
  }

  private updateWorkerMetrics(metrics: WorkerMetrics, worker: any): void {
    const labels = {
      server: worker.server_name,
      deployment_id: String(worker.deployment_id),
      worker_id: String(worker.id),
    };

    this.workerRequestsTotal.labels(labels).set(metrics.requestsTotal);
    this.workerRequestsInFlight.labels(labels).set(metrics.requestsInFlight);
    this.workerLatencyP95.labels(labels).set(metrics.latencyP95);
    this.workerErrorRate.labels(labels).set(metrics.errorRate);
  }

  // Method to get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  // Method to reset all metrics
  async resetMetrics(): Promise<void> {
    this.registry.resetMetrics();
  }

  // Method to get specific deployment metrics
  async getDeploymentMetrics(deploymentId: number): Promise<{
    gpuMetrics: GpuMetrics[];
    workerMetrics: WorkerMetrics[];
  }> {
    const workers = await this.db.manyOrNone(
      `
      SELECT * FROM deployment_workers
      WHERE deployment_id = $1 AND status = 'running'
    `,
      [deploymentId]
    );

    const gpuMetrics: GpuMetrics[] = [];
    const workerMetrics: WorkerMetrics[] = [];

    for (const worker of workers) {
      try {
        const gpu = await this.collectGpuMetrics(
          worker.server_name,
          worker.gpu_id
        );
        gpuMetrics.push(gpu);

        const workerStats = await this.collectWorkerMetrics(
          worker.server_name,
          worker.port
        );
        workerMetrics.push(workerStats);
      } catch (error) {
        console.error(
          `Failed to collect metrics for worker ${worker.id} in deployment ${deploymentId}:`,
          (error as Error).message
        );
      }
    }

    return { gpuMetrics, workerMetrics };
  }

  // Method to get server-wide GPU metrics
  async getServerGpuMetrics(serverName: string): Promise<
    {
      gpuId: number;
      metrics: GpuMetrics;
    }[]
  > {
    const gpus = await this.db.manyOrNone(
      `
      SELECT DISTINCT gpu_id
      FROM deployment_workers
      WHERE server_name = $1 AND status = 'running'
      ORDER BY gpu_id
    `,
      [serverName]
    );

    const results = [];
    for (const gpu of gpus) {
      try {
        const metrics = await this.collectGpuMetrics(serverName, gpu.gpu_id);
        results.push({
          gpuId: gpu.gpu_id,
          metrics,
        });
      } catch (error) {
        console.error(
          `Failed to collect GPU metrics for server ${serverName}, GPU ${gpu.gpu_id}:`,
          (error as Error).message
        );
      }
    }

    return results;
  }

  // Start collecting metrics at regular intervals
  async startMetricsCollection(intervalMs: number = 15000): Promise<void> {
    const collect = async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error("Failed to collect metrics:", (error as Error).message);
      }
    };

    // Initial collection
    await collect();

    // Set up regular collection
    setInterval(collect, intervalMs);
  }

  // Stop metrics collection
  stopMetricsCollection(): void {
    this.registry.clear();
  }

  // Get current metric values for a specific GPU
  async getGpuMetricValues(
    serverName: string,
    gpuId: number
  ): Promise<GpuMetrics> {
    return await this.collectGpuMetrics(serverName, gpuId);
  }

  // Get current metric values for a specific worker
  async getWorkerMetricValues(
    serverName: string,
    port: number
  ): Promise<WorkerMetrics> {
    return await this.collectWorkerMetrics(serverName, port);
  }
}
