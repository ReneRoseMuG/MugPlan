import { randomUUID } from "crypto";
import * as XLSX from "xlsx";

export const SAUNA_TOUR_PREVIEW_LIMITS = {
  maxUploadBytes: 50 * 1024 * 1024,
  initialLimit: 60,
  maxChunkLimit: 500,
  sessionTtlMs: 30 * 60 * 1000,
} as const;

type SupportedYear = "2025" | "2026";

type WeekRow = {
  rowIndex: number;
  cells: string[];
};

type WeekPreview = {
  weekId: string;
  startDate: string;
  endDate: string;
  startColumn: number;
  endColumn: number;
  rows: WeekRow[];
};

type YearPreview = {
  year: SupportedYear;
  weeks: WeekPreview[];
};

type PreviewSession = {
  createdAt: number;
  years: Record<SupportedYear, YearPreview>;
};

type ChunkResult = {
  year: SupportedYear;
  weekId: string;
  offset: number;
  limit: number;
  totalRows: number;
  hasMore: boolean;
  nextOffset: number;
  rows: WeekRow[];
};

const REQUIRED_YEARS: SupportedYear[] = ["2025", "2026"];
const sessionStore = new Map<string, PreviewSession>();

export class SaunaTourPreviewError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  sessionStore.forEach((session, sessionId) => {
    if (now - session.createdAt > SAUNA_TOUR_PREVIEW_LIMITS.sessionTtlMs) {
      sessionStore.delete(sessionId);
    }
  });
}

function normalizeToIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 20000 && value <= 90000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const datePattern = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/;
  const match = trimmed.match(datePattern);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toCellDisplay(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return normalizeToIsoDate(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toSheetRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  }) as unknown[][];
}

function detectDateRowIndex(rows: unknown[][]): number {
  let bestIndex = -1;
  let bestScore = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const maxColumns = Math.min(row.length, 500);
    let dateCount = 0;

    for (let col = 0; col < maxColumns; col += 1) {
      if (parseDateValue(row[col]) !== null) {
        dateCount += 1;
      }
    }

    if (dateCount > bestScore) {
      bestScore = dateCount;
      bestIndex = rowIndex;
    }
  }

  if (bestIndex === -1 || bestScore < 3) {
    throw new SaunaTourPreviewError(422, "PREVIEW_PARSE_FAILED", "Keine belastbare Datumszeile erkannt.");
  }

  return bestIndex;
}

function findLastUsedRow(rows: unknown[][], startColumn: number, endColumn: number): number {
  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = rows[rowIndex] ?? [];
    for (let col = startColumn; col <= endColumn; col += 1) {
      const value = row[col];
      if (value != null && String(value).trim().length > 0) {
        return rowIndex;
      }
    }
  }
  return 0;
}

function buildWeekRows(rows: unknown[][], startColumn: number, endColumn: number): WeekRow[] {
  const lastUsedRow = findLastUsedRow(rows, startColumn, endColumn);
  const result: WeekRow[] = [];

  for (let rowIndex = 0; rowIndex <= lastUsedRow; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const cells: string[] = [];
    for (let col = startColumn; col <= endColumn; col += 1) {
      cells.push(toCellDisplay(row[col]));
    }
    result.push({ rowIndex, cells });
  }

  return result;
}

function detectWeeksForYear(year: SupportedYear, rows: unknown[][]): WeekPreview[] {
  const dateRowIndex = detectDateRowIndex(rows);
  const dateRow = rows[dateRowIndex] ?? [];
  let firstDateColumn = -1;

  for (let col = 0; col < dateRow.length; col += 1) {
    if (parseDateValue(dateRow[col]) !== null) {
      firstDateColumn = col;
      break;
    }
  }

  if (firstDateColumn < 0) {
    throw new SaunaTourPreviewError(422, "PREVIEW_PARSE_FAILED", `Keine Datumsspalte im Blatt ${year} gefunden.`);
  }

  const weeks: WeekPreview[] = [];
  let currentColumn = firstDateColumn;
  let weekCounter = 1;

  while (currentColumn < dateRow.length) {
    const startDate = parseDateValue(dateRow[currentColumn]);
    if (!startDate) break;

    let probeColumn = currentColumn;
    let lastDateColumn = currentColumn;
    let endDate = startDate;
    let foundSunday = false;

    while (probeColumn < dateRow.length) {
      const currentDate = parseDateValue(dateRow[probeColumn]);
      if (!currentDate) break;
      lastDateColumn = probeColumn;
      endDate = currentDate;
      if (currentDate.getDay() === 0) {
        foundSunday = true;
        break;
      }
      probeColumn += 1;
    }

    const endColumn = lastDateColumn;
    const rowsForWeek = buildWeekRows(rows, currentColumn, endColumn);
    weeks.push({
      weekId: `${year}-w${weekCounter}`,
      startDate: normalizeToIsoDate(startDate),
      endDate: normalizeToIsoDate(endDate),
      startColumn: currentColumn + 1,
      endColumn: endColumn + 1,
      rows: rowsForWeek,
    });
    weekCounter += 1;

    if (!foundSunday) break;
    currentColumn = endColumn + 1;
  }

  if (weeks.length === 0) {
    throw new SaunaTourPreviewError(422, "PREVIEW_PARSE_FAILED", `Keine Wochen im Blatt ${year} erkannt.`);
  }

  return weeks;
}

