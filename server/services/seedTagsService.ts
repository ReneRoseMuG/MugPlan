import {
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  isProtectedSystemTagName,
} from "@shared/appointmentCancellation";
import * as masterDataRepository from "../repositories/masterDataRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const FILE_NAME = "tags.csv";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getTagsSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

async function ensureManagedSystemTags(): Promise<void> {
  await masterDataRepository.ensureTagDefinition({
    name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
    color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
    isDefault: true,
  });
  await masterDataRepository.ensureTagDefinition({
    name: MANAGED_REPORT_EXCLUSION_TAG_NAME,
    color: MANAGED_REPORT_EXCLUSION_TAG_COLOR,
    isDefault: true,
  });
}

export async function exportTagsSeed(): Promise<SeedExecutionResult> {
  await ensureManagedSystemTags();
  const tags = (await masterDataRepository.listTags()).filter((tag) => !tag.isDefault);
  if (tags.length === 0) {
    return {
      sourceFile: FILE_NAME,
      exists: false,
      logLines: [`Kein Export geschrieben: ${FILE_NAME} (keine Tags vorhanden)`],
    };
  }
  const content = stringifyCsv(
    ["Name", "Farbe"],
    tags.map((tag) => [tag.name, tag.color]),
  );
  await writeSeedFileUtf8(FILE_NAME, content);
  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [`Export geschrieben: ${FILE_NAME}`, `Tags exportiert: ${tags.length}`],
  };
}

export async function applyTagsSeed(): Promise<SeedExecutionResult> {
  const status = await getTagsSeedStatus();
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const parsed = parseCsvWithHeaders(await readSeedFileUtf8(FILE_NAME));
  const existingTags = await masterDataRepository.listTags();
  const tagsByName = new Map(existingTags.map((entry) => [entry.name.trim().toLocaleLowerCase("de"), entry]));
  const logLines: string[] = [];

  for (const row of parsed.rows) {
    const name = (row.Name ?? "").trim();
    const color = (row.Farbe ?? "").trim() || "#2563eb";
    if (!name) {
      logLines.push("Tag uebersprungen: Name fehlt");
      continue;
    }
    if (isProtectedSystemTagName(name)) {
      logLines.push(`System-Tag uebersprungen: ${name}`);
      continue;
    }

    const existing = tagsByName.get(name.toLocaleLowerCase("de"));
    if (!existing) {
      const created = await masterDataRepository.createTag({ name, color });
      tagsByName.set(name.toLocaleLowerCase("de"), created);
      logLines.push(`Tag angelegt: ${name}`);
      continue;
    }

    const result = await masterDataRepository.updateTagWithVersion(existing.id, existing.version, { color });
    if (result.kind === "updated") {
      tagsByName.set(name.toLocaleLowerCase("de"), result.row);
    }
    logLines.push(`Tag aktualisiert: ${name}`);
  }

  await ensureManagedSystemTags();
  return { sourceFile: FILE_NAME, exists: true, logLines };
}
