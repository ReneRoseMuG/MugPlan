import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorHandler } from "./middleware/errorHandler";
import { assertConfiguredSystemUser } from "./bootstrap/assertConfiguredSystemUser";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

type LogLevel = "log" | "info" | "warn" | "error";

function logLine(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `${timestamp} [${level}] ${message}${payload}`;
  const logger = console[level] ?? console.log;
  logger(line);

  const logPath = path.resolve(process.cwd(), "server.log");
  fs.appendFile(logPath, `${line}\n`, (err) => {
    if (err) {
      console.warn(`${timestamp} [warn] failed to write log file`, {
        message: err.message,
      });
    }
  });
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  logLine("log", `${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

void (async () => {
  await assertConfiguredSystemUser();
  await registerRoutes(httpServer, app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const envPort = process.env.PORT;
  const port = parseInt(envPort || "5000", 10);
  const envPath = path.resolve(process.cwd(), ".env");
  const envExists = fs.existsSync(envPath);

  // Windows/local-dev: do NOT bind to 0.0.0.0 (can lead to ENOTSUP)
  // Production/deploy: 0.0.0.0 is fine.
  const host =
    process.env.HOST ??
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

  logLine("info", "startup", {
    nodeEnv: process.env.NODE_ENV ?? "undefined",
    nodeVersion: process.version,
    envExists,
    port: envPort ?? "undefined",
  });

  process.on("uncaughtException", (err) => {
    logLine("error", "uncaughtException", {
      message: err.message,
      stack: err.stack,
    });
  });

  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : undefined;
    logLine("error", "unhandledRejection", {
      message: error?.message ?? String(reason),
      stack: error?.stack,
    });
  });

  httpServer.listen(
    {
      port,
      host,
    },
    () => {
      logLine("info", "listening", { host, port });
      log(`serving on http://${host}:${port}`);
    },
  );
})();
