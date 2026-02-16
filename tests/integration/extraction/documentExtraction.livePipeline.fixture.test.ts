/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Live-KI-Pipeline auf Service-Ebene
 *
 * Abgedeckte Regeln:
 * - extractFromPdf verarbeitet Fixture-PDF im Scope project_form.
 * - extractFromPdf verarbeitet Fixture-PDF im Scope appointment_form.
 * - Ergebnis enthält minimale Pflichtstruktur.
 *
 * Fehlerfaelle:
 * - Lokale KI oder Modell nicht erreichbar -> reproduzierbarer Testfehler.
 *
 * Ziel:
 * Absicherung der echten Service-Pipeline (Text-Extraktion + KI + Validator).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Gotthardt Anke 163214 AB.pdf");
const LIVE_AI_TEST_TIMEOUT_MS = 300_000;

describe("FT20 integration: live extraction pipeline fixture", () => {
  it("runs full live extraction pipeline for project_form", async () => {
    const fileBuffer = fs.readFileSync(fixturePath);
    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer,
    });

    expect(result.customer.customerNumber.trim().length).toBeGreaterThan(0);
    expect(result.saunaModel.trim().length).toBeGreaterThan(0);
    expect(result.articleItems.length).toBeGreaterThan(0);
    expect(result.articleListHtml.trim().length).toBeGreaterThan(0);
  }, LIVE_AI_TEST_TIMEOUT_MS);

  it("runs full live extraction pipeline for appointment_form", async () => {
    const fileBuffer = fs.readFileSync(fixturePath);
    const result = await extractFromPdf({
      scope: "appointment_form",
      fileBuffer,
    });

    expect(result.customer.customerNumber.trim().length).toBeGreaterThan(0);
    expect(result.saunaModel.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(result.categorizedItems)).toBe(true);
  }, LIVE_AI_TEST_TIMEOUT_MS);
});
