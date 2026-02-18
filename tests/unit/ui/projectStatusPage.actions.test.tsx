/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten
 *
 * Abgedeckte Regeln:
 * - Admin-UI bietet Aktionen fuer Aktivieren/Deaktivieren und Loeschen.
 * - Update/Toggle/Delete senden Versionsinformationen fuer Optimistic Locking.
 * - Default-Status ist in der UI fuer Loeschen deaktiviert.
 *
 * Fehlerfaelle:
 * - Keine Laufzeitfehler, Fokus auf Verdrahtung der FT15-UI-Aktionslogik.
 *
 * Ziel:
 * Sicherstellen, dass die Projektstatus-Adminseite die geforderten FT15-Aktionen verdrahtet.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT15 project status page action wiring", () => {
  it("wires toggle and delete API mutations", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain('apiRequest("PATCH", `/api/project-status/${status.id}/active`');
    expect(source).toContain('apiRequest("DELETE", `/api/project-status/${status.id}`');
  });

  it("sends version for update/toggle/delete", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("version: status.version");
  });

  it("keeps default status delete disabled in list view", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusList.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("disabled={isActionPending || status.isDefault}");
    expect(source).toContain("button-delete-status-");
  });
});

