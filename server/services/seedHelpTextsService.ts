import { exportHelpTextsAsYaml, previewHelpTextsImport, applyHelpTextsImport } from "./helpTextsYamlService";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";

const FILE_NAME = "helptexts.yaml";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getHelpTextsSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function exportHelpTextsSeed(): Promise<SeedExecutionResult> {
  const yaml = await exportHelpTextsAsYaml();
  await writeSeedFileUtf8(FILE_NAME, yaml);
  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [`Export geschrieben: ${FILE_NAME}`],
  };
}

export async function applyHelpTextsSeed(): Promise<SeedExecutionResult> {
  const status = await getSeedFileStatus(FILE_NAME);
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const content = await readSeedFileUtf8(FILE_NAME);
  const buffer = Buffer.from(content, "utf8");
  const preview = await previewHelpTextsImport(buffer);
  const decisions = preview.conflicts.map((conflict) => ({ helpKey: conflict.helpKey, decision: "OVERWRITE" as const }));
  const result = await applyHelpTextsImport(buffer, preview.fileHash, decisions);

  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [
      `Hilfetexte importiert: ${preview.summary.totalItems}`,
      `Hilfetexte angelegt: ${result.createdCount}`,
      `Hilfetexte ueberschrieben: ${result.silentOverwrittenCount + result.decisionOverwrittenCount}`,
      `Hilfetexte uebersprungen: ${result.skippedCount}`,
    ],
  };
}
