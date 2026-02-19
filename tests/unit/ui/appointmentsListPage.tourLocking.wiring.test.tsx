/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Terminliste im Tour-Formular mit fixierter Tour
 *
 * Abgedeckte Regeln:
 * - AppointmentsListPage unterstuetzt hideTourFilter, lockedTourId und hideTourColumn.
 * - Bei hideTourColumn wird die Tour-Spalte nicht aufgebaut.
 * - Bei lockedTourId wird der Tour-Filter intern fixiert.
 *
 * Fehlerfaelle:
 * - Tour-Filter bleibt im Tour-Formular sichtbar.
 * - Tour-Spalte bleibt trotz hideTourColumn sichtbar.
 *
 * Ziel:
 * Regressionssichere Verdrahtung der wiederverwendeten Terminliste fuer das Tour-Formular.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT04 appointments list page tour locking wiring", () => {
  it("supports hideTourFilter, lockedTourId and hideTourColumn props", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("hideTourFilter?: boolean;");
    expect(source).toContain("lockedTourId?: number | null;");
    expect(source).toContain("hideTourColumn?: boolean;");
  });

  it("hides tour column when hideTourColumn is enabled and resets tour sort key", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("if (hideTourColumn && sortKey === \"tour\")");
    expect(source).toContain("setSortKey(\"project\")");
    expect(source).toContain("if (!hideTourColumn) {");
    expect(source).toContain("id: \"tour\"");
  });

  it("locks the tour filter value when lockedTourId is provided", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("tourId: lockedTourId ?? undefined");
    expect(source).toContain("enabled: lockedTourId !== null");
    expect(source).toContain("const nextPatch = lockedTourId == null");
    expect(source).toContain("hideTourFilter={hideTourFilter}");
  });
});
