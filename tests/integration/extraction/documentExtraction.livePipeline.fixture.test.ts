/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Service-Pipeline mit Fixture-PDF ohne KI
 *
 * Abgedeckte Regeln:
 * - extractFromPdf verarbeitet Fixture-PDF im Scope project_form deterministisch.
 * - extractFromPdf verarbeitet Fixture-PDF im Scope appointment_form deterministisch.
 * - Ergebnis enthaelt Pflichtstruktur fuer Kunde und Artikelliste.
 *
 * Fehlerfaelle:
 * - Marker oder Pflichtfelder im Dokument sind nicht extrahierbar -> kontrollierter Fehler.
 *
 * Ziel:
 * Absicherung der echten FT21-Servicepipeline (PDF-Text + deterministische Parser + Validator) ohne KI-Abhaengigkeit.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Gotthardt Anke 163214 AB.pdf");

describe("FT21 integration: deterministic extraction pipeline fixture", () => {
  it("runs deterministic extraction pipeline for project_form", async () => {
    const fileBuffer = fs.readFileSync(fixturePath);
    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer,
    });

    expect(result.customer.customerNumber).toBe("163214");
    expect(result.customer.firstName).toBe("Anke");
    expect(result.customer.lastName).toBe("Gotthardt");
    expect(result.customer.phone).toBe("0172-8811909");
    expect(result.articleItems.length).toBeGreaterThan(0);
    expect(result.articleListHtml.trim().length).toBeGreaterThan(0);
  });

  it("runs deterministic extraction pipeline for appointment_form", async () => {
    const fileBuffer = fs.readFileSync(fixturePath);
    const result = await extractFromPdf({
      scope: "appointment_form",
      fileBuffer,
    });

    expect(result.customer.customerNumber).toBe("163214");
    expect(Array.isArray(result.categorizedItems)).toBe(true);
    expect(result.articleItems.every((item) => item.description.trim().length > 0)).toBe(true);
    expect(result.articleItems.map((item) => item.description).join(" ")).not.toMatch(/EUR|€|MwSt|Brutto|Netto/i);
  });
});

