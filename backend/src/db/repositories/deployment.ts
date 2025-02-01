import { Database } from "../database";
import { Deployment, DeploymentCreate, DeploymentStatus } from "../../types";
import { ITask } from "pg-promise";

export class DeploymentRepository {
  constructor(private db: Database) {}

  async create(data: DeploymentCreate, t?: ITask<any>): Promise<Deployment> {
    const queryMethod = t ? t.one : this.db.one;

    return await queryMethod(
      `INSERT INTO deployments (name, model_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.modelId, data.status],
      this.mapDeploymentRow
    );
  }

  async findById(id: number, t?: ITask<any>): Promise<Deployment | null> {
    const queryMethod = t ? t.oneOrNone : this.db.oneOrNone;
    return await queryMethod(
      "SELECT * FROM deployments WHERE id = $1",
      [id],
      (row) => (row ? this.mapDeploymentRow(row) : null)
    );
  }

  async findAll(t?: ITask<any>): Promise<Deployment[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      "SELECT * FROM deployments ORDER BY created_at DESC",
      [],
      this.mapDeploymentRow
    );
  }

  async findByStatus(
    status: DeploymentStatus,
    t?: ITask<any>
  ): Promise<Deployment[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      "SELECT * FROM deployments WHERE status = $1 ORDER BY created_at DESC",
      [status],
      this.mapDeploymentRow
    );
  }

  async update(
    id: number,
    data: Partial<Deployment>,
    t?: ITask<any>
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    if (data.modelId !== undefined) {
      updates.push(`model_id = $${paramCount}`);
      values.push(data.modelId);
      paramCount++;
    }

    if (updates.length === 0) return;

    values.push(id);

    const queryMethod = t ? t.none : this.db.none;

    await queryMethod(
      `UPDATE deployments
       SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}`,
      values
    );
  }

  async delete(id: number, t?: ITask<any>): Promise<void> {
    const queryMethod = t ? t.none : this.db.none;
    await queryMethod("DELETE FROM deployments WHERE id = $1", [id]);
  }

  private mapDeploymentRow(row: any): Deployment {
    return {
      id: row.id,
      name: row.name,
      modelId: row.model_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
