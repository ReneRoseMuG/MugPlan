import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { hasCsvHeader, parseBooleanFlag, parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const FILE_NAME = "notetemplates.csv";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getNoteTemplatesSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function exportNoteTemplatesSeed(): Promise<SeedExecutionResult> {
  const templates = await noteTemplatesRepository.getNoteTemplates(false);
  const content = stringifyCsv(
    ["Titel", "Inhalt", "Farbe", "Drucken", "Sortierreihenfolge", "Status"],
    templates.map((template) => [
      template.title,
      template.body,
      template.cardColor ?? "",
      template.print ? "true" : "false",
      String(template.sortOrder),
      template.isActive ? "true" : "false",
    ]),
  );
  await writeSeedFileUtf8(FILE_NAME, content);
  return { sourceFile: FILE_NAME, exists: true, logLines: [`Export geschrieben: ${FILE_NAME}`, `Notiz Vorlagen exportiert: ${templates.length}`] };
}

export async function applyNoteTemplatesSeed(): Promise<SeedExecutionResult> {
  const status = await getSeedFileStatus(FILE_NAME);
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const parsed = parseCsvWithHeaders(await readSeedFileUtf8(FILE_NAME));
  const hasStatusHeader = hasCsvHeader(parsed.headers, "Status");
  const rows = parsed.rows;
  const existingTemplates = await noteTemplatesRepository.getNoteTemplates(false);
  const templatesByTitle = new Map(existingTemplates.map((entry) => [entry.title.trim().toLocaleLowerCase("de"), entry]));
  const logLines: string[] = [];

  for (const row of rows) {
    const title = (row.Titel ?? "").trim();
    if (!title) {
      logLines.push("Notiz Vorlage uebersprungen: Titel fehlt");
      continue;
    }
    const body = row.Inhalt ?? "";
    const cardColor = (row.Farbe ?? "").trim() || null;
    const sortOrder = Number.parseInt((row.Sortierreihenfolge ?? "0").trim(), 10);
    const existing = templatesByTitle.get(title.toLocaleLowerCase("de"));
    const print = parseBooleanFlag(row.Drucken ?? "", existing?.print ?? true);
    const isActive = hasStatusHeader
      ? parseBooleanFlag(row.Status ?? "", existing?.isActive ?? true)
      : true;

    if (!existing) {
      await noteTemplatesRepository.createNoteTemplate({
        title,
        body,
        cardColor,
        print,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive,
        version: 1,
      });
      logLines.push(`Notiz Vorlage angelegt: ${title}`);
      continue;
    }

    await noteTemplatesRepository.updateNoteTemplateWithVersion(existing.id, existing.version, {
      body,
      cardColor,
      print,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : existing.sortOrder,
      isActive,
    });
    logLines.push(`Notiz Vorlage aktualisiert: ${title}`);
  }

  return { sourceFile: FILE_NAME, exists: true, logLines };
}
