import express from "express";
import { createAiRouter } from "./routes/ai.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/", createHealthRouter());
  app.use("/ai", createAiRouter());

  return app;
};

