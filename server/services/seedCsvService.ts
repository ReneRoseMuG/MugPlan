function escapeCsvValue(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function parseCsvRow(row: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === "\"") {
      if (inQuotes && row[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (inQuotes) {
    throw new Error("INVALID_CSV_FORMAT");
  }

  values.push(current);
  return values;
}

export function parseCsv(content: string): Array<Record<string, string>> {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headerValues = parseCsvRow(lines[0], ";").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const rowValues = parseCsvRow(line, ";");
    const row: Record<string, string> = {};
    for (let index = 0; index < headerValues.length; index += 1) {
      row[headerValues[index]] = (rowValues[index] ?? "").trim();
    }
    return row;
  });
}

export function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(";"),
    ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(";")),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseBooleanFlag(value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "ja", "yes", "aktiv"].includes(normalized)) return true;
  if (["false", "0", "nein", "no", "inaktiv"].includes(normalized)) return false;
  return fallback;
}
