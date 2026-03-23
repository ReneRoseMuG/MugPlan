import * as toursRepository from "../repositories/toursRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const FILE_NAME = "tours.csv";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getToursSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function exportToursSeed(): Promise<SeedExecutionResult> {
  const tours = await toursRepository.getTours();
  if (tours.length === 0) {
    return {
      sourceFile: FILE_NAME,
      exists: false,
      logLines: [`Kein Export geschrieben: ${FILE_NAME} (keine Touren vorhanden)`],
    };
  }
  const content = stringifyCsv(
    ["Name", "Farbe"],
    tours.map((tour) => [tour.name, tour.color]),
  );
  await writeSeedFileUtf8(FILE_NAME, content);
  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [`Export geschrieben: ${FILE_NAME}`, `Touren exportiert: ${tours.length}`],
  };
}

export async function applyToursSeed(): Promise<SeedExecutionResult> {
  const status = await getToursSeedStatus();
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const parsed = parseCsvWithHeaders(await readSeedFileUtf8(FILE_NAME));
  const existingTours = await toursRepository.getTours();
  const toursByName = new Map(existingTours.map((entry) => [entry.name.trim().toLocaleLowerCase("de"), entry]));
  const logLines: string[] = [];

  for (const row of parsed.rows) {
    const name = (row.Name ?? "").trim();
    const color = (row.Farbe ?? "").trim() || "#2563eb";
    if (!name) {
      logLines.push("Tour uebersprungen: Name fehlt");
      continue;
    }

    const existing = toursByName.get(name.toLocaleLowerCase("de"));
    if (!existing) {
      const created = await toursRepository.createTour(name, color);
      toursByName.set(name.toLocaleLowerCase("de"), created);
      logLines.push(`Tour angelegt: ${name}`);
      continue;
    }

    const result = await toursRepository.updateTourWithVersion(existing.id, existing.version, name, color);
    if (result.kind === "updated") {
      toursByName.set(name.toLocaleLowerCase("de"), result.tour);
    }
    logLines.push(`Tour aktualisiert: ${name}`);
  }

  return { sourceFile: FILE_NAME, exists: true, logLines };
}
