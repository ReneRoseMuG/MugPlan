import type { HelpText, InsertHelpText, UpdateHelpText } from "@shared/schema";
import * as helpTextsRepository from "../repositories/helpTextsRepository";

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
  data: UpdateHelpText,
): Promise<{ helpText: HelpText | null; error?: string }> {
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
  const helpText = await helpTextsRepository.updateHelpText(id, data);
  return { helpText };
}

export async function toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null> {
  const existing = await helpTextsRepository.getHelpTextById(id);
  if (!existing) return null;
  return helpTextsRepository.toggleHelpTextActive(id, isActive);
}

export async function deleteHelpText(id: number): Promise<void> {
  await helpTextsRepository.deleteHelpText(id);
}
