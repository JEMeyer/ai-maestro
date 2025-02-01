import { Database } from "../database";
import { GpuServer } from "../../types";
import { ITask } from "pg-promise";

export class ServerRepository {
  constructor(private db: Database) {}

  async create(
    data: Omit<GpuServer, "id">,
    t?: ITask<any>
  ): Promise<GpuServer> {
    const queryMethod = t ? t.one : this.db.one;
    return await queryMethod(
      `INSERT INTO gpu_servers (name, host, gpu_count)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.host, data.gpuCount],
      this.mapServerRow
    );
  }

  async findById(id: number, t?: ITask<any>): Promise<GpuServer | null> {
    const queryMethod = t ? t.oneOrNone : this.db.oneOrNone;
    return await queryMethod(
      "SELECT * FROM gpu_servers WHERE id = $1",
      [id],
      (row) => (row ? this.mapServerRow(row) : null)
    );
  }

  async findAll(t?: ITask<any>): Promise<GpuServer[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      "SELECT * FROM gpu_servers ORDER BY name",
      [],
      this.mapServerRow
    );
  }

  async update(
    id: number,
    data: Partial<GpuServer>,
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

    if (data.host !== undefined) {
      updates.push(`host = $${paramCount}`);
      values.push(data.host);
      paramCount++;
    }

    if (data.gpuCount !== undefined) {
      updates.push(`gpu_count = $${paramCount}`);
      values.push(data.gpuCount);
      paramCount++;
    }

    if (updates.length === 0) return;

    values.push(id);
    const queryMethod = t ? t.none : this.db.none;

    await queryMethod(
      `UPDATE gpu_servers
       SET ${updates.join(", ")}
       WHERE id = $${paramCount}`,
      values
    );
  }

  async delete(id: number, t?: ITask<any>): Promise<void> {
    const queryMethod = t ? t.none : this.db.none;
    await queryMethod("DELETE FROM gpu_servers WHERE id = $1", [id]);
  }

  private mapServerRow(row: any): GpuServer {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      gpuCount: row.gpu_count,
    };
  }
}
