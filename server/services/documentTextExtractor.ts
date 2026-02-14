import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type TextContentLike = {
  items: Array<{
    str?: string;
    hasEOL?: boolean;
  }>;
};

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
  } as any);

  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = (await page.getTextContent()) as TextContentLike;
      for (const item of textContent.items) {
        const text = (item.str ?? "").trim();
        if (text.length > 0) {
          parts.push(text);
        }
        if (item.hasEOL) {
          parts.push("\n");
        }
      }
      parts.push("\n\n");
    }
  } finally {
    await loadingTask.destroy();
  }

  const text = normalizeWhitespace(parts.join(" "));
  if (text.length === 0) {
    throw new Error("Dokument enthält keinen extrahierbaren Text");
  }
  return text;
}
