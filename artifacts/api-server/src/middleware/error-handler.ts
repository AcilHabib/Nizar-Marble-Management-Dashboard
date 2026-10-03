import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err }, "Request failed");
  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal server error",
  });
};
