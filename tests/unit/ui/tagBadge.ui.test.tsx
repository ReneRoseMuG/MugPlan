/**
 * Test Scope:
 *
 * Feature: FT28 - Tagging System
 *
 * Abgedeckte Regeln:
 * - TagBadge nutzt die gemeinsame trimTagLabel-Logik fuer das sichtbare Kurzlabel.
 * - TagBadge bindet immer eine Hover-Preview mit dem vollen Tag-Namen an.
 * - TagBadge kann optional Add-/Remove-Aktionen ueber ColoredInfoBadge durchreichen.
 *
 * Fehlerfaelle:
 * - Tag-Badges zeigen den Volltext statt des vereinbarten Kurzlabels.
 * - Hover-Preview oder Remove-Action gehen in abgeleiteten Badge-Komponenten verloren.
 *
 * Ziel:
 * Die feste Badge-Verdrahtung fuer das neue Tag-Badge regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 tag badge wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/tag-badge.tsx"),
    "utf8",
  );

  it("uses the shared short-label helper and tag preview factory", () => {
    expect(source).toContain("trimTagLabel(tag.name)");
    expect(source).toContain("preview={createTagBadgePreview(tag.name)}");
  });

  it("forwards add and remove actions through the shared colored badge base", () => {
    expect(source).toContain("action={action}");
    expect(source).toContain("onAdd={onAdd}");
    expect(source).toContain("onRemove={onRemove}");
  });
});
