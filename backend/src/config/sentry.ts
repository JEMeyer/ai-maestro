import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { Application } from "express";

export function initializeSentry(app: Application): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  Sentry.setupExpressErrorHandler(app);
}
