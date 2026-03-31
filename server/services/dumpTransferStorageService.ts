import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getBackupBasePath } from "../config/storagePaths";

function formatDateFolder(input = new Date()): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTransferId(input = new Date()): string {
  const iso = input.toISOString().replace(/[:.]/g, "-");
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `transfer_${iso}_${randomSuffix}`;
}

export type DumpTransferRun = {
  transferId: string;
  transferDir: string;
};

export async function createDumpTransferRun(now = new Date()): Promise<DumpTransferRun> {
  const basePath = await getBackupBasePath();
  const transferId = buildTransferId(now);
  const transferDir = path.resolve(basePath, "transfers", formatDateFolder(now), transferId);
  await fs.mkdir(transferDir, { recursive: true });
  return {
    transferId,
    transferDir,
  };
}

export async function writeDumpTransferBinaryArtifact(
  transferDir: string,
  filename: string,
  content: Buffer,
): Promise<string> {
  const targetPath = path.resolve(transferDir, filename);
  await fs.writeFile(targetPath, content);
  return targetPath;
}

export async function writeDumpTransferJsonArtifact(
  transferDir: string,
  filename: string,
  content: unknown,
): Promise<string> {
  const targetPath = path.resolve(transferDir, filename);
  await fs.writeFile(targetPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  return targetPath;
}
