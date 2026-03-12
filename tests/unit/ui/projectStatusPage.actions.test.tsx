/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten
 *
 * Abgedeckte Regeln:
 * - API-Mutationen fuer Toggle/Delete bleiben in der Page verdrahtet.
 * - Edit-Entry-Points sind zentral ueber canEdit verdrahtet.
 * - Update/Toggle/Delete senden Versionsinformationen fuer Optimistic Locking.
 * - Nach Mutationen werden alle Projektstatus-Queryvarianten fuer Picker und Admin-Liste invalidiert.
 * - ListView rendert keine Footer-Action-Buttons (Toggle/Edit/Delete).
 *
 * Fehlerfaelle:
 * - Keine Laufzeitfehler, Fokus auf Verdrahtung der FT15-UI-Aktionslogik.
 *
 * Ziel:
 * Sicherstellen, dass die Projektstatus-Page weiterhin korrekt verdrahtet ist, waehrend die Card-Actions entfernt bleiben.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT15 project status page action wiring", () => {
  it("wires toggle and delete API mutations", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("canEdit={true}");
    expect(source).toContain('apiRequest("PATCH", `/api/project-status/${status.id}/active`');
    expect(source).toContain('apiRequest("DELETE", `/api/project-status/${status.id}`');
  });

  it("sends version for update/toggle/delete", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("version: status.version");
  });

  it("invalidates both active picker and admin list queries after mutations", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("async function invalidateProjectStatusQueries()");
    expect(source).toContain('firstKey.startsWith("/api/project-status")');
  });

  it("removes footer action buttons in list view while keeping double-click edit wiring", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectStatusList.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("onDoubleClick={!isPicker && canEdit ? () => onEditStatus?.(status) : undefined}");
    expect(source).not.toContain("button-toggle-status-");
    expect(source).not.toContain("button-edit-status-");
    expect(source).not.toContain("button-delete-status-");
  });
});
