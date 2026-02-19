/**
 * Test Scope:
 *
 * Feature: FT03 - Vorschau- und Kalenderverhalten
 * Use Case: UC03 - TableView Preview-Optionen aus InfoBadgePreview
 *
 * Abgedeckte Regeln:
 * - TableView akzeptiert rowPreviewRenderer mit ReactNode oder InfoBadgePreview.
 * - TableView leitet InfoBadgePreview-Optionen (openDelay/side/align/maxWidth/maxHeight) an HoverPreview weiter.
 * - TableView mappt scrollY auf den Overflow-Container analog zu InfoBadge.
 *
 * Fehlerfaelle:
 * - Optionen aus createAppointmentWeeklyPanelPreview gehen in Tabellen-Previews verloren.
 *
 * Ziel:
 * Sicherstellen, dass Tabellen-Previews Weekly-Optionen korrekt uebernehmen.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT03 table view info badge preview options wiring", () => {
  it("supports InfoBadgePreview as rowPreviewRenderer return type", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/table-view.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("rowPreviewRenderer?: (row: T, rowIndex: number) => ReactNode | InfoBadgePreview;");
    expect(source).toContain("function isInfoBadgePreview(");
  });

  it("forwards InfoBadgePreview options into HoverPreview", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/table-view.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("openDelay={previewOptions.openDelayMs}");
    expect(source).toContain("side={previewOptions.side}");
    expect(source).toContain("align={previewOptions.align}");
    expect(source).toContain("maxWidth={previewOptions.maxWidth}");
    expect(source).toContain("maxHeight={previewOptions.maxHeight}");
    expect(source).toContain('className={previewOptions.scrollY === "auto" ? "overflow-y-auto" : undefined}');
  });
});
