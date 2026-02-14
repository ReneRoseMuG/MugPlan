import type { HelpText, InsertHelpText, UpdateHelpText } from "@shared/schema";
import * as helpTextsRepository from "../repositories/helpTextsRepository";

export class HelpTextsError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listHelpTexts(query?: string): Promise<HelpText[]> {
  return helpTextsRepository.getHelpTexts(query);
}

export async function getHelpTextById(id: number): Promise<HelpText | null> {
  return helpTextsRepository.getHelpTextById(id);
}

export async function getHelpTextByKey(helpKey: string): Promise<HelpText | null> {
  return helpTextsRepository.getHelpTextByKey(helpKey);
}

export async function createHelpText(data: InsertHelpText): Promise<{ helpText: HelpText | null; error?: string }> {
  const existing = await helpTextsRepository.getHelpTextByKeyIncludingInactive(data.helpKey);
  if (existing) {
    return { helpText: null, error: "help_key bereits vergeben" };
  }
  const helpText = await helpTextsRepository.createHelpText(data);
  return { helpText };
}

export async function updateHelpText(
  id: number,
  data: UpdateHelpText & { version: number },
): Promise<{ helpText: HelpText | null; error?: string }> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new HelpTextsError(422, "VALIDATION_ERROR");
  }

  const existing = await helpTextsRepository.getHelpTextById(id);
  if (!existing) {
    return { helpText: null, error: "Hilfetext nicht gefunden" };
  }
  if (data.helpKey && data.helpKey !== existing.helpKey) {
    const duplicate = await helpTextsRepository.getHelpTextByKeyIncludingInactive(data.helpKey);
    if (duplicate) {
      return { helpText: null, error: "help_key bereits vergeben" };
    }
  }
  const result = await helpTextsRepository.updateHelpTextWithVersion(id, data.version, data);
  if (result.kind === "version_conflict") {
    const exists = await helpTextsRepository.getHelpTextById(id);
    if (!exists) {
      return { helpText: null, error: "Hilfetext nicht gefunden" };
    }
    throw new HelpTextsError(409, "VERSION_CONFLICT");
  }
  const helpText = result.helpText;
  return { helpText };
}

export async function toggleHelpTextActive(id: number, isActive: boolean, version: number): Promise<HelpText | null> {
  if (!Number.isInteger(version) || version < 1) {
    throw new HelpTextsError(422, "VALIDATION_ERROR");
  }

  const existing = await helpTextsRepository.getHelpTextById(id);
  if (!existing) return null;
  const result = await helpTextsRepository.toggleHelpTextActiveWithVersion(id, version, isActive);
  if (result.kind === "version_conflict") {
    const exists = await helpTextsRepository.getHelpTextById(id);
    if (!exists) return null;
    throw new HelpTextsError(409, "VERSION_CONFLICT");
  }
  return result.helpText;
}

export async function deleteHelpText(id: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new HelpTextsError(422, "VALIDATION_ERROR");
  }
  const result = await helpTextsRepository.deleteHelpTextWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await helpTextsRepository.getHelpTextById(id);
    if (!exists) {
      throw new HelpTextsError(404, "NOT_FOUND");
    }
    throw new HelpTextsError(409, "VERSION_CONFLICT");
  }
}
