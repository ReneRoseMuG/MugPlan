import fs from "fs/promises";
import path from "path";
import { getGlobalBackupBasePath } from "./userSettingsService";

function formatDateFolder(input = new Date()): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getBackupDayDirectory(now = new Date()): Promise<string> {
  const basePath = await getGlobalBackupBasePath();
  const dayFolder = formatDateFolder(now);
  const fullDir = path.resolve(basePath, dayFolder);
  await fs.mkdir(fullDir, { recursive: true });
  return fullDir;
}

export async function persistBackupFiles(input: {
  excelBuffer: Buffer;
  pdfBuffer: Buffer;
  now?: Date;
}): Promise<{ excelPath: string; pdfPath: string }> {
  const targetDir = await getBackupDayDirectory(input.now);
  const excelPath = path.resolve(targetDir, "calendar-backup.xlsx");
  const pdfPath = path.resolve(targetDir, "anstehende-termine.pdf");

  await fs.writeFile(excelPath, input.excelBuffer);
  await fs.writeFile(pdfPath, input.pdfBuffer);

  return { excelPath, pdfPath };
}

