// repositories/gpu-repository.ts
import { ITask } from "pg-promise";
import { Gpu, GpuType } from "../../types";
import { Database } from "../database";

interface GpuFilter {
  gpuType?: GpuType;
  maxWorkersPerGpu?: number;
  minGpus?: number;
}

export class GpuRepository {
  constructor(private db: Database) {}

  async findById(id: number, t?: ITask<any>): Promise<Gpu | null> {
    const queryMethod = t ? t.oneOrNone : this.db.oneOrNone;

    return await queryMethod(
      `SELECT g.*, COUNT(w.id) as current_workers
       FROM gpus g
       LEFT JOIN deployment_workers w ON w.gpu_id = g.id AND w.status = 'running'
       WHERE g.id = $1
       GROUP BY g.id`,
      [id],
      (row) => (row ? this.mapGpuRow(row) : null)
    );
  }

  async findByIds(ids: number[], t?: ITask<any>): Promise<Gpu[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      `SELECT g.*, COUNT(w.id) as current_workers
       FROM gpus g
       LEFT JOIN deployment_workers w ON w.gpu_id = g.id AND w.status = 'running'
       WHERE g.id = ANY($1)
       GROUP BY g.id`,
      [ids],
      this.mapGpuRow
    );
  }

  async findAvailableGpus(filter: GpuFilter, t?: ITask<any>): Promise<Gpu[]> {
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filter.gpuType) {
      whereClauses.push(`g.type = $${paramCount}`);
      params.push(filter.gpuType);
      paramCount++;
    }

    const whereClause =
      whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const query = `
      SELECT g.*, COUNT(w.id) as current_workers
      FROM gpus g
      LEFT JOIN deployment_workers w ON w.gpu_id = g.id AND w.status = 'running'
      ${whereClause}
      GROUP BY g.id
      HAVING COUNT(w.id) < g.max_workers
      ORDER BY COUNT(w.id) ASC
      ${filter.minGpus ? `LIMIT $${paramCount}` : ""}
    `;

    if (filter.minGpus) {
      params.push(filter.minGpus);
    }

    const queryMethod = t ? t.map : this.db.map;

    return await queryMethod(query, params, this.mapGpuRow);
  }

  async findByServerId(serverId: number, t?: ITask<any>): Promise<Gpu[]> {
    const queryMethod = t ? t.map : this.db.map;
    return await queryMethod(
      `SELECT g.*, COUNT(w.id) as current_workers
       FROM gpus g
       LEFT JOIN deployment_workers w ON w.gpu_id = g.id AND w.status = 'running'
       WHERE g.server_id = $1
       GROUP BY g.id`,
      [serverId],
      this.mapGpuRow
    );
  }

  async create(
    data: Omit<Gpu, "id" | "currentWorkers">,
    t?: ITask<any>
  ): Promise<Gpu> {
    const queryMethod = t ? t.one : this.db.one;
    return await queryMethod(
      `INSERT INTO gpus (server_id, device_id, type, vram_total, max_workers)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *, 0 as current_workers`,
      [
        data.serverId,
        data.deviceId,
        data.type,
        data.vramTotal,
        data.maxWorkers,
      ],
      this.mapGpuRow
    );
  }

  async update(id: number, data: Partial<Gpu>, t?: ITask<any>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.maxWorkers !== undefined) {
      updates.push(`max_workers = $${paramCount}`);
      values.push(data.maxWorkers);
      paramCount++;
    }

    if (data.type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(data.type);
      paramCount++;
    }

    if (data.vramTotal !== undefined) {
      updates.push(`vram_total = $${paramCount}`);
      values.push(data.vramTotal);
      paramCount++;
    }

    if (updates.length === 0) return;

    values.push(id);
    const queryMethod = t ? t.none : this.db.none;
    await queryMethod(
      `UPDATE gpus
       SET ${updates.join(", ")}
       WHERE id = $${paramCount}`,
      values
    );
  }

  async delete(id: number, t?: ITask<any>): Promise<void> {
    const queryMethod = t ? t.none : this.db.none;
    await queryMethod("DELETE FROM gpus WHERE id = $1", [id]);
  }

  private mapGpuRow(row: any): Gpu {
    return {
      id: row.id,
      serverId: row.server_id,
      deviceId: row.device_id,
      type: row.type,
      vramTotal: row.vram_total,
      maxWorkers: row.max_workers,
      currentWorkers: parseInt(row.current_workers || "0"),
    };
  }
}
