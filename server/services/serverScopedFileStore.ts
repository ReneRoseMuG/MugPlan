import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { ZodSchema } from "zod";
import { getServerFileStoreBasePath } from "../config/storagePaths";

export type FileScope = "USER" | "GLOBAL";

export interface FileRequest {
  scope: FileScope;
  userId?: string;
  namespace: string;
  key: string;
}

export interface ReadJsonRequest<T> extends FileRequest {
  schema?: ZodSchema<T>;
}

export interface WriteJsonRequest<T> extends FileRequest {
  data: T;
  schema?: ZodSchema<T>;
}

export type DeleteFileRequest = FileRequest;

export interface ListFilesRequest {
  scope: FileScope;
  userId?: string;
  namespace: string;
}

export interface FileEntry {
  key: string;
  path: string;
  size: number;
  modifiedAt: Date;
}

export class FileStoreValidationError extends Error {}
export class FileStorePermissionError extends Error {}
export class FileStoreNotFoundError extends Error {}
export class FileStoreIOError extends Error {}

const safeSegmentPattern = /^[A-Za-z0-9._-]+$/;

type ServerScopedFileStoreOptions = {
  baseDirectory?: string;
};

export class ServerScopedFileStore {
  private readonly configuredBaseDirectory?: string;

  constructor(options: ServerScopedFileStoreOptions = {}) {
    this.configuredBaseDirectory = options.baseDirectory;
  }

  async readJson<T>(request: ReadJsonRequest<T>): Promise<T | null> {
    const targetPath = await this.resolveFilePath(request);

    let rawContent: string;
    try {
      rawContent = await fs.readFile(targetPath, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }
      throw new FileStoreIOError(`Datei konnte nicht gelesen werden: ${targetPath}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new FileStoreValidationError("Datei enthält kein gültiges JSON.");
    }

    if (!request.schema) {
      return parsed as T;
    }

    const result = request.schema.safeParse(parsed);
    if (!result.success) {
      throw new FileStoreValidationError("Dateiinhalt entspricht nicht dem erwarteten Schema.");
    }
    return result.data;
  }

  async writeJson<T>(request: WriteJsonRequest<T>): Promise<void> {
    const targetPath = await this.resolveFilePath(request);
    const targetDirectory = path.dirname(targetPath);
    const tempPath = path.resolve(targetDirectory, `.${path.basename(targetPath)}.${crypto.randomUUID()}.tmp`);

    if (request.schema) {
      const result = request.schema.safeParse(request.data);
      if (!result.success) {
        throw new FileStoreValidationError("Daten entsprechen nicht dem erwarteten Schema.");
      }
    }

    const serialized = `${JSON.stringify(request.data, null, 2)}\n`;

    try {
      await fs.mkdir(targetDirectory, { recursive: true });
      await fs.writeFile(tempPath, serialized, "utf8");
      await fs.rename(tempPath, targetPath);
    } catch (error) {
      await removeTempFile(tempPath);
      if (error instanceof FileStorePermissionError || error instanceof FileStoreValidationError) {
        throw error;
      }
      throw new FileStoreIOError(`Datei konnte nicht geschrieben werden: ${targetPath}`);
    }
  }

  async delete(request: DeleteFileRequest): Promise<void> {
    const targetPath = await this.resolveFilePath(request);
    try {
      await fs.unlink(targetPath);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return;
      }
      throw new FileStoreIOError(`Datei konnte nicht gelöscht werden: ${targetPath}`);
    }
  }

  async exists(request: FileRequest): Promise<boolean> {
    const targetPath = await this.resolveFilePath(request);
    try {
      await fs.access(targetPath);
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return false;
      }
      throw new FileStoreIOError(`Datei konnte nicht geprüft werden: ${targetPath}`);
    }
  }

  async list(request: ListFilesRequest): Promise<FileEntry[]> {
    const namespaceDirectory = await this.resolveNamespaceDirectory(request);

    let entries: string[];
    try {
      entries = await fs.readdir(namespaceDirectory);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return [];
      }
      throw new FileStoreIOError(`Namespace konnte nicht gelesen werden: ${namespaceDirectory}`);
    }

    const result: FileEntry[] = [];
    for (const entryName of entries) {
      if (!entryName.endsWith(".json")) {
        continue;
      }

      const filePath = path.resolve(namespaceDirectory, entryName);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }

      result.push({
        key: entryName.slice(0, -".json".length),
        path: filePath,
        size: stat.size,
        modifiedAt: stat.mtime,
      });
    }

    return result.sort((left, right) => left.key.localeCompare(right.key));
  }

  private async resolveFilePath(request: FileRequest): Promise<string> {
    const namespaceDirectory = await this.resolveNamespaceDirectory(request);
    assertSafeSegment(request.key, "key");
    return this.assertInsideBaseDirectory(path.resolve(namespaceDirectory, `${request.key}.json`));
  }

  private async resolveNamespaceDirectory(request: ListFilesRequest): Promise<string> {
    const baseDirectory = await this.resolveBaseDirectory();
    assertSafeSegment(request.namespace, "namespace");

    const directory = request.scope === "USER"
      ? path.resolve(baseDirectory, "users", resolveUserId(request.userId), request.namespace)
      : path.resolve(baseDirectory, "global", request.namespace);

    return this.assertInsideBaseDirectory(directory);
  }

  private async resolveBaseDirectory(): Promise<string> {
    const baseDirectory = this.configuredBaseDirectory
      ? path.resolve(this.configuredBaseDirectory)
      : await getServerFileStoreBasePath();
    await fs.mkdir(baseDirectory, { recursive: true });
    return baseDirectory;
  }

  private async assertInsideBaseDirectory(targetPath: string): Promise<string> {
    const baseDirectory = await this.resolveBaseDirectory();
    const relativePath = path.relative(baseDirectory, targetPath);
    if (relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))) {
      return targetPath;
    }
    throw new FileStorePermissionError("Dateipfad liegt außerhalb des konfigurierten Base-Directories.");
  }
}

function resolveUserId(userId: string | undefined): string {
  if (typeof userId !== "string") {
    throw new FileStoreValidationError("USER-Dateien benötigen eine userId.");
  }
  assertSafeSegment(userId, "userId");
  return userId;
}

function assertSafeSegment(value: string, label: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new FileStoreValidationError(`${label} darf nicht leer sein.`);
  }
  if (path.isAbsolute(value) || value === "." || value === ".." || !safeSegmentPattern.test(value)) {
    throw new FileStoreValidationError(`${label} enthält ungültige Zeichen.`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function removeTempFile(tempPath: string): Promise<void> {
  try {
    await fs.unlink(tempPath);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}
