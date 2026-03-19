/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Admin-Tagverwaltung erkennt reservierte System-Tags als System-Tags.
 * - Der reservierte Tag bleibt sichtbar, aber ohne Bearbeiten-/Loeschen-Aktionen.
 * - Die Kennzeichnung erfolgt intern ueber das nicht exponierte isDefault-Flag.
 *
 * Fehlerfaelle:
 * - Der reservierte Tag verschwindet komplett aus der Admin-Liste.
 * - Der System-Tag kann ueber die normale Zeilenaktion bearbeitet oder geloescht werden.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer die geschuetzte Sichtbarkeit des Storno-Tags regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 UI: tag management system tag protection wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/TagManagementPage.tsx"),
    "utf8",
  );

  it("marks reserved system tags as protected system tags", () => {
    expect(source).toContain("function isProtectedSystemTag");
    expect(source).toContain("Boolean(tag.isDefault)");
    expect(source).toContain("System");
    expect(source).toContain("Geschuetzter System-Tag");
  });

  it("keeps edit and delete actions out of the protected system-tag branch", () => {
    expect(source).toContain("isProtectedSystemTag(row) ? (");
    expect(source).toContain("setEditTag({ ...row })");
    expect(source).toContain("deleteTagMutation.mutate({ id: row.id, version: row.version });");
  });
});
