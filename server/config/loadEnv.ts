import fs from "fs";
import path from "path";
import dotenv from "dotenv";

let envLoaded = false;
let loadedEnvSource: "shared" | "root" | null = null;

function resolveEnvPath(): {
  path: string;
  sourceLabel: string;
  sourceType: "shared" | "root";
} {
  const sharedEnvPath = path.resolve(process.cwd(), "../../shared/.env");
  if (fs.existsSync(sharedEnvPath)) {
    return {
      path: sharedEnvPath,
      sourceLabel: "shared/.env",
      sourceType: "shared",
    };
  }

  return {
    path: path.resolve(process.cwd(), ".env"),
    sourceLabel: "project root .env",
    sourceType: "root",
  };
}

export function loadEnv(): void {
  if (envLoaded) return;

  const selected = resolveEnvPath();
  dotenv.config({ path: selected.path, override: true });
  console.info(`[env] Using ENV from: ${selected.sourceLabel}`);
  loadedEnvSource = selected.sourceType;
  envLoaded = true;
}

export function getLoadedEnvSource(): "shared" | "root" | null {
  return loadedEnvSource;
}
