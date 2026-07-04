import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router, { errorHandler } from "./routes";
import { logger } from "./lib/logger";
import { setupAuth } from "./lib/replitAuth";

const app: Express = express();

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
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await setupAuth(app);

app.use("/api", router);
app.use(errorHandler);

export default app;
