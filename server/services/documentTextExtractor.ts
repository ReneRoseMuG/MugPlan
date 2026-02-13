function decodePdfEscapes(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractStringsFromArrayOperator(value: string): string[] {
  const matches = value.match(/\((?:\\.|[^\\()])*\)/g);
  if (!matches) return [];
  return matches.map((entry) => decodePdfEscapes(entry.slice(1, -1)));
}

export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const parts: string[] = [];

  const tjPattern = /\((?:\\.|[^\\()])*\)\s*Tj/g;
  let tjMatch: RegExpExecArray | null = tjPattern.exec(content);
  while (tjMatch) {
    const raw = tjMatch[0];
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start !== -1 && end > start) {
      const decoded = decodePdfEscapes(raw.slice(start + 1, end));
      if (decoded.trim().length > 0) {
        parts.push(decoded);
      }
    }
    tjMatch = tjPattern.exec(content);
  }

  const tjArrayPattern = /\[([\s\S]*?)\]\s*TJ/g;
  let tjArrayMatch: RegExpExecArray | null = tjArrayPattern.exec(content);
  while (tjArrayMatch) {
    const group = tjArrayMatch[1];
    const strings = extractStringsFromArrayOperator(group);
    for (const value of strings) {
      if (value.trim().length > 0) {
        parts.push(value);
      }
    }
    tjArrayMatch = tjArrayPattern.exec(content);
  }

  const text = normalizeWhitespace(parts.join("\n"));
  if (text.length === 0) {
    throw new Error("Dokument enthält keinen extrahierbaren Text");
  }
  return text;
}
