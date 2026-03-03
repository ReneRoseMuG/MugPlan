import { createHash } from "crypto";
import YAML from "yaml";
import * as helpTextsRepository from "../repositories/helpTextsRepository";
import type { HelpText } from "@shared/schema";

type ImportYamlDecision = "OVERWRITE" | "SKIP";

type ParsedImportItem = {
  helpKey: string;
  title: string;
  body: string;
};

export type HelpTextsImportConflict = {
  helpKey: string;
  existingTitle: string;
  existingBody: string | null;
  importedTitle: string;
  importedBody: string | null;
};

export type HelpTextsImportPreviewResult = {
  fileHash: string;
  summary: {
    totalItems: number;
    createCount: number;
    silentOverwriteCount: number;
    conflictCount: number;
  };
  conflicts: HelpTextsImportConflict[];
};

export type HelpTextsImportApplyResult = helpTextsRepository.HelpTextImportApplyResult;

export class HelpTextImportError extends Error {
  status: number;
  code:
    | "INVALID_IMPORT_FILE"
    | "INVALID_IMPORT_FORMAT"
    | "VALIDATION_ERROR"
    | "FILE_HASH_MISMATCH";

  constructor(
    status: number,
    code:
      | "INVALID_IMPORT_FILE"
      | "INVALID_IMPORT_FORMAT"
      | "VALIDATION_ERROR"
      | "FILE_HASH_MISMATCH",
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ClassifiedItem = {
  item: ParsedImportItem;
  existing: HelpText | null;
  mode: "CREATE" | "OVERWRITE_SILENT" | "CONFLICT_DECISION_REQUIRED";
};

function isBodyEmpty(value: string | null | undefined): boolean {
  if (value == null) return true;
  return value.trim().length === 0;
}

function normalizeBody(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string") {
    throw new HelpTextImportError(422, "VALIDATION_ERROR", "body must be string or null");
  }
  return value;
}

function parseYamlItems(rawBuffer: Buffer): { items: ParsedImportItem[]; fileHash: string } {
  const fileHash = createHash("sha256").update(rawBuffer).digest("hex");
  let parsed: unknown;
  try {
    const source = rawBuffer.toString("utf8").replace(/^\uFEFF/, "");
    parsed = YAML.parse(source);
  } catch {
    throw new HelpTextImportError(422, "INVALID_IMPORT_FORMAT", "Invalid YAML");
  }

  if (!Array.isArray(parsed)) {
    throw new HelpTextImportError(422, "INVALID_IMPORT_FORMAT", "YAML root must be a list");
  }

  const seenKeys = new Set<string>();
  const items: ParsedImportItem[] = [];

  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Item ${index + 1} must be an object`);
    }

    const record = entry as Record<string, unknown>;
    const keys = Object.keys(record);
    const allowedKeys = new Set(["help_key", "title", "body"]);
    const unknownKeys = keys.filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Item ${index + 1} has unknown fields`);
    }

    if (!("help_key" in record) || !("title" in record) || !("body" in record)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Item ${index + 1} must contain help_key, title, body`);
    }

    if (typeof record.help_key !== "string" || record.help_key.trim().length === 0) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Item ${index + 1} has invalid help_key`);
    }
    if (typeof record.title !== "string") {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Item ${index + 1} has invalid title`);
    }

    const helpKey = record.help_key.trim();
    if (seenKeys.has(helpKey)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Duplicate help_key in file: ${helpKey}`);
    }
    seenKeys.add(helpKey);

    items.push({
      helpKey,
      title: record.title,
      body: normalizeBody(record.body),
    });
  });

  return { items, fileHash };
}

async function classifyItems(items: ParsedImportItem[]): Promise<ClassifiedItem[]> {
  const existing = await helpTextsRepository.getHelpTextsByKeys(items.map((item) => item.helpKey));
  const existingByKey = new Map(existing.map((item) => [item.helpKey, item]));

  return items.map((item) => {
    const found = existingByKey.get(item.helpKey) ?? null;
    if (!found) {
      return { item, existing: null, mode: "CREATE" as const };
    }
    if (isBodyEmpty(found.body)) {
      return { item, existing: found, mode: "OVERWRITE_SILENT" as const };
    }
    return { item, existing: found, mode: "CONFLICT_DECISION_REQUIRED" as const };
  });
}

