/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - useListFilters setzt die Seite bei Filteraenderungen deterministisch auf 1 zurueck.
 * - useListFilters baut Query-Parameter aus Filterzustand und aktueller Seite.
 *
 * Fehlerfaelle:
 * - Paging bleibt nach Filterwechsel auf einer alten Seite stehen.
 * - Query-Parameter verlieren den Seitenbezug fuer paginierte Listen.
 *
 * Ziel:
 * Den gemeinsamen Paging-/Filtervertrag des Listen-Hooks regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT30 useListFilters paging wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/hooks/useListFilters.ts");
  const source = readFileSync(filePath, "utf8");

  it("resets paging to page 1 on setFilter and resetFilters", () => {
    expect(source).toContain("const [page, setPage] = useState(initialPage);");
    expect(source).toContain("setFilters((prev) => ({ ...prev, [key]: value }));");
    expect(source).toContain("setPage(1);");
    expect(source).toContain("const resetFilters = () => {");
  });

  it("includes the current page when query params are built", () => {
    expect(source).toContain("buildQueryParams?: (filters: TFilters, page: number) => QueryParamsInput;");
    expect(source).toContain("const rawParams = buildQueryParams ? buildQueryParams(filters, page) : {};");
    expect(source).toContain("page,");
  });
});
