import crypto from "crypto";
import type { JsonValue } from "./types";

function sortObjectKeys(value: { [key: string]: JsonValue }): { [key: string]: JsonValue } {
  return Object.keys(value)
    .sort()
    .reduce<{ [key: string]: JsonValue }>((acc, key) => {
      acc[key] = sortJsonValue(value[key]);
      return acc;
    }, {});
}

export function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJsonValue(entry));
  }
  if (value && typeof value === "object") {
    return sortObjectKeys(value as { [key: string]: JsonValue });
  }
  return value;
}

export function stableStringifyJson(value: JsonValue): string {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

export function sha256Utf8(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeDatabaseValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number.isSafeInteger(Number(value)) ? Number(value) : String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeDatabaseValue(entry));
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, JsonValue>>((acc, key) => {
        const normalized = normalizeDatabaseValue((value as Record<string, unknown>)[key]);
        if (normalized !== null || (value as Record<string, unknown>)[key] === null) {
          acc[key] = normalized;
        }
        return acc;
      }, {});
  }
  return String(value);
}

export function jsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return stableStringifyJson(left) === stableStringifyJson(right);
}

