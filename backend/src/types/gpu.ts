export interface Gpu {
    id: number;
    serverId: number;
    deviceId: number;
    type: GpuType;
    vramTotal: number;  // in GB
    maxWorkers: number;
    currentWorkers: number;
  }

  export type GpuType = '3090' | 'P100';