function buildChunk(week: WeekPreview, year: SupportedYear, offset: number, limit: number): ChunkResult {
  const normalizedOffset = Math.max(0, offset);
  const normalizedLimit = Math.max(1, Math.min(limit, SAUNA_TOUR_PREVIEW_LIMITS.maxChunkLimit));
  const totalRows = week.rows.length;
  const rows = week.rows.slice(normalizedOffset, normalizedOffset + normalizedLimit);
  const nextOffset = normalizedOffset + rows.length;

  return {
    year,
    weekId: week.weekId,
    offset: normalizedOffset,
    limit: normalizedLimit,
    totalRows,
    hasMore: nextOffset < totalRows,
    nextOffset,
    rows,
  };
}

function getSession(sessionId: string): PreviewSession {
  cleanupExpiredSessions();
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new SaunaTourPreviewError(404, "PREVIEW_SESSION_NOT_FOUND", "Preview-Session nicht gefunden oder abgelaufen.");
  }
  return session;
}

function resolveWeek(session: PreviewSession, year: SupportedYear, weekId: string): WeekPreview {
  const yearEntry = session.years[year];
  const week = yearEntry.weeks.find((entry) => entry.weekId === weekId);
  if (!week) {
    throw new SaunaTourPreviewError(422, "VALIDATION_ERROR", "Angeforderte Woche wurde nicht gefunden.");
  }
  return week;
}

function assertSupportedFile(filename: string): void {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".ods") && !lower.endsWith(".xlsx")) {
    throw new SaunaTourPreviewError(422, "UNSUPPORTED_FILE_TYPE", "Nur .ods und .xlsx werden unterstuetzt.");
  }
}

export async function createSaunaTourPreview(input: {
  filename: string;
  buffer: Buffer;
}): Promise<{
  previewSessionId: string;
  years: Array<{
    year: SupportedYear;
    weeks: Array<{
      weekId: string;
      startDate: string;
      endDate: string;
      startColumn: number;
      endColumn: number;
      totalRows: number;
    }>;
  }>;
  initialChunk: ChunkResult;
}> {
  cleanupExpiredSessions();
  assertSupportedFile(input.filename);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(input.buffer, {
      type: "buffer",
      cellDates: true,
      dense: false,
    });
  } catch {
    throw new SaunaTourPreviewError(422, "PREVIEW_PARSE_FAILED", "Datei konnte nicht als Tabelle gelesen werden.");
  }

  const missingSheets = REQUIRED_YEARS.filter((year) => !workbook.Sheets[year]);
  if (missingSheets.length > 0) {
    throw new SaunaTourPreviewError(
      422,
      "MISSING_REQUIRED_SHEETS",
      `Fehlende Jahresblaetter: ${missingSheets.join(", ")}.`,
    );
  }

  const yearsRecord = {} as Record<SupportedYear, YearPreview>;

  for (const year of REQUIRED_YEARS) {
    const sheet = workbook.Sheets[year];
    const rows = toSheetRows(sheet);
    yearsRecord[year] = {
      year,
      weeks: detectWeeksForYear(year, rows),
    };
  }

  const firstYear = REQUIRED_YEARS[0];
  const firstWeek = yearsRecord[firstYear].weeks[0];
  const previewSessionId = randomUUID();

  sessionStore.set(previewSessionId, {
    createdAt: Date.now(),
    years: yearsRecord,
  });

  return {
    previewSessionId,
    years: REQUIRED_YEARS.map((year) => ({
      year,
      weeks: yearsRecord[year].weeks.map((week) => ({
        weekId: week.weekId,
        startDate: week.startDate,
        endDate: week.endDate,
        startColumn: week.startColumn,
        endColumn: week.endColumn,
        totalRows: week.rows.length,
      })),
    })),
    initialChunk: buildChunk(firstWeek, firstYear, 0, SAUNA_TOUR_PREVIEW_LIMITS.initialLimit),
  };
}

export async function getSaunaTourPreviewWeekRows(input: {
  previewSessionId: string;
  year: SupportedYear;
  weekId: string;
  offset: number;
  limit: number;
}): Promise<ChunkResult> {
  const session = getSession(input.previewSessionId);
  const week = resolveWeek(session, input.year, input.weekId);
  return buildChunk(week, input.year, input.offset, input.limit);
}

export async function cleanupSaunaTourPreviewSession(previewSessionId: string): Promise<void> {
  cleanupExpiredSessions();
  sessionStore.delete(previewSessionId);
}
