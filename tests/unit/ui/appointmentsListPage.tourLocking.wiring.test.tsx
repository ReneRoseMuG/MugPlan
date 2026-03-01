/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Terminliste im Tour-Formular mit fixierter Tour
 *
 * Abgedeckte Regeln:
 * - AppointmentsListPage unterstuetzt hideTourFilter, lockedTourId, hideTourColumn und enforceFromToday.
 * - AppointmentsListPage unterstuetzt einen individuellen helpKey mit kompatiblem Default.
 * - Bei hideTourColumn wird die Tour-Spalte nicht aufgebaut.
 * - Bei lockedTourId wird der Tour-Filter intern fixiert.
 * - Bei enforceFromToday wird dateFrom auf Berlin-heute initialisiert und erzwungen.
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
  it("supports hideTourFilter, lockedTourId, hideTourColumn and enforceFromToday props", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("hideTourFilter?: boolean;");
    expect(source).toContain("lockedTourId?: number | null;");
    expect(source).toContain("hideTourColumn?: boolean;");
    expect(source).toContain("enforceFromToday?: boolean;");
    expect(source).toContain("helpKey?: string;");
    expect(source).toContain("helpKey = \"appointments\"");
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

  it("enforces dateFrom as Berlin-today when enforceFromToday is active", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const todayBerlin = getBerlinTodayDateString();");
    expect(source).toContain("dateFrom: enforceFromToday ? todayBerlin : undefined");
    expect(source).toContain("if (!enforceFromToday) return;");
    expect(source).toContain("const enforcedPatch = enforceFromToday");
    expect(source).toContain("dateFrom: todayBerlin");
  });

  it("forwards resolved helpKey into ListLayout", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("helpKey={helpKey}");
  });
});
