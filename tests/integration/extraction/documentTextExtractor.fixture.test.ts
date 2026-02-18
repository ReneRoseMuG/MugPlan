import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractTextFromPdfBuffer } from "../../../server/services/documentTextExtractor";

describe("PKG-08.1 Integration: document text extraction fixture", () => {
  it("extracts text from fixture pdf (Gotthardt Anke 163214 AB)", async () => {
    const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Gotthardt Anke 163214 AB.pdf");
    expect(fs.existsSync(fixturePath)).toBe(true);

    const pdfBuffer = fs.readFileSync(fixturePath);
    const text = await extractTextFromPdfBuffer(pdfBuffer);

    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain("Gotthardt");
    expect(text).toContain("163214");
    expect(text).toContain("Fasssauna.de");
  });
});
