/**
 * Test Scope:
 *
 * Feature: Generisches Server-Filesystem
 * Use Case: USER- und GLOBAL-gescopte JSON-Dateien im echten Test-Dateisystem speichern
 *
 * Abgedeckte Regeln:
 * - USER- und GLOBAL-Dateien werden getrennt unter sicheren Pfaden gespeichert.
 * - Lesen, Schreiben, Loeschen, Exists und List arbeiten mit echten JSON-Dateien.
 * - Schema-Validierung greift vor dem Schreiben und nach dem Lesen.
 * - Unsichere Pfadsegmente koennen den Base-Pfad nicht verlassen.
 *
 * Fehlerfaelle:
 * - Path Traversal, absolute Pfade, leere Segmente und ungueltige Zeichen werden akzeptiert.
 * - USER-Scope funktioniert ohne userId.
 * - Invalide JSON-Strukturen werden gelesen oder geschrieben.
 *
 * Ziel:
 * Die generische Server-Dateisystem-Komponente ohne fs-Mocks regressionssicher absichern.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  FileStoreValidationError,
  ServerScopedFileStore,
} from "../../../server/services/serverScopedFileStore";

class TestFileProfile {
  constructor(
    public readonly id: string,
    public readonly displayName: string,
    public readonly settings: {
      theme: "light" | "dark";
      pageSize: number;
      enabledFeatures: string[];
    },
    public readonly metadata: {
      createdBy: string;
      version: number;
    },
  ) {}
}

const testProfile = new TestFileProfile(
  "profile-1",
  "Testprofil Anna",
  {
    theme: "dark",
    pageSize: 50,
    enabledFeatures: ["calendar", "exports", "filters"],
  },
  {
    createdBy: "user-anna",
    version: 1,
  },
);

const updatedProfile = new TestFileProfile(
  "profile-1",
  "Testprofil Anna aktualisiert",
  {
    theme: "light",
    pageSize: 25,
    enabledFeatures: ["calendar", "filters"],
  },
  {
    createdBy: "user-anna",
    version: 2,
  },
);

const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  settings: z.object({
    theme: z.enum(["light", "dark"]),
    pageSize: z.number().int().positive(),
    enabledFeatures: z.array(z.string()).min(1),
  }),
  metadata: z.object({
    createdBy: z.string(),
    version: z.number().int().positive(),
  }),
});

type ParsedProfile = z.infer<typeof profileSchema>;

describe("ServerScopedFileStore", () => {
  let tempRoot: string;
  let store: ServerScopedFileStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-server-fs-"));
    store = new ServerScopedFileStore({ baseDirectory: path.resolve(tempRoot, "ServerFS") });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("creates the base directory lazily and writes readable USER JSON with real profile data", async () => {
    const baseDirectory = path.resolve(tempRoot, "ServerFS");
    await expect(fs.access(baseDirectory)).rejects.toBeTruthy();

    await store.writeJson({
      scope: "USER",
      userId: "user-anna",
      namespace: "profiles",
      key: "dashboard",
      data: testProfile,
      schema: profileSchema,
    });

    await expect(fs.access(baseDirectory)).resolves.toBeUndefined();
    const filePath = path.resolve(baseDirectory, "users", "user-anna", "profiles", "dashboard.json");
    const rawJson = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(rawJson)).toEqual(testProfile);
  });

  it("writes GLOBAL JSON and creates missing namespace directories automatically", async () => {
    await store.writeJson({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "default",
      data: testProfile,
      schema: profileSchema,
    });

    const filePath = path.resolve(tempRoot, "ServerFS", "global", "profiles", "default.json");
    await expect(fs.access(filePath)).resolves.toBeUndefined();
    expect(JSON.parse(await fs.readFile(filePath, "utf8"))).toEqual(testProfile);
  });

  it("overwrites an existing file and reads the updated JSON payload", async () => {
    const request = {
      scope: "USER" as const,
      userId: "user-anna",
      namespace: "profiles",
      key: "dashboard",
      schema: profileSchema,
    };

    await store.writeJson({ ...request, data: testProfile });
    await store.writeJson({ ...request, data: updatedProfile });

    const readBack = await store.readJson<ParsedProfile>(request);

    expect(readBack).toEqual(updatedProfile);
    expect(readBack?.metadata.version).toBe(2);
    expect(readBack?.settings.enabledFeatures).toEqual(["calendar", "filters"]);
  });

  it("reads USER and GLOBAL files, returns null for missing files and validates read data", async () => {
    await store.writeJson({
      scope: "USER",
      userId: "user-anna",
      namespace: "profiles",
      key: "dashboard",
      data: testProfile,
      schema: profileSchema,
    });
    await store.writeJson({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "default",
      data: updatedProfile,
      schema: profileSchema,
    });

    const userProfile = await store.readJson<ParsedProfile>({
      scope: "USER",
      userId: "user-anna",
      namespace: "profiles",
      key: "dashboard",
      schema: profileSchema,
    });
    const globalProfile = await store.readJson<ParsedProfile>({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "default",
      schema: profileSchema,
    });
    const missingProfile = await store.readJson<ParsedProfile>({
      scope: "USER",
      userId: "user-anna",
      namespace: "profiles",
      key: "missing",
      schema: profileSchema,
    });

    expect(userProfile).toEqual(testProfile);
    expect(globalProfile).toEqual(updatedProfile);
    expect(missingProfile).toBeNull();
  });

  it("deletes USER and GLOBAL files idempotently", async () => {
    await store.writeJson({
      scope: "USER",
      userId: "user-anna",
      namespace: "profiles",
      key: "dashboard",
      data: testProfile,
    });
    await store.writeJson({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "default",
      data: testProfile,
    });

    await store.delete({ scope: "USER", userId: "user-anna", namespace: "profiles", key: "dashboard" });
    await store.delete({ scope: "GLOBAL", namespace: "profiles", key: "default" });
    await store.delete({ scope: "GLOBAL", namespace: "profiles", key: "default" });

    await expect(fs.access(path.resolve(tempRoot, "ServerFS", "users", "user-anna", "profiles", "dashboard.json"))).rejects.toBeTruthy();
    await expect(fs.access(path.resolve(tempRoot, "ServerFS", "global", "profiles", "default.json"))).rejects.toBeTruthy();
  });

  it("reports exists for present and missing files", async () => {
    const request = { scope: "USER" as const, userId: "user-anna", namespace: "profiles", key: "dashboard" };

    expect(await store.exists(request)).toBe(false);
    await store.writeJson({ ...request, data: testProfile });
    expect(await store.exists(request)).toBe(true);
  });

  it("lists USER files with key, path, size and modifiedAt while ignoring other namespaces", async () => {
    await store.writeJson({ scope: "USER", userId: "user-anna", namespace: "profiles", key: "dashboard", data: testProfile });
    await store.writeJson({ scope: "USER", userId: "user-anna", namespace: "profiles", key: "filters", data: updatedProfile });
    await store.writeJson({ scope: "USER", userId: "user-anna", namespace: "other", key: "hidden", data: testProfile });

    const entries = await store.list({ scope: "USER", userId: "user-anna", namespace: "profiles" });

    expect(entries.map((entry) => entry.key)).toEqual(["dashboard", "filters"]);
    expect(entries[0]?.path).toBe(path.resolve(tempRoot, "ServerFS", "users", "user-anna", "profiles", "dashboard.json"));
    expect(entries[0]?.size).toBeGreaterThan(20);
    expect(entries[0]?.modifiedAt).toBeInstanceOf(Date);
  });

  it("lists GLOBAL files and keeps USER files out of the GLOBAL namespace", async () => {
    await store.writeJson({ scope: "GLOBAL", namespace: "profiles", key: "default", data: testProfile });
    await store.writeJson({ scope: "USER", userId: "user-anna", namespace: "profiles", key: "dashboard", data: updatedProfile });

    const entries = await store.list({ scope: "GLOBAL", namespace: "profiles" });

    expect(entries.map((entry) => entry.key)).toEqual(["default"]);
    expect(entries[0]?.path).toBe(path.resolve(tempRoot, "ServerFS", "global", "profiles", "default.json"));
  });

  it("blocks unsafe segments and never writes outside the base directory", async () => {
    const unsafeRequests = [
      { scope: "GLOBAL" as const, namespace: "../profiles", key: "dashboard" },
      { scope: "GLOBAL" as const, namespace: path.resolve(tempRoot, "profiles"), key: "dashboard" },
      { scope: "GLOBAL" as const, namespace: "", key: "dashboard" },
      { scope: "GLOBAL" as const, namespace: "profiles", key: "dash/board" },
      { scope: "USER" as const, namespace: "profiles", key: "dashboard" },
      { scope: "USER" as const, userId: "user:anna", namespace: "profiles", key: "dashboard" },
    ];

    for (const request of unsafeRequests) {
      await expect(store.writeJson({ ...request, data: testProfile })).rejects.toBeInstanceOf(FileStoreValidationError);
    }

    await expect(fs.access(path.resolve(tempRoot, "profiles", "dashboard.json"))).rejects.toBeTruthy();
    await expect(fs.access(path.resolve(tempRoot, "ServerFS", "global", "profiles", "dash", "board.json"))).rejects.toBeTruthy();
  });

  it("rejects invalid data before writing and invalid JSON structure while reading", async () => {
    await expect(store.writeJson({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "invalid",
      data: {
        id: "profile-2",
        displayName: "Testprofil defekt",
        settings: { theme: "dark", pageSize: -1, enabledFeatures: [] },
        metadata: { createdBy: "user-anna", version: 1 },
      },
      schema: profileSchema,
    })).rejects.toBeInstanceOf(FileStoreValidationError);

    const invalidFilePath = path.resolve(tempRoot, "ServerFS", "global", "profiles", "invalid-read.json");
    await fs.mkdir(path.dirname(invalidFilePath), { recursive: true });
    await fs.writeFile(invalidFilePath, JSON.stringify({
      id: "profile-3",
      displayName: "Testprofil mit ungültiger Struktur",
      settings: { theme: "dark", pageSize: 10, enabledFeatures: [] },
      metadata: { createdBy: "user-anna", version: 1 },
    }), "utf8");

    await expect(store.readJson({
      scope: "GLOBAL",
      namespace: "profiles",
      key: "invalid-read",
      schema: profileSchema,
    })).rejects.toBeInstanceOf(FileStoreValidationError);
    await expect(fs.access(path.resolve(tempRoot, "ServerFS", "global", "profiles", "invalid.json"))).rejects.toBeTruthy();
  });
});
