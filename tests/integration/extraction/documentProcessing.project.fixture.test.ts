/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projekt-Extraktion kann die reale PDF-Fixture mit partiell lesbarer Kundenadresse verarbeiten.
 * - Projektdaten bleiben trotz fehlender Strassenzeile extrahierbar.
 * - Der Konfliktfall wird ueber Warning und Feldreport transparent markiert.
 *
 * Fehlerfaelle:
 * - Die reale Fixture fuehrt weiterhin zu einem Komplettabbruch im project_form-Extract.
 * - Warning oder Missing-Report fuer die Strassenzeile gehen verloren.
 *
 * Ziel:
 * Die echte PDF-Fixture als Regression fuer den aktuellen Projekt-Konfliktfall absichern.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

describe("FT21 integration: project extraction fixture with partial customer address", () => {
  it("extracts order data from the Tom Voosen fixture and marks the address as partial", async () => {
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
    expect(result.customer.addressLine1).toBeNull();
    expect(result.customer.postalCode).toBe("7419");
    expect(result.customer.city).toBe("Brouch");
    expect(result.orderNumber).toBe("A0218277A");
    expect(result.amount).toBe("19515.00");
    expect(result.saunaModel).toBe("Exklusiv Sauna");
    expect(result.articleItems.length).toBeGreaterThan(5);
    expect(result.warnings).toEqual([
      "Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.",
    ]);
    expect(result.fieldReport.recognized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "orderNumber", value: "A0218277A" }),
        expect.objectContaining({ key: "amount", value: "19515.00" }),
        expect.objectContaining({ key: "postalCode", value: "7419" }),
      ]),
    );
    expect(result.fieldReport.missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "addressLine1", reason: "Keine Strassenzeile erkannt." }),
      ]),
    );
  });
});
