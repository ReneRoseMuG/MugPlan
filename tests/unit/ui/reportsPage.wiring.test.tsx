/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ReportsPage verdrahtet den Vorlaufliste-HelpKey, den Generate-Button und die beiden Datumsfelder als Date-Picker.
 * - Home und Sidebar binden die neue Reports-Hauptansicht nur fuer Admin/Disponent ein.
 *
 * Fehlerfaelle:
 * - Reports ist nicht in Home oder Sidebar verdrahtet.
 * - Die Vorlaufliste laedt ohne expliziten Trigger oder ohne festen 100er-Page-Size.
 *
 * Ziel:
 * Die UI-Wiring-Regeln fuer den neuen Reports-Einstieg regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT26 reports page wiring", () => {
  const reportsPageSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ReportsPage.tsx"),
    "utf8",
  );
  const homeSource = readFileSync(
    path.resolve(process.cwd(), "client/src/pages/Home.tsx"),
    "utf8",
  );
  const sidebarSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/Sidebar.tsx"),
    "utf8",
  );

  it("wires the vorlaufliste panel, help key and fixed paging", () => {
    expect(reportsPageSource).toContain("helpKey=\"reports.vorlaufliste\"");
    expect(reportsPageSource).toContain("Datum Ende anzeigen");
    expect(reportsPageSource).toContain("Datum Beginn");
    expect(reportsPageSource).toContain("Datum Ende");
    expect(reportsPageSource).toContain('type="date"');
    expect(reportsPageSource).toContain("Report erzeugen");
    expect(reportsPageSource).toContain("const REPORT_PAGE_SIZE = 100;");
    expect(reportsPageSource).toContain("enabled: submittedFilters !== null");
  });

  it("registers reports view in home and sidebar for admin or dispatcher", () => {
    expect(homeSource).toContain("| \"reports\"");
    expect(homeSource).toContain("const canAccessReports = isAdmin || userRole === \"DISPATCHER\";");
    expect(homeSource).toContain("view === \"reports\" && canAccessReports");
    expect(sidebarSource).toContain("const canAccessReports = isAdmin || userRole?.toUpperCase() === \"DISPATCHER\";");
    expect(sidebarSource).toContain("label=\"Reports\"");
  });
});
