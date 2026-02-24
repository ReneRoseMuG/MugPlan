import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export type RuntimeMode = "development" | "test" | "production";
export type RuntimeEnvSource = "shared" | "root" | "test" | "process";

type RuntimeConfig = {
  mode: RuntimeMode;
  envSource: RuntimeEnvSource;
  mysqlDatabaseUrl: string;
};

let initialized = false;
let cachedConfig: RuntimeConfig | null = null;

function normalizeMode(raw: string | undefined): RuntimeMode {
  if (raw === "production" || raw === "test") {
    return raw;
  }
  return "development";
}

function resolveEnvFile(mode: RuntimeMode): { path: string; source: RuntimeEnvSource } | null {
  if (mode === "production") {
    return null;
  }

  if (mode === "test") {
    return {
      path: path.resolve(process.cwd(), ".env.test"),
      source: "test",
    };
  }

  const sharedEnvPath = path.resolve(process.cwd(), "../../shared/.env");
  if (fs.existsSync(sharedEnvPath)) {
    return {
      path: sharedEnvPath,
      source: "shared",
    };
  }

  return {
    path: path.resolve(process.cwd(), ".env"),
    source: "root",
  };
}

export function initializeRuntimeEnv(): RuntimeConfig {
  if (initialized && cachedConfig) {
    return cachedConfig;
  }

  const mode = normalizeMode(process.env.NODE_ENV);
  process.env.NODE_ENV = mode;

  const resolved = resolveEnvFile(mode);
  let envSource: RuntimeEnvSource = "process";

  if (resolved) {
    if (!fs.existsSync(resolved.path)) {
      throw new Error(`Required environment file is missing: ${resolved.path}`);
    }

    const result = dotenv.config({ path: resolved.path, override: false, quiet: true });
    if (result.error) {
      throw result.error;
    }
    envSource = resolved.source;
  }

  const mysqlDatabaseUrl = process.env.MYSQL_DATABASE_URL?.trim() ?? "";
  if (!mysqlDatabaseUrl) {
    throw new Error("MYSQL_DATABASE_URL must be set.");
  }

  cachedConfig = {
    mode,
    envSource,
    mysqlDatabaseUrl,
  };
  initialized = true;
  return cachedConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!cachedConfig) {
    return initializeRuntimeEnv();
  }
  return cachedConfig;
}

export function getRuntimeMode(): RuntimeMode {
  return getRuntimeConfig().mode;
}

export function getLoadedEnvSource(): RuntimeEnvSource {
  return getRuntimeConfig().envSource;
}
