import fs from "fs";
import path from "path";
import * as adminRepository from "../repositories/adminRepository";

const logPrefix = "[admin-service]";

export type ResetDatabaseResult = {
  ok: true;
  deleted: adminRepository.ResetDomainDataCounts;
  attachments: {
    filesDeleted: number;
    filesMissing: number;
  };
  durationMs: number;
};

export async function resetDatabase(): Promise<ResetDatabaseResult> {
  const startedAtMs = Date.now();
  console.info(`${logPrefix} reset start`);

  const storagePaths = await adminRepository.listAllAttachmentStoragePaths();
  const deleted = await adminRepository.resetDomainData();

  let filesDeleted = 0;
  let filesMissing = 0;
  for (const storagePath of storagePaths) {
    try {
      fs.unlinkSync(path.resolve(storagePath));
      filesDeleted += 1;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        filesMissing += 1;
        continue;
      }
      console.error(`${logPrefix} attachment delete failed`, {
        storagePath,
        message: err.message,
      });
      throw error;
    }
  }

  const durationMs = Date.now() - startedAtMs;
  console.info(`${logPrefix} reset finish`, {
    durationMs,
    deleted,
    attachments: { filesDeleted, filesMissing },
  });

  return {
    ok: true,
    deleted,
    attachments: {
      filesDeleted,
      filesMissing,
    },
    durationMs,
  };
}
