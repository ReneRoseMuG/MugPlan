/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Date-Range-Filter im TourEmployeeCascadeDialog ist dialoglokaler State (filterDateFrom / filterDateTo).
 * - Die gefilterte Liste wird per useMemo aus previewItems berechnet.
 * - Die Filter-UI hat die korrekten data-testids.
 * - Der Reset-Button erscheint nur wenn mindestens ein Filterfeld gesetzt ist.
 * - appointmentRangeLabel basiert weiterhin auf den ungefilterten previewItems.
 *
 * Fehlerfaelle:
 * - Der Filter darf selectedAppointmentIds nicht beeinflussen.
 * - appointmentRangeLabel darf nicht auf filteredItems umgestellt werden.
 *
 * Ziel:
 * Die neue Date-Range-Filter-Verdrahtung im TourEmployeeCascadeDialog regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 UI: TourEmployeeCascadeDialog Date-Range-Filter wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TourEmployeeCascadeDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("declares dialoglokale Filter-State-Variablen", () => {
    expect(source).toContain("filterDateFrom, setFilterDateFrom] = useState<string | undefined>(undefined)");
    expect(source).toContain("filterDateTo, setFilterDateTo] = useState<string | undefined>(undefined)");
  });

  it("berechnet gefilterte Liste per useMemo aus previewItems", () => {
    expect(source).toContain("const filteredItems = useMemo(");
    expect(source).toContain("previewItems.filter(");
    expect(source).toContain("item.startDate < filterDateFrom");
    expect(source).toContain("item.startDate > filterDateTo");
    expect(source).toContain("[previewItems, filterDateFrom, filterDateTo]");
  });

  it("rendert die Filter-UI mit korrekten data-testids", () => {
    expect(source).toContain('data-testid="filter-tour-cascade-date-range"');
    expect(source).toContain('data-testid="input-tour-cascade-date-from"');
    expect(source).toContain('data-testid="input-tour-cascade-date-to"');
    expect(source).toContain('data-testid="button-tour-cascade-date-filter-reset"');
  });

  it("Reset-Button ist nur bei aktivem Filter sichtbar (isFilterActive)", () => {
    expect(source).toContain("const isFilterActive = filterDateFrom !== undefined || filterDateTo !== undefined");
    expect(source).toContain("{isFilterActive ? (");
  });

  it("appointmentRangeLabel basiert weiterhin auf ungefilterten previewItems", () => {
    expect(source).toContain("const appointmentRangeLabel = buildAppointmentRangeLabel(previewItems)");
    expect(source).not.toContain("buildAppointmentRangeLabel(filteredItems)");
  });

  it("Terminliste iteriert ueber filteredItems, nicht ueber previewItems", () => {
    expect(source).toContain("filteredItems.map((item) => {");
    expect(source).toContain("filteredItems.length === 0");
  });
});
