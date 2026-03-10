import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";

import { errorHandler } from "../../server/middleware/errorHandler";
import { registerRoutes } from "../../server/routes";

export async function createApiTestApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
  return app;
}

export async function loginAgent(
  app: express.Express,
  credentials: { username: string; password: string },
): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(credentials).expect(200);
  return agent;
}

export async function loginAdminAgent(app: express.Express): Promise<SuperAgentTest> {
  return loginAgent(app, {
    username: "test-admin",
    password: "test-admin-password",
  });
}
