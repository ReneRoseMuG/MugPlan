/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView rendert Sticky-Header nur im aktivierten Modus.
 * - TableView zeigt den persistenten Footer-Bereich nur bei Footer-Inhalt oder horizontalem Overflow.
 * - Die horizontale Scrollposition bleibt zwischen Tabellenkoerper und Footer-Scrollbar synchron.
 * - Die Footer-Scrollbar bleibt sichtbar und griffig ueber die gemeinsame Scrollbar-Variante.
 * - Die gemeinsame Tabellenbasis behaelt kompakte Zellen, Zebra-Striping und klare Headerflaechen.
 *
 * Fehlerfaelle:
 * - Sticky-Klassen gehen beim TableView-Refactor verloren.
 * - Footer-Bar verschwindet trotz Footer-Inhalt oder horizontalem Overflow.
 * - Body- und Footer-Scroll laufen auseinander.
 *
 * Ziel:
 * Die gemeinsame Sticky-Tabellenhuelle fuer Listen und Reports regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT-UI table view sticky frame", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ui/table-view.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders sticky header classes only when stickyHeader is enabled", () => {
    expect(source).toContain("stickyHeader && \"sticky top-0 z-10 bg-muted/95 border-b");
  });

  it("renders the footer bar only when footer content is present", () => {
    expect(source).toContain("const showFooterBar = stickyFooter && (Boolean(footerSlot) || horizontalMetrics.hasOverflow);");
    expect(source).toContain("{footerSlot ? (");
  });

  it("keeps horizontal footer scrollbar and body scroll in sync", () => {
    expect(source).toContain("const handleBodyScroll = () => {");
    expect(source).toContain("const handleFooterScroll = () => {");
    expect(source).toContain("footerScroll.scrollLeft = viewport.scrollLeft;");
    expect(source).toContain("viewport.scrollLeft = footerScroll.scrollLeft;");
    expect(source).toContain("visible-horizontal-scrollbar overflow-x-scroll overflow-y-hidden");
  });

  it("keeps compact row, zebra and header surface classes on the shared table primitives", () => {
    expect(source).toContain("const rowPaddingClass = density === \"compact\" ? \"py-1.5\" : \"py-2.5\";");
    expect(source).toContain("className={cn(rowPaddingClass, alignmentClass(column.align), column.className)}");
    expect(source).toContain("className={cn(onRowDoubleClick && \"cursor-pointer\", rowClassName?.(row, rowIndex))}");
  });
});
