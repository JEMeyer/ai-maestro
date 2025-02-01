interface DeploymentResponse {
  id: number;
  name: string;
  status: string;
  metrics: {
    gpu_utilization: number;
    memory_used: number;
  }[];
}
