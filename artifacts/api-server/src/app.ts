import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import authRouter from "./routes/auth";
import { requireAuth } from "./lib/auth";
import { errorHandler } from "./middleware/error-handler";
import { staffActorMiddleware } from "./middleware/staff-actor";
import { logger } from "./lib/logger";

const app: Express = express();

if (!process.env.VERCEL) {
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
}
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(staffActorMiddleware);

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api", router);
app.use(errorHandler);

export default app;
