/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus zu Projekt zuordnen / UC Projektstatus entfernen
 *
 * Abgedeckte Regeln:
 * - Add-Relation sendet expectedVersion=0 als Precondition-Create.
 * - Remove-Relation sendet die relationVersion als optimistic-lock token.
 *
 * Fehlerfaelle:
 * - Keine Laufzeitfehler, Fokus auf API-Verdrahtung der Client-Requests.
 *
 * Ziel:
 * Sicherstellen, dass ProjectForm die Relations-Requests lock-konform absendet.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT15 project form relation locking wiring", () => {
  it("sends expectedVersion=0 on add relation", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("expectedVersion: 0");
    expect(source).toContain("`/api/projects/${projectId}/statuses`");
  });

  it("sends relationVersion on remove relation", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("version: item.relationVersion");
    expect(source).toContain("`/api/projects/${projectId}/statuses/${item.status.id}`");
  });
});

