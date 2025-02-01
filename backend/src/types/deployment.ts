interface Deployment {
  id: number;
  name: string;
  model_id: string;
  worker_addresses: string[];
  status: "running" | "stopped" | "failed";
}
