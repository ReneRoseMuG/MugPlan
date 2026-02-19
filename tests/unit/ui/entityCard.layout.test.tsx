/**
 * Test Scope:
 *
 * Feature: FT17 - Template-System fuer EntityCards
 * Use Case: UC Globales EntityCard Layout fuer alle Domain-Card-Views
 *
 * Abgedeckte Regeln:
 * - Header ist global schmaler und nutzt reduzierte vertikale Abstaende.
 * - Footer bleibt im Renderpfad erhalten, ist jedoch visuell ausgeblendet.
 * - ColoredEntityCard vererbt das Layoutverhalten unveraendert ueber EntityCard.
 *
 * Fehlerfaelle:
 * - Header verwendet weiterhin altes Padding und bleibt zu hoch.
 * - Footer wird sichtbar gerendert oder vollstaendig entfernt.
 * - ColoredEntityCard weicht vom EntityCard-Layout ab.
 *
 * Ziel:
 * Sicherstellen, dass die globale Layoutaenderung der EntityCard konsistent fuer alle abgeleiteten Karten gilt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT17 UI: EntityCard global layout", () => {
  const entityCardPath = path.resolve(process.cwd(), "client/src/components/ui/entity-card.tsx");
  const coloredEntityCardPath = path.resolve(process.cwd(), "client/src/components/ui/colored-entity-card.tsx");
  const entityCardSource = readFileSync(entityCardPath, "utf8");
  const coloredEntityCardSource = readFileSync(coloredEntityCardPath, "utf8");

  it("renders header with reduced vertical padding", () => {
    expect(entityCardSource).toContain("px-4 py-1.5 border-b border-border flex items-center justify-between gap-2");
  });

  it("keeps footer in markup but hides it visually", () => {
    expect(entityCardSource).toContain("{footer && (");
    expect(entityCardSource).toContain("footerVisibility?: \"hidden\" | \"visible\";");
    expect(entityCardSource).toContain("footerVisibility = \"hidden\"");
    expect(entityCardSource).toContain("`${footerVisibility === \"visible\" ? \"flex\" : \"hidden\"}");
    expect(entityCardSource).toContain("{footer}");
  });

  it("applies the same hidden footer behavior through ColoredEntityCard", () => {
    expect(coloredEntityCardSource).toContain("<EntityCard");
    expect(coloredEntityCardSource).toContain("footer={footer}");
    expect(coloredEntityCardSource).toContain("footerVisibility={footerVisibility}");
  });
});
