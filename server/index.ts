import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { errorHandler } from "./middleware/errorHandler";
import { getRuntimeConfig, initializeRuntimeEnv } from "./config/runtimeEnv";
import { parseDatabaseLogInfo } from "./security/dbSafetyGuards";
import {
  getEffectiveLogLevel,
  getHttpLogMode,
  getHttpSlowMs,
  isSqlLoggingEnabled,
  logError,
  logInfo,
  shouldLogHttpRequest,
} from "./lib/logger";

const runtimeConfig = initializeRuntimeEnv();
const dbLogInfo = parseDatabaseLogInfo(runtimeConfig.mysqlDatabaseUrl);

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

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api") && shouldLogHttpRequest(res.statusCode, duration)) {
      logInfo("http_request", {
        method: req.method,
        path: requestPath,
        status: res.statusCode,
        durationMs: duration,
      });
    }
  });

  next();
});

let shutdownLogged = false;

function logShutdown(signal: "SIGINT" | "SIGTERM") {
  if (shutdownLogged) return;
  shutdownLogged = true;
  logInfo("app_stop", { signal });
}

process.on("SIGINT", () => {
  logShutdown("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logShutdown("SIGTERM");
  process.exit(0);
});

void (async () => {
  try {
    const [{ ensureSystemRoles }, { getBootstrapState }, { registerRoutes }, { startBackupScheduler }, { initStoragePathsFromEnv }] = await Promise.all([
      import("./bootstrap/ensureSystemRoles"),
      import("./bootstrap/getBootstrapState"),
      import("./routes"),
      import("./services/backupScheduler"),
      import("./config/storagePaths"),
    ]);

    await ensureSystemRoles();
    await initStoragePathsFromEnv();
    const bootstrapState = await getBootstrapState();
    await registerRoutes(httpServer, app);
    startBackupScheduler();

    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      const { serveStatic } = await import("./static");
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const runtime = getRuntimeConfig();
    const envPort = process.env.PORT;
    const port = parseInt(envPort || "5000", 10);
    const envPath = path.resolve(process.cwd(), ".env");
    const envExists = fs.existsSync(envPath);

    // Windows/local-dev: do NOT bind to 0.0.0.0 (can lead to ENOTSUP)
    // Production/deploy: 0.0.0.0 is fine.
    const host =
      process.env.HOST ??
      (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

    logInfo("startup_summary", {
      startup: "success",
      mode: runtime.mode,
      envSource: runtime.envSource,
      host,
      port,
      dbName: dbLogInfo.dbName,
      dbHost: dbLogInfo.host,
      sqlLogging: isSqlLoggingEnabled(),
      httpLogMode: getHttpLogMode(),
      httpSlowMs: getHttpSlowMs(),
      logLevel: getEffectiveLogLevel(),
      needsAdminSetup: bootstrapState.needsAdminSetup,
      nodeVersion: process.version,
      envExists,
    });

    process.on("uncaughtException", (err) => {
      logError("uncaughtException", {
        message: err.message,
        stack: err.stack,
      });
    });

    process.on("unhandledRejection", (reason) => {
      const error = reason instanceof Error ? reason : undefined;
      logError("unhandledRejection", {
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
        logInfo("app_start", { host, port });
      },
    );
  } catch (error) {
    logError("startup_failed", {
      message: error instanceof Error ? error.message : String(error),
      mode: runtimeConfig.mode,
      envSource: runtimeConfig.envSource,
      dbName: dbLogInfo.dbName,
      dbHost: dbLogInfo.host,
      sqlLogging: isSqlLoggingEnabled(),
    });
    process.exit(1);
  }
})();
