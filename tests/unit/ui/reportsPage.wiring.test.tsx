/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ReportsPage verdrahtet zwei Report-Arten mit gemeinsamer Konfiguration, Generate-Button und Date-Pickern.
 * - Die Konfiguration nutzt persistente Auswahlgruppen fuer Vorlaufliste und Produkt Vorlauf sowie eine Sondermass-Tag-Auswahl.
 * - Vorlaufliste erscheint als Overlay mit eigenem Paging; Produkt Vorlauf als Overlay ohne Paging.
 * - Home und Sidebar binden die neue Reports-Hauptansicht nur fuer Admin/Disponent ein.
 *
 * Fehlerfaelle:
 * - Reports ist nicht in Home oder Sidebar verdrahtet.
 * - Eine Report-Art laedt ohne expliziten Trigger oder mit falsch zugeordnetem Overlay/Paging.
 *
 * Ziel:
 * Die UI-Wiring-Regeln fuer beide Reports regressionssicher absichern.
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

  it("wires both report types, shared config, special-measure tag selection and report overlays", () => {
    expect(reportsPageSource).toContain("helpKey=\"reports.vorlaufliste\"");
    expect(reportsPageSource).toContain("type ReportType = \"vorlaufliste\" | \"product-vorlauf\";");
    expect(reportsPageSource).toContain("button-reports-type-vorlaufliste");
    expect(reportsPageSource).toContain("button-reports-type-product-vorlauf");
    expect(reportsPageSource).toContain("reports-type-switch");
    expect(reportsPageSource).toContain("Datum Ende anzeigen");
    expect(reportsPageSource).toContain("Datum Beginn");
    expect(reportsPageSource).toContain("Datum Ende");
    expect(reportsPageSource).toContain('type="date"');
    expect(reportsPageSource).toContain("Report erzeugen");
    expect(reportsPageSource).toContain("button-reports-generate");
    expect(reportsPageSource).toContain('header: "Tags"');
    expect(reportsPageSource).toContain("const REPORT_PAGE_SIZE = 100;");
    expect(reportsPageSource).toContain('queryKey: ["reports-vorlaufliste", submittedFilters, reportRequestId, page]');
    expect(reportsPageSource).toContain('queryKey: ["reports-product-vorlauf", submittedFilters, reportRequestId]');
    expect(reportsPageSource).toContain('enabled: submittedFilters?.reportType === "vorlaufliste" && isReportOverlayOpen');
    expect(reportsPageSource).toContain('enabled: submittedFilters?.reportType === "product-vorlauf" && isReportOverlayOpen');
    expect(reportsPageSource).toContain("<ReportConfigSurface");
    expect(reportsPageSource).toContain("reports.vorlaufliste.categorySelection");
    expect(reportsPageSource).toContain("reports.productVorlauf.selection");
    expect(reportsPageSource).toContain("checkbox-reports-${reportType}-product-category-${category.id}");
    expect(reportsPageSource).toContain("checkbox-reports-${reportType}-component-category-${category.id}");
    expect(reportsPageSource).toContain("select-reports-product-vorlauf-special-measure-tag");
    expect(reportsPageSource).toContain("Sondermass Kennzeichnung");
    expect(reportsPageSource).toContain("/api/tags");
    expect(reportsPageSource).toContain("reports-overlay");
    expect(reportsPageSource).toContain("reports-product-vorlauf-overlay");
    expect(reportsPageSource).toContain("button-reports-back");
    expect(reportsPageSource).toContain("button-reports-product-vorlauf-back");
    expect(reportsPageSource).toContain("setIsReportOverlayOpen(true)");
    expect(reportsPageSource).toContain("setReportRequestId((current) => current + 1)");
    expect(reportsPageSource).toContain("setIsReportOverlayOpen(false)");
    expect(reportsPageSource).toContain("stickyHeader");
    expect(reportsPageSource).toContain("<div className=\"border-t border-border px-6 py-4\">");
    expect(reportsPageSource).toContain("<ListPagingFooter");
    expect(reportsPageSource).toContain("reports-product-vorlauf-products");
    expect(reportsPageSource).toContain("reports-product-vorlauf-components");
    expect(reportsPageSource).toContain("reports-product-vorlauf-special-measures");
    expect(reportsPageSource).not.toContain("reports-product-vorlauf-page-prev");
  });

  it("registers reports view in home and sidebar for admin or dispatcher", () => {
    expect(homeSource).toContain("| \"reports\"");
    expect(homeSource).toContain("const canAccessReports = isAdmin || userRole === \"DISPATCHER\";");
    expect(homeSource).toContain("view === \"reports\" && canAccessReports");
    expect(sidebarSource).toContain("const canAccessReports = isAdmin || userRole?.toUpperCase() === \"DISPATCHER\";");
    expect(sidebarSource).toContain("label=\"Reports\"");
  });
});
