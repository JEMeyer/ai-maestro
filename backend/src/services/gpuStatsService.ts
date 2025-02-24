import Docker from "dockerode";
import { Gpu } from "../types";

/**
 * Get GPU statistics from a single server
 */
async function getGpuStats(server: GpuServer): Promise<GpuStats> {
  // Connect to Docker daemon
  const docker = new Docker({
    host: server.host
  });

  try {
    // Command to get GPU info and process info
    const gpuCommand = "nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total --format=csv,noheader";
    const processCommand = "nvidia-smi --query-compute-apps=gpu_index,pid,name,used_memory --format=csv,noheader";

    // Find a running container to execute in
    const containers = await docker.listContainers();
    if (containers.length === 0) {
      throw new Error(`No running containers found on ${server.name}`);
    }

    // Use the first container
    const container = docker.getContainer(containers[0].Id);

    // Get GPU data
    const gpuData = await executeInContainer(container, gpuCommand);
    const processData = await executeInContainer(container, processCommand);

    // Parse the data
    const gpus = parseGpuData(gpuData);
    const processes = parseProcessData(processData);

    // Assign processes to their respective GPUs
    assignProcessesToGpus(gpus, processes);

    return {
      serverName: server.name,
      gpus
    };
  } catch (error) {
    console.error(`Error getting GPU stats from ${server.name}:`, error);
    return {
      serverName: server.name,
      gpus: []
    };
  }
}

/**
 * Execute a command in a container and return the output
 */
async function executeInContainer(container: Docker.Container, command: string): Promise<string> {
  const exec = await container.exec({
    Cmd: ['sh', '-c', command],
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({});

  return new Promise((resolve, reject) => {
    let output = '';

    stream.on('data', (chunk) => {
      output += chunk.toString();
    });

    stream.on('end', () => {
      resolve(output.trim());
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Parse GPU data from nvidia-smi output
 */
function parseGpuData(data: string): Gpu[] {
  if (!data) return [];

  return data.split('\n').map(line => {
    const [id, utilization, memoryUsed, memoryTotal] = line.split(', ');
    return {
      id: parseInt(id),
      utilization: parseInt(utilization.replace('%', '')),
      memoryUsed: parseInt(memoryUsed.replace('MiB', '')),
      memoryTotal: parseInt(memoryTotal.replace('MiB', '')),
      processes: []
    };
  });
}

/**
 * Parse process data from nvidia-smi output
 */
function parseProcessData(data: string): GpuProcess[] {
  if (!data) return [];

  return data.split('\n').map(line => {
    const [gpuId, pid, name, memoryUsed] = line.split(', ');
    return {
      gpuId: parseInt(gpuId),
      pid: parseInt(pid),
      name: name.trim(),
      memoryUsed: parseInt(memoryUsed.replace('MiB', ''))
    };
  });
}

/**
 * Assign processes to their respective GPUs
 */
function assignProcessesToGpus(gpus: Gpu[], processes: GpuProcess[]): void {
  processes.forEach(process => {
    const gpu = gpus.find(g => g.id === process.gpuId);
    if (gpu) {
      gpu.processes.push({
        pid: process.pid,
        name: process.name,
        memoryUsed: process.memoryUsed
      });
    }
  });
}

/**
 * Get GPU statistics from all servers
 */
async function getAllGpuStats(servers: GpuServer[]): Promise<GpuStats[]> {
  const promises = servers.map(server => getGpuStats(server));
  return Promise.all(promises);
}

/**
 * Get overall GPU utilization across all servers
 */
function getOverallUtilization(stats: GpuStats[]): number {
  let totalUtilization = 0;
  let gpuCount = 0;

  stats.forEach(serverStats => {
    serverStats.gpus.forEach(gpu => {
      totalUtilization += gpu.utilization;
      gpuCount++;
    });
  });

  return gpuCount > 0 ? Math.round(totalUtilization / gpuCount) : 0;
}

// Export the functions
export {
  getGpuStats,
  getAllGpuStats,
  getOverallUtilization
};
