import fs from "fs";
import path from "path";

type LogLevel = "OFF" | "ERROR" | "WARN" | "INFO" | "DEBUG";
type HttpLogMode = "off" | "errors" | "brief";
type AuthLogEvent = "login_success" | "login_failed" | "logout" | "2fa_success" | "2fa_failed" | "quick_login";

const levelPriority: Record<LogLevel, number> = {
  OFF: -1,
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

function parseBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function readLogLevel(): LogLevel {
  const candidate = (process.env.LOG_LEVEL ?? "INFO").trim().toUpperCase();
  if (candidate === "OFF" || candidate === "ERROR" || candidate === "WARN" || candidate === "INFO" || candidate === "DEBUG") {
    return candidate;
  }
  return "INFO";
}

function readHttpLogMode(): HttpLogMode {
  const candidate = (process.env.LOG_HTTP_MODE ?? "errors").trim().toLowerCase();
  if (candidate === "off" || candidate === "errors" || candidate === "brief") {
    return candidate;
  }
  return "errors";
}

function readHttpSlowMs(): number {
  const parsed = Number.parseInt(process.env.LOG_HTTP_SLOW_MS ?? "1000", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 1000;
  }
  return parsed;
}

function isSecretKey(key: string): boolean {
  return /pass(word)?|token|secret|api[-_]?key|private[-_]?key|authorization|cookie|mysql_database_url/i.test(key);
}

function sanitizeString(value: string): string {
  if (value.length === 0) return value;
  if (/^mysql:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      return parsed.toString();
    } catch {
      return "[REDACTED_CONNECTION_URL]";
    }
  }
  return value;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack,
    };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSecretKey(key) ? "[REDACTED]" : sanitizeValue(nested);
    }
    return out;
  }
  return String(value);
}

function shouldLog(level: LogLevel): boolean {
  const configured = readLogLevel();
  return levelPriority[level] <= levelPriority[configured];
}

function writeToConsole(level: LogLevel, line: string): void {
  try {
    if (level === "ERROR") {
      console.error(line);
      return;
    }
    if (level === "WARN") {
      console.warn(line);
      return;
    }
    if (level === "DEBUG") {
      console.debug(line);
      return;
    }
    console.info(line);
  } catch {
    // Keep process alive if stdio is broken (for example EPIPE).
  }
}

function getLogDirPath(): string {
  const logDir = (process.env.LOG_DIR ?? "./app-logs").trim() || "./app-logs";
  return path.resolve(process.cwd(), logDir);
}

function ensureLogDirExists(logDirPath: string): void {
  try {
    fs.mkdirSync(logDirPath, { recursive: true });
  } catch {
    // Logging must never throw.
  }
}

function appendLineToFile(filePath: string, line: string): void {
  fs.appendFile(filePath, `${line}\n`, () => {
    // Logging must never throw.
  });
}

function appendToNamedLogFile(fileName: string, line: string): void {
  const logDirPath = getLogDirPath();
  ensureLogDirExists(logDirPath);
  appendLineToFile(path.join(logDirPath, fileName), line);
}

function getDailyLogFileName(timestamp: string): string {
  return `${timestamp.slice(0, 10)}.log`;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeValue(meta) : undefined;
  const payload = sanitizedMeta ? ` ${JSON.stringify(sanitizedMeta)}` : "";
  const line = `${timestamp} [${level}] ${message}${payload}`;
  writeToConsole(level, line);
  appendToNamedLogFile(getDailyLogFileName(timestamp), line);
  if (level === "ERROR") {
    appendToNamedLogFile("error.log", line);
  }
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  emit("ERROR", message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  emit("WARN", message, meta);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  emit("INFO", message, meta);
}

export function logDebug(message: string, meta?: Record<string, unknown>): void {
  emit("DEBUG", message, meta);
}

export function logAuth(event: AuthLogEvent, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeValue(meta) : undefined;
  const payload = sanitizedMeta ? ` ${JSON.stringify(sanitizedMeta)}` : "";
  const message = `[auth] ${event}`;
  const line = `${timestamp} [INFO] ${message}${payload}`;

  emit("INFO", message, meta);
  appendToNamedLogFile("auth.log", line);
}

export function isSqlLoggingEnabled(): boolean {
  return parseBoolean(process.env.LOG_SQL, false);
}

export function logSql(message: string, meta?: Record<string, unknown>): void {
  if (!isSqlLoggingEnabled()) return;
  emit("DEBUG", `[sql] ${message}`, meta);
}

export function getHttpLogMode(): HttpLogMode {
  return readHttpLogMode();
}

export function getHttpSlowMs(): number {
  return readHttpSlowMs();
}

export function shouldLogHttpRequest(status: number, durationMs: number): boolean {
  const mode = readHttpLogMode();
  if (mode === "off") return false;
  if (mode === "brief") return true;
  if (status >= 400) return true;
  return durationMs >= readHttpSlowMs();
}

export function getEffectiveLogLevel(): LogLevel {
  return readLogLevel();
}
