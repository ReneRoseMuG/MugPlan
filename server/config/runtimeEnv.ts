import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export type RuntimeMode = "development" | "test" | "production";
export type RuntimeEnvSource = "dev_file" | "test_file" | "process";

export type RuntimeConfig = {
  mode: RuntimeMode;
  envFilePath?: string;
  envSource: RuntimeEnvSource;
  mysqlDatabaseUrl: string;
  allowedDatabases: string[];
  allowedHosts: string[];
  enableProductionDumpImport: boolean;
};

let initialized = false;
let cachedConfig: RuntimeConfig | null = null;

function normalizeMode(raw: string | undefined): RuntimeMode {
  if (raw === "production" || raw === "test") {
    return raw;
  }
  return "development";
}

function parseCsv(raw: string | undefined, opts?: { lowercase?: boolean }): string[] {
  const lowercase = opts?.lowercase === true;
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => (lowercase ? value.toLowerCase() : value));
}

function parseBooleanFlag(raw: string | undefined): boolean {
  const normalized = (raw ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function resolveEnvFile(mode: RuntimeMode): { path: string; source: RuntimeEnvSource } | null {
  if (mode === "production") {
    return null;
  }

  if (mode === "development") {
    return {
      path: path.resolve(process.cwd(), ".env.dev"),
      source: "dev_file",
    };
  }

  return {
    path: path.resolve(process.cwd(), ".env.test"),
    source: "test_file",
  };
}

export function initializeRuntimeEnv(): RuntimeConfig {
  if (initialized && cachedConfig) {
    return cachedConfig;
  }

  const mode = normalizeMode(process.env.NODE_ENV);

  const resolved = resolveEnvFile(mode);
  let envSource: RuntimeEnvSource = "process";
  let envFilePath: string | undefined;

  if (resolved) {
    if (!fs.existsSync(resolved.path)) {
      throw new Error(
        `Missing required env file for mode '${mode}'. cwd='${process.cwd()}', expected='${resolved.path}'`,
      );
    }

    const result = dotenv.config({ path: resolved.path, override: false, quiet: true });
    if (result.error) {
      throw result.error;
    }
    envSource = resolved.source;
    envFilePath = resolved.path;
  }

  const mysqlDatabaseUrl = process.env.MYSQL_DATABASE_URL?.trim() ?? "";
  if (!mysqlDatabaseUrl) {
    throw new Error(`MYSQL_DATABASE_URL must be set for mode '${mode}'.`);
  }

  const modeKey = mode === "development" ? "DEV" : mode === "test" ? "TEST" : "PROD";
  const allowedDatabases = parseCsv(process.env[`DB_ALLOWED_DATABASES_${modeKey}`]);
  if (allowedDatabases.length === 0) {
    throw new Error(`DB_ALLOWED_DATABASES_${modeKey} must be a non-empty CSV list for mode '${mode}'.`);
  }

  const allowedHosts = parseCsv(process.env[`DB_ALLOWED_HOSTS_${modeKey}`], { lowercase: true });
  if (allowedHosts.length === 0) {
    throw new Error(`DB_ALLOWED_HOSTS_${modeKey} must be a non-empty CSV list for mode '${mode}'.`);
  }

  const enableProductionDumpImport = parseBooleanFlag(process.env.ENABLE_PRODUCTION_DUMP_IMPORT);

  cachedConfig = {
    mode,
    envFilePath,
    envSource,
    mysqlDatabaseUrl,
    allowedDatabases,
    allowedHosts,
    enableProductionDumpImport,
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
