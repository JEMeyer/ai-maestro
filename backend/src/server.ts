// Import this first!
import "./instrument";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import { initializeSentry } from "./config/sentry";
import { errorHandler } from "./middleware/errorHandler";
import { db } from "./db/database";
import { DeploymentRepository, WorkerRepository, GpuRepository } from "./db";
import { ServerRepository } from "./db/repositories/server";
import {
  MetricsService,
  DeploymentService,
  RouterService,
  DockerService,
} from "./services";

export class Server {
  private app: express.Application;
  private metricsService!: MetricsService;
  private deploymentService!: DeploymentService;
  private routerService!: RouterService;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.initializeServices();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    initializeSentry(this.app);

    this.app.use(cors());
    this.app.use(express.json());

    // Custom error handler
    this.app.use(errorHandler);
  }

  private initializeServices(): void {
    // Initialize repositories
    const deploymentRepo = new DeploymentRepository(db);
    const workerRepo = new WorkerRepository(db);
    const gpuRepo = new GpuRepository(db);
    const serverRepo = new ServerRepository(db);

    // Initialize services
    const dockerService = new DockerService();
    this.routerService = new RouterService(dockerService);
    this.metricsService = new MetricsService(db);

    this.deploymentService = new DeploymentService(
      dockerService,
      this.routerService,
      db,
      deploymentRepo,
      workerRepo,
      gpuRepo
    );
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok" });
    });

    // Prometheus metrics endpoint
    this.app.get("/metrics", async (req: Request, res: Response) => {
      try {
        const metrics = await this.metricsService.getMetrics();
        res.set("Content-Type", "text/plain");
        res.send(metrics);
      } catch (error) {
        res.status(500).json({ error: "Failed to get metrics" });
      }
    });

    // API routes
    this.setupDeploymentRoutes();
  }

  private setupDeploymentRoutes(): void {
    this.app.post(
      "/api/deployments",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const deploymentId = await this.deploymentService.createDeployment(
            req.body
          );
          res.status(201).json({ id: deploymentId });
        } catch (error) {
          next(error);
        }
      }
    );

    // Add more routes as needed
  }

  public async start(): Promise<void> {
    try {
      // Initialize the vLLM router
      await this.routerService.initialize();

      // Start collecting metrics
      await this.metricsService.startMetricsCollection();

      const port = process.env.PORT || 3000;
      this.app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });

      // Graceful shutdown handler
      process.on("SIGTERM", async () => {
        await this.shutdown();
      });

      process.on("SIGINT", async () => {
        await this.shutdown();
      });
    } catch (error) {
      console.error("Failed to start server:", (error as Error).message);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log("Shutting down server...");

    // Flush Sentry events
    await Sentry.close(2000);

    // Stop metrics collection
    this.metricsService.stopMetricsCollection();

    // Close database connection
    await db.$pool.end();

    process.exit(0);
  }
}
