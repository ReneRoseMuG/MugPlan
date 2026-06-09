import fs from "fs";
import os from "os";
import path from "path";

/**
 * AP05 (MS-64): Deterministische, worker-spezifische Storage-Pfade fuer parallele
 * Browser-Worker-Server. Deterministisch (nicht zufaellig), damit playwright.config.ts und
 * der globalSetup denselben Pfad je Worker verwenden.
 */
export function workerStoragePaths(index: number) {
  const root = path.join(os.tmpdir(), `mugplan-browser-w${index}`);
  return {
    root,
    uploadsPath: path.join(root, "uploads"),
    backupsPath: path.join(root, "backups"),
    correctionWorkflowsPath: path.join(root, "correction-workflows"),
  };
}

/** Erzeugt die Worker-Storage-Verzeichnisse frisch (rueckstandsfrei) fuer einen Worker. */
export function prepareWorkerStorage(index: number): ReturnType<typeof workerStoragePaths> {
  const paths = workerStoragePaths(index);
  fs.rmSync(paths.root, { recursive: true, force: true });
  fs.mkdirSync(paths.uploadsPath, { recursive: true });
  fs.mkdirSync(paths.backupsPath, { recursive: true });
  fs.mkdirSync(paths.correctionWorkflowsPath, { recursive: true });
  return paths;
}
