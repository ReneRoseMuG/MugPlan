import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

type EnsureOllamaAvailableParams = {
  baseUrl: string;
  model: string;
  allowStart?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 500;
let startupAttempted = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUnique(values: Array<string | undefined | null>) {
  const out: string[] = [];
  for (const value of values) {
    const trimmed = (value || "").trim();
    if (!trimmed) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function buildOllamaBinaryCandidates() {
  const envBin = process.env.DOC_EXTRACT_OLLAMA_BIN;
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    return normalizeUnique([
      envBin,
      path.join(localAppData, "Programs", "Ollama", "ollama.exe"),
      path.join(programFiles, "Ollama", "ollama.exe"),
      path.join(programFilesX86, "Ollama", "ollama.exe"),
    ]);
  }
  return normalizeUnique([
    envBin,
    "/usr/local/bin/ollama",
    "/usr/bin/ollama",
    "/opt/homebrew/bin/ollama",
  ]);
}

function resolveOllamaBinary() {
  const candidates = buildOllamaBinaryCandidates();
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isLocalhostUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    return ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function readTags(baseUrl: string, timeoutMs: number) {
  const url = new URL("/api/tags", baseUrl).toString();
  return fetchJsonWithTimeout<{ models?: Array<{ name?: string }> }>(url, timeoutMs);
}

function startOllamaServe(binaryPath: string) {
  const child = spawn(binaryPath, ["serve"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

async function waitForTags(baseUrl: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await readTags(baseUrl, 2_500);
    } catch {
      await sleep(POLL_INTERVAL_MS);
    }
  }
  throw new Error(`Ollama endpoint not reachable at ${baseUrl} within ${timeoutMs}ms`);
}

export async function ensureOllamaAvailable(params: EnsureOllamaAvailableParams): Promise<void> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const tags = await readTags(params.baseUrl, 2_500);
    const availableModels = new Set((tags.models || []).map((entry) => (entry.name || "").trim()).filter(Boolean));
    if (!availableModels.has(params.model)) {
      throw new Error(`Ollama model not available: ${params.model}`);
    }
    return;
  } catch (error) {
    if (!params.allowStart || !isLocalhostUrl(params.baseUrl) || startupAttempted) {
      throw error;
    }
  }

  startupAttempted = true;
  const binaryPath = resolveOllamaBinary();
  if (!binaryPath) {
    const searched = buildOllamaBinaryCandidates().join(", ");
    throw new Error(
      `Ollama not reachable at ${params.baseUrl} and no local binary found. ` +
        `Install Ollama or set DOC_EXTRACT_OLLAMA_BIN. Searched: ${searched}`,
    );
  }

  startOllamaServe(binaryPath);
  const tags = await waitForTags(params.baseUrl, timeoutMs);
  const availableModels = new Set((tags.models || []).map((entry) => (entry.name || "").trim()).filter(Boolean));
  if (!availableModels.has(params.model)) {
    throw new Error(`Ollama started but model is missing: ${params.model}`);
  }
}
