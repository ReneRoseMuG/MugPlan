import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPage = vi.fn();
const mockLoadingTaskDestroy = vi.fn();
const mockGetDocument = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

import { extractTextFromPdfBuffer } from "../../../server/services/documentTextExtractor";

describe("documentTextExtractor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadingTaskDestroy.mockResolvedValue(undefined);
  });

  it("extracts and normalizes text across pages", async () => {
    mockGetPage.mockImplementation(async (pageNumber: number) => {
      if (pageNumber === 1) {
        return {
          getTextContent: async () => ({
            items: [
              { str: "Auftrag", hasEOL: false },
              { str: "163214", hasEOL: true },
            ],
          }),
        };
      }
      return {
        getTextContent: async () => ({
          items: [
            { str: "Kunde", hasEOL: false },
            { str: "Gotthardt", hasEOL: false },
          ],
        }),
      };
    });

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: mockGetPage,
      }),
      destroy: mockLoadingTaskDestroy,
    });

    const text = await extractTextFromPdfBuffer(Buffer.from("dummy"));
    expect(text).toContain("Auftrag");
    expect(text).toContain("163214");
    expect(text).toContain("Gotthardt");
  });

  it("throws deterministic error when no extractable text exists", async () => {
    mockGetPage.mockResolvedValue({
      getTextContent: async () => ({
        items: [{ str: "   ", hasEOL: false }],
      }),
    });

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: mockGetPage,
      }),
      destroy: mockLoadingTaskDestroy,
    });

    await expect(extractTextFromPdfBuffer(Buffer.from("dummy"))).rejects.toThrow(
      "Dokument enthält keinen extrahierbaren Text",
    );
  });
});
