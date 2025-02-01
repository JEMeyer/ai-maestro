import Docker from "dockerode";

export class DockerService {
  private localDocker: Docker;
  private workerServers: Map<string, Docker>;

  constructor() {
    this.localDocker = new Docker();
    this.workerServers = new Map();

    // Initialize connections to GPU servers
    // In production, these would come from environment/config
    const servers = [
      { name: "gpu-server-1", host: "tcp://gpu-server-1:2375" },
      { name: "gpu-server-2", host: "tcp://gpu-server-2:2375" },
    ];

    for (const server of servers) {
      this.workerServers.set(
        server.name,
        new Docker({
          host: server.host,
          // TLS options for production
          // cert: fs.readFileSync('cert.pem'),
          // key: fs.readFileSync('key.pem'),
          // ca: fs.readFileSync('ca.pem')
        })
      );
    }
  }

  async createContainer(
    serverName: string | null,
    config: Docker.ContainerCreateOptions
  ): Promise<{ id: string; name: string }> {
    try {
      const docker = serverName
        ? this.workerServers.get(serverName)
        : this.localDocker;
      if (!docker) {
        throw new Error(`Unknown server: ${serverName}`);
      }

      const container = await docker.createContainer(config);
      await container.start();
      const info = await container.inspect();

      return {
        id: info.Id,
        name: info.Name.replace("/", ""), // Docker adds a leading slash
      };
    } catch (error) {
      console.error(
        `Failed to create container on ${serverName || "local"}:`,
        (error as Error).message
      );
      throw new Error(`Container creation failed: ${(error as Error).message}`);
    }
  }

  async stopContainer(
    serverName: string | null,
    containerName: string
  ): Promise<void> {
    try {
      const docker = serverName
        ? this.workerServers.get(serverName)
        : this.localDocker;
      if (!docker) {
        throw new Error(`Unknown server: ${serverName}`);
      }

      const containers = await docker.listContainers({
        all: true,
        filters: { name: [containerName] },
      });

      for (const containerInfo of containers) {
        const container = docker.getContainer(containerInfo.Id);
        await container.stop();
        await container.remove();
      }
    } catch (error) {
      console.error(
        `Failed to stop container ${containerName}:`,
        (error as Error).message
      );
      throw new Error(`Container stop failed: ${(error as Error).message}`);
    }
  }

  async listContainers(
    serverName: string | null,
    filters: Docker.ContainerListOptions["filters"]
  ): Promise<Docker.ContainerInfo[]> {
    try {
      const docker = serverName
        ? this.workerServers.get(serverName)
        : this.localDocker;
      if (!docker) {
        throw new Error(`Unknown server: ${serverName}`);
      }

      return await docker.listContainers({ filters });
    } catch (error) {
      console.error(
        `Failed to list containers on ${serverName || "local"}:`,
        (error as Error).message
      );
      throw new Error(`Container listing failed: ${(error as Error).message}`);
    }
  }

  async updateContainer(
    serverName: string | null,
    containerName: string,
    options: object
  ): Promise<void> {
    try {
      const docker = serverName
        ? this.workerServers.get(serverName)
        : this.localDocker;
      if (!docker) {
        throw new Error(`Unknown server: ${serverName}`);
      }

      const containers = await docker.listContainers({
        all: true,
        filters: { name: [containerName] },
      });

      if (containers.length === 0) {
        throw new Error(`Container ${containerName} not found`);
      }

      const container = docker.getContainer(containers[0].Id);
      await container.update(options);
    } catch (error) {
      console.error(
        `Failed to update container ${containerName}:`,
        (error as Error).message
      );
      throw new Error(`Container update failed: ${(error as Error).message}`);
    }
  }
}
