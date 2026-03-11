import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getAttachmentStoragePath } from "../config/storagePaths";

export type SeedFileStatus = {
  sourceFile: string;
  exists: boolean;
};

async function getSeedDirectory(): Promise<string> {
  const uploadsPath = await getAttachmentStoragePath();
  const seedPath = path.resolve(uploadsPath, "seed");
  await mkdir(seedPath, { recursive: true });
  return seedPath;
}

export async function getSeedFilePath(fileName: string): Promise<string> {
  const seedDirectory = await getSeedDirectory();
  return path.resolve(seedDirectory, fileName);
}

export async function getSeedFileStatus(fileName: string): Promise<SeedFileStatus> {
  const filePath = await getSeedFilePath(fileName);
  try {
    await access(filePath);
    return { sourceFile: fileName, exists: true };
  } catch {
    return { sourceFile: fileName, exists: false };
  }
}

export async function readSeedFileUtf8(fileName: string): Promise<string> {
  const filePath = await getSeedFilePath(fileName);
  return readFile(filePath, "utf8");
}

export async function writeSeedFileUtf8(fileName: string, content: string): Promise<void> {
  const filePath = await getSeedFilePath(fileName);
  await writeFile(filePath, content, "utf8");
}
