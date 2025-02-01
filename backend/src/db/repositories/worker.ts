import { Database } from "../database";
import { Worker, WorkerCreate, WorkerStatus } from "../../types";
import { ITask } from "pg-promise";

export class WorkerRepository {
  constructor(private db: Database) {}

  async createMany(workers: WorkerCreate[], t?: ITask<any>): Promise<Worker[]> {
    const columns = [
      "deployment_id",
      "gpu_id",
      "server_name",
      "container_id",
      "port",
      "status",
    ];
    const cs = new this.db.$config.pgp.helpers.ColumnSet(columns, {
      table: "deployment_workers",
    });

    const workerData = workers.map((w) => ({
      deployment_id: w.deploymentId,
      gpu_id: w.gpuId,
      server_name: w.serverName,
      container_id: w.containerId,
      port: w.port,
      status: w.status,
    }));

    const query =
      this.db.$config.pgp.helpers.insert(workerData, cs) + " RETURNING *";

    const queryMethod = t ? t.map : this.db.map;

    return await queryMethod(query, [], this.mapWorkerRow);
  }

  async findById(id: number, t?: ITask<any>): Promise<Worker | null> {
    const queryMethod = t ? t.oneOrNone : this.db.oneOrNone;

    return await queryMethod(
      "SELECT * FROM deployment_workers WHERE id = $1",
      [id],
      (row) => (row ? this.mapWorkerRow(row) : null)
    );
  }

  async findByDeploymentId(
    deploymentId: number,
    t?: ITask<any>
  ): Promise<Worker[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      "SELECT * FROM deployment_workers WHERE deployment_id = $1",
      [deploymentId],
      this.mapWorkerRow
    );
  }

  async findByStatus(status: WorkerStatus, t?: ITask<any>): Promise<Worker[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      "SELECT * FROM deployment_workers WHERE status = $1",
      [status],
      this.mapWorkerRow
    );
  }

  async getAllActiveWorkerAddresses(t?: ITask<any>): Promise<string[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      `SELECT server_name, port
       FROM deployment_workers
       WHERE status = 'running'`,
      [],
      (row: any) => `${row.server_name}:${row.port}`
    );
  }

  async updateStatus(id: number, status: WorkerStatus): Promise<void> {
    await this.db.none(
      "UPDATE deployment_workers SET status = $1 WHERE id = $2",
      [status, id]
    );
  }

  async deactivateWorkers(workerIds: number[], t?: ITask<any>): Promise<void> {
    const queryMethod = t ? t.none : this.db.none;

    await queryMethod(
      `UPDATE deployment_workers
       SET status = 'stopped'
       WHERE id = ANY($1)`,
      [workerIds]
    );
  }

  async delete(id: number, t?: ITask<any>): Promise<void> {
    const queryMethod = t ? t.none : this.db.none;

    await queryMethod("DELETE FROM deployment_workers WHERE id = $1", [id]);
  }

  private mapWorkerRow(row: any): Worker {
    return {
      id: row.id,
      deploymentId: row.deployment_id,
      gpuId: row.gpu_id,
      serverName: row.server_name,
      containerId: row.container_id,
      port: row.port,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