function parseDecisions(raw: unknown): Map<string, ImportYamlDecision> {
  if (!Array.isArray(raw)) {
    throw new HelpTextImportError(422, "VALIDATION_ERROR", "decisions must be an array");
  }

  const decisions = new Map<string, ImportYamlDecision>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", "invalid decision payload");
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.helpKey !== "string" || record.helpKey.trim().length === 0) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", "decision.helpKey is required");
    }
    if (record.decision !== "OVERWRITE" && record.decision !== "SKIP") {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", "decision value must be OVERWRITE or SKIP");
    }
    decisions.set(record.helpKey.trim(), record.decision);
  }

  return decisions;
}

export async function exportHelpTextsAsYaml(): Promise<string> {
  const rows = await helpTextsRepository.getHelpTexts();
  const payload = rows.map((row) => ({
    help_key: row.helpKey,
    title: row.title,
    body: row.body,
  }));
  return YAML.stringify(payload);
}

export async function previewHelpTextsImport(rawBuffer: Buffer): Promise<HelpTextsImportPreviewResult> {
  const { items, fileHash } = parseYamlItems(rawBuffer);
  const classified = await classifyItems(items);

  const conflicts = classified
    .filter((entry) => entry.mode === "CONFLICT_DECISION_REQUIRED")
    .map((entry) => ({
      helpKey: entry.item.helpKey,
      existingTitle: entry.existing?.title ?? "",
      existingBody: entry.existing?.body ?? null,
      importedTitle: entry.item.title,
      importedBody: entry.item.body,
    }));

  return {
    fileHash,
    summary: {
      totalItems: classified.length,
      createCount: classified.filter((entry) => entry.mode === "CREATE").length,
      silentOverwriteCount: classified.filter((entry) => entry.mode === "OVERWRITE_SILENT").length,
      conflictCount: conflicts.length,
    },
    conflicts,
  };
}

export async function applyHelpTextsImport(
  rawBuffer: Buffer,
  fileHash: string,
  rawDecisions: unknown,
): Promise<HelpTextsImportApplyResult> {
  if (!fileHash || typeof fileHash !== "string") {
    throw new HelpTextImportError(422, "VALIDATION_ERROR", "fileHash is required");
  }

  const parsed = parseYamlItems(rawBuffer);
  if (parsed.fileHash !== fileHash) {
    throw new HelpTextImportError(409, "FILE_HASH_MISMATCH", "File hash mismatch");
  }

  const classified = await classifyItems(parsed.items);
  const decisions = parseDecisions(rawDecisions);

  const conflictKeys = classified
    .filter((entry) => entry.mode === "CONFLICT_DECISION_REQUIRED")
    .map((entry) => entry.item.helpKey);

  for (const key of conflictKeys) {
    if (!decisions.has(key)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Missing decision for conflict key: ${key}`);
    }
  }

  for (const key of Array.from(decisions.keys())) {
    if (!conflictKeys.includes(key)) {
      throw new HelpTextImportError(422, "VALIDATION_ERROR", `Decision provided for non-conflict key: ${key}`);
    }
  }

  const instructions: helpTextsRepository.HelpTextImportInstruction[] = classified.map((entry) => {
    if (entry.mode === "CREATE") {
      return {
        kind: "create",
        item: {
          helpKey: entry.item.helpKey,
          title: entry.item.title,
          body: entry.item.body,
        },
      };
    }

    if (entry.mode === "OVERWRITE_SILENT") {
      return {
        kind: "update",
        id: entry.existing!.id,
        overwriteType: "silent",
        item: {
          title: entry.item.title,
          body: entry.item.body,
        },
      };
    }

    return decisions.get(entry.item.helpKey) === "OVERWRITE"
      ? {
          kind: "update",
          id: entry.existing!.id,
          overwriteType: "decision",
          item: {
            title: entry.item.title,
            body: entry.item.body,
          },
        }
      : { kind: "skip" };
  });

  return helpTextsRepository.applyHelpTextImportInstructions(instructions);
}
