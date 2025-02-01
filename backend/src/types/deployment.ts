export interface Deployment {
  id: number;
  name: string;
  modelId: string;
  status: DeploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type DeploymentStatus =
  | "creating"
  | "running"
  | "failed"
  | "stopped"
  | "deleted";

export type DeploymentCreate = Omit<
  Deployment,
  "id" | "createdAt" | "updatedAt"
>;
