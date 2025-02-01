export interface Worker {
  id: number;
  deploymentId: number;
  gpuId: number;
  serverName: string;
  containerId: string;
  port: number;
  status: WorkerStatus;
  createdAt: Date;
}

export type WorkerStatus = "creating" | "running" | "failed" | "stopped";

export type WorkerCreate = Omit<Worker, "id" | "createdAt">;
