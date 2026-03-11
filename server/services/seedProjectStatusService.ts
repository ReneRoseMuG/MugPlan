import * as projectStatusRepository from "../repositories/projectStatusRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { hasCsvHeader, parseBooleanFlag, parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const FILE_NAME = "projectstates.csv";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getProjectStatusSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function exportProjectStatusSeed(): Promise<SeedExecutionResult> {
  const statuses = await projectStatusRepository.getProjectStatuses("all");
  const content = stringifyCsv(
    ["Name", "Farbe", "Status"],
    statuses.map((status) => [status.title, status.color, status.isActive ? "true" : "false"]),
  );
  await writeSeedFileUtf8(FILE_NAME, content);
  return { sourceFile: FILE_NAME, exists: true, logLines: [`Export geschrieben: ${FILE_NAME}`, `Projektstatus exportiert: ${statuses.length}`] };
}

export async function applyProjectStatusSeed(): Promise<SeedExecutionResult> {
  const status = await getSeedFileStatus(FILE_NAME);
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const parsed = parseCsvWithHeaders(await readSeedFileUtf8(FILE_NAME));
  const hasStatusHeader = hasCsvHeader(parsed.headers, "Status");
  const rows = parsed.rows;
  const existingStatuses = await projectStatusRepository.getProjectStatuses("all");
  const statusesByTitle = new Map(existingStatuses.map((entry) => [entry.title.trim().toLocaleLowerCase("de"), entry]));
  const logLines: string[] = [];

  for (const row of rows) {
    const title = (row.Name ?? "").trim();
    const color = (row.Farbe ?? "").trim() || "#64748b";
    if (!title) {
      logLines.push("Projektstatus uebersprungen: Name fehlt");
      continue;
    }

    const existing = statusesByTitle.get(title.toLocaleLowerCase("de"));
    const isActive = hasStatusHeader
      ? parseBooleanFlag(row.Status ?? "", existing?.isActive ?? true)
      : true;
    if (!existing) {
      await projectStatusRepository.createProjectStatus({
        title,
        description: null,
        color,
        sortOrder: 0,
      });
      const created = (await projectStatusRepository.getProjectStatuses("all")).find((entry) => entry.title.trim().toLocaleLowerCase("de") === title.toLocaleLowerCase("de"));
      if (created && created.isActive !== isActive) {
        await projectStatusRepository.toggleProjectStatusActiveWithVersion(created.id, created.version, isActive);
      }
      logLines.push(`Projektstatus angelegt: ${title}`);
      continue;
    }

    await projectStatusRepository.updateProjectStatusWithVersion(existing.id, existing.version, {
      color,
      isActive,
    });
    logLines.push(`Projektstatus aktualisiert: ${title}`);
  }

  return { sourceFile: FILE_NAME, exists: true, logLines };
}
