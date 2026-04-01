/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projekt-Extraktion kann die reale PDF-Fixture mit auslaendischer Adresse vollstaendig verarbeiten.
 * - Eine fuehrende Hausnummer in der Strassenzeile wird deterministisch erkannt.
 * - Die explizite Laenderzeile wird in `country` und den Feldreport uebernommen.
 *
 * Fehlerfaelle:
 * - Die reale Fixture fuehrt weiterhin zu einem Komplettabbruch im project_form-Extract.
 * - Strasse oder Land gehen trotz gueltigem Auslandsadressblock verloren.
 *
 * Ziel:
 * Die echte PDF-Fixture als Regression fuer Auslandsadresse und `country` im project_form-Extract absichern.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

describe("FT21 integration: project extraction fixture with foreign customer address", () => {
  it("extracts order data from the Tom Voosen fixture including street and country", async () => {
    const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Tom Voosen 160673 A0218277A.pdf");
    expect(fs.existsSync(fixturePath)).toBe(true);

    const pdfBuffer = fs.readFileSync(fixturePath);
    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: pdfBuffer,
    });

    expect(result.customer.customerNumber).toBe("160673");
    expect(result.customer.firstName).toBe("Tom");
    expect(result.customer.lastName).toBe("Voosen");
    expect(result.customer.phone).toBe("00352-621222479");
    expect(result.customer.addressLine1).toBe("1 Tommesknapp");
    expect(result.customer.postalCode).toBe("7419");
    expect(result.customer.city).toBe("Brouch");
    expect(result.customer.country).toBe("Luxemburg");
    expect(result.orderNumber).toBe("A0218277A");
    expect(result.amount).toBe("19515.00");
    expect(result.saunaModel).toBe("Exklusiv Sauna");
    expect(result.articleItems.length).toBeGreaterThan(5);
    expect(result.warnings).toEqual([]);
    expect(result.fieldReport.recognized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "orderNumber", value: "A0218277A" }),
        expect.objectContaining({ key: "amount", value: "19515.00" }),
        expect.objectContaining({ key: "addressLine1", value: "1 Tommesknapp" }),
        expect.objectContaining({ key: "postalCode", value: "7419" }),
        expect.objectContaining({ key: "country", value: "Luxemburg" }),
      ]),
    );
    expect(result.fieldReport.missing.some((item) => item.key === "addressLine1")).toBe(false);
    expect(result.fieldReport.missing.some((item) => item.key === "country")).toBe(false);
  });
});
