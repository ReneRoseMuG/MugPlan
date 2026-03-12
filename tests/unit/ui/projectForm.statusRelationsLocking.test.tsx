/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus zu Projekt zuordnen / UC Projektstatus entfernen
 *
 * Abgedeckte Regeln:
 * - Projektstatus-Panel wird fuer Nicht-Admins readonly ueber canEdit gesteuert.
 * - Projektstatus-Panel erhaelt den kombinierten Lade-/Fehlerzustand aus Relations- und Status-Query.
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
  it("derives role and wires canEdit to ProjectStatusPanel for ADMIN or DISPATCHER", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const [userRole] = useState(() => window.localStorage.getItem(\"userRole\")?.toUpperCase() ?? \"DISPATCHER\")");
    expect(source).toContain("const isAdmin = userRole === \"ADMIN\"");
    expect(source).toContain("const canManageProjectStatuses = isAdmin || userRole === \"DISPATCHER\"");
    expect(source).toContain("canEdit={canManageProjectStatuses}");
    expect(source).toContain("const statusPanelLoading = assignedStatusesLoading || allStatusesLoading");
    expect(source).toContain("loadErrorMessage={statusPanelLoadErrorMessage}");
    expect(source).toContain("grid grid-cols-3 items-stretch gap-6");
    expect(source).toContain("className=\"h-full\"");
  });

  it("sends expectedVersion=0 on add relation", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("expectedVersion: 0");
    expect(source).toContain("if (!canManageProjectStatuses) return;");
    expect(source).toContain("`/api/projects/${projectId}/statuses`");
  });

  it("sends relationVersion on remove relation", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("version: item.relationVersion");
    expect(source).toContain("`/api/projects/${projectId}/statuses/${item.status.id}`");
  });
});
