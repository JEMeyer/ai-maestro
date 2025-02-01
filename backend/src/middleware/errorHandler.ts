import * as Sentry from "@sentry/node";
import { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Capture error context
  Sentry.withScope((scope) => {
    scope.setTag("type", "express_error");
    scope.setExtra("body", req.body);
    scope.setExtra("params", req.params);
    scope.setExtra("query", req.query);
    Sentry.captureException(err);
  });

  // Log error
  console.error("Error:", err);

  // Send error response
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
