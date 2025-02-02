import { DockerService } from "./dockerService";

export class RouterService {
  private static readonly ROUTER_NAME = "vllm-router";
  private static readonly ROUTER_PORT = 8000;

  constructor(private dockerService: DockerService) {}

  async initialize(): Promise<void> {
    const routerConfig = {
      Image: "vllm/vllm-openai",
      Env: [
        "ROUTER_ONLY=True",
        "WORKER_ADDRESSES=", // Initially empty
      ],
      ExposedPorts: {
        [`${RouterService.ROUTER_PORT}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${RouterService.ROUTER_PORT}/tcp`]: [
            { HostPort: String(RouterService.ROUTER_PORT) },
          ],
        },
      },
      name: RouterService.ROUTER_NAME,
    };

    try {
      await this.dockerService.stopContainer(null, RouterService.ROUTER_NAME);
      await this.dockerService.createContainer(null, routerConfig);
    } catch (error) {
      console.error("Failed to initialize router:", (error as Error).message);
      throw new Error(
        `Router initialization failed: ${(error as Error).message}`
      );
    }
  }

  async updateWorkers(workerAddresses: string[]): Promise<void> {
    try {
      await this.dockerService.updateContainer(
        null,
        RouterService.ROUTER_NAME,
        {
          Env: [
            "ROUTER_ONLY=True",
            `WORKER_ADDRESSES=${workerAddresses.join(",")}`,
          ],
        }
      );
    } catch (error) {
      console.error(
        "Failed to update router workers:",
        (error as Error).message
      );
      throw new Error(`Router update failed: ${(error as Error).message}`);
    }
  }
}
