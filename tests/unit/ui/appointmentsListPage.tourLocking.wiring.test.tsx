/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Terminliste im Tour-Formular mit fixierter Tour
 *
 * Abgedeckte Regeln:
 * - AppointmentsListPage unterstuetzt die neue context-Prop (standalone/tour/employee).
 * - Legacy-Props hideTourFilter, lockedTourId, hideTourColumn und enforceFromToday bleiben kompatibel markiert.
 * - Im Tour-Kontext wird Tour intern fixiert und die Tour-Spalte ausgeblendet.
 * - Der Show-All-Switch ist verdrahtet und steuert dateFrom (undefined vs. Berlin-heute).
 * - Projektnamen in der Terminliste werden ohne Kundennummer-Praefix gerendert.
 * - Auftragsnummer wird in der Projektspalte als Suffix "(<Auftragsnummer>)" angezeigt und als Listenfilter uebergeben.
 *
 * Fehlerfaelle:
 * - Tour-Filter bleibt im Tour-Formular sichtbar.
 * - Tour-Spalte bleibt trotz hideTourColumn sichtbar.
 * - Projektspalte zeigt weiterhin den gespeicherten "K: ... - ..."-Praefix.
 *
 * Ziel:
 * Regressionssichere Verdrahtung der wiederverwendeten Terminliste fuer das Tour-Formular.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT04 appointments list page tour locking wiring", () => {
  it("supports context prop and keeps legacy props as deprecated fallback", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("type AppointmentsListContext =");
    expect(source).toContain("context?: AppointmentsListContext;");
    expect(source).toContain("type: \"standalone\"");
    expect(source).toContain("type: \"tour\"; tourId: number | null");
    expect(source).toContain("type: \"employee\"; employeeId: number");
    expect(source).toContain("TODO(deprecated): use `context` instead.");
    expect(source).toContain("hideTourFilter?: boolean;");
    expect(source).toContain("lockedTourId?: number | null;");
    expect(source).toContain("hideTourColumn?: boolean;");
    expect(source).toContain("enforceFromToday?: boolean;");
    expect(source).toContain("helpKey?: string;");
    expect(source).toContain("helpKey = \"appointments\"");
  });

  it("hides tour column in tour and employee context", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const resolvedHideTourColumn = (isTourContext || isEmployeeContext) ? true : hideTourColumn;");
    expect(source).toContain("if (!resolvedHideTourColumn) {");
    expect(source).toContain("id: \"tour\"");
  });

  it("locks tour and employee ids via resolved context", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const resolvedTourId = context?.type === \"tour\" ? context.tourId : lockedTourId;");
    expect(source).toContain("const resolvedEmployeeId = context?.type === \"employee\" ? context.employeeId : undefined;");
    expect(source).toContain("enabled: resolvedTourId !== null");
    expect(source).toContain("const patchWithTour = resolvedTourId == null");
    expect(source).toContain("const nextPatch = resolvedEmployeeId == null");
    expect(source).toContain("const resolvedHideTourFilter = (isTourContext || isEmployeeContext) ? true : hideTourFilter;");
    expect(source).toContain("hideTourFilter={resolvedHideTourFilter}");
    expect(source).toContain("hideEmployeeFilter={resolvedHideEmployeeFilter}");
  });

  it("uses date as single sortable column with default descending direction", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const [sortDirection, setSortDirection] = useState<SortDirection>(\"desc\");");
    expect(source).toContain("const handleDateSortToggle = () => {");
    expect(source).toContain("if (dateCompare !== 0) return dateCompare;");
    expect(source).toContain("return (left.id - right.id) * multiplier;");
    expect(source).toContain("onClick={handleDateSortToggle}");
  });

  it("renders project column with isolated project name without customer prefix", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("function resolveAppointmentProjectDisplayName(storedProjectName: string): string");
    expect(source).toContain("return storedProjectName.trim();");
    expect(source).not.toContain("const separator = \" - \";");
    expect(source).not.toContain("if (suffix && (kPrefixed || /\\\\d/.test(prefix)))");
    expect(source).toContain("function resolveAppointmentProjectColumnValue(row: AppointmentListItem): string");
    expect(source).toContain("const orderNumber = row.projectOrderNumber?.trim();");
    expect(source).toContain("return `${projectName} (${orderNumber})`;");
    expect(source).toContain("accessor: (row) => resolveAppointmentProjectColumnValue(row)");
    expect(source).toContain("cell: ({ row }) => <span className=\"font-medium\">{resolveAppointmentProjectColumnValue(row)}</span>");
  });

  it("wires show-all switch to toggle dateFrom against Berlin-today", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const todayBerlin = getBerlinTodayDateString();");
    expect(source).toContain("const [showAllAppointments, setShowAllAppointments] = useState(false);");
    expect(source).toContain("if (showAllAppointments) return;");
    expect(source).toContain("dateFrom: checked ? undefined : todayBerlin");
    expect(source).toContain("showAllAppointmentsHelpKey=\"appointments.filter.showAll\"");
  });

  it("forwards optional orderNumber filter into appointments list query", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("orderNumber: \"\",");
    expect(source).toContain("if (filters.orderNumber.trim().length > 0) params.set(\"orderNumber\", filters.orderNumber.trim());");
  });

  it("forwards resolved helpKey into ListLayout", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("helpKey={helpKey}");
  });
});
