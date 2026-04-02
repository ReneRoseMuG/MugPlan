import { endOfISOWeek, format, getISOWeek, parseISO, startOfISOWeek } from "date-fns";

export type VorlauflistePrintColumn = {
  id: string;
  headerText: string;
  width: number;
  isIndicator?: boolean;
};

export type VorlauflistePrintRow = {
  projectId: number;
  actualDate: string;
};

export type VorlauflistePrintWeekSection<TRow extends VorlauflistePrintRow = VorlauflistePrintRow> = {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  continuedFromPrevious: boolean;
  rows: TRow[];
};

export type VorlauflistePrintPage<TRow extends VorlauflistePrintRow = VorlauflistePrintRow> = {
  pageIndex: number;
  pageNumber: number;
  totalPages: number;
  orientation: "landscape";
  columns: Array<VorlauflistePrintColumn & { scaledWidthPx: number }>;
  rows: TRow[];
  weekSections: Array<VorlauflistePrintWeekSection<TRow>>;
};

function scaleColumns(columns: VorlauflistePrintColumn[], availableWidthPx: number) {
  const indicatorColumns = columns.filter((column) => column.isIndicator);
  const contentColumns = columns.filter((column) => !column.isIndicator);
  const reservedIndicatorWidth = indicatorColumns.reduce((sum, column) => sum + Math.max(8, Math.round(column.width || 8)), 0);
  const contentWidth = Math.max(0, availableWidthPx - reservedIndicatorWidth);
  const totalContentWidth = contentColumns.reduce((sum, column) => sum + Math.max(1, Math.round(column.width || 1)), 0);
  const scaleFactor = totalContentWidth > 0 ? contentWidth / totalContentWidth : 1;

  return columns.map((column) => ({
    ...column,
    scaledWidthPx: column.isIndicator
      ? Math.max(8, Math.round(column.width || 8))
      : Math.max(1, Math.round((column.width || 1) * scaleFactor)),
  }));
}

function groupRowsByIsoWeek<TRow extends VorlauflistePrintRow>(rows: TRow[]) {
  const groups = new Map<string, {
    weekStart: string;
    weekEnd: string;
    weekNumber: number;
    rows: TRow[];
  }>();

  for (const row of rows) {
    const parsedDate = parseISO(row.actualDate);
    const weekStart = format(startOfISOWeek(parsedDate), "yyyy-MM-dd");
    const weekEnd = format(endOfISOWeek(parsedDate), "yyyy-MM-dd");
    const groupKey = `${weekStart}:${weekEnd}`;
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.rows.push(row);
      continue;
    }

    groups.set(groupKey, {
      weekStart,
      weekEnd,
      weekNumber: getISOWeek(parsedDate),
      rows: [row],
    });
  }

  return Array.from(groups.values());
}

export function buildVorlauflistePrintPages<TRow extends VorlauflistePrintRow>(params: {
  columns: VorlauflistePrintColumn[];
  rows: TRow[];
  rowsPerPage?: number;
  availableWidthPx?: number;
}): Array<VorlauflistePrintPage<TRow>> {
  const pageCapacityUnits = Math.max(2, Math.trunc(params.rowsPerPage ?? 20));
  if (params.rows.length === 0) return [];

  const scaledColumns = scaleColumns(params.columns, Math.max(1, Math.round(params.availableWidthPx ?? 1000)));
  const weekGroups = groupRowsByIsoWeek(params.rows);
  const pages: Array<VorlauflistePrintPage<TRow>> = [];

  let currentWeekSections: Array<VorlauflistePrintWeekSection<TRow>> = [];
  let currentRows: TRow[] = [];
  let usedUnits = 0;

  const flushPage = () => {
    if (currentWeekSections.length === 0) return;

    pages.push({
      pageIndex: pages.length,
      pageNumber: pages.length + 1,
      totalPages: 0,
      orientation: "landscape",
      columns: scaledColumns,
      rows: currentRows,
      weekSections: currentWeekSections,
    });

    currentWeekSections = [];
    currentRows = [];
    usedUnits = 0;
  };

  for (const weekGroup of weekGroups) {
    let rowIndex = 0;
    let continuedFromPrevious = false;

    while (rowIndex < weekGroup.rows.length) {
      if ((pageCapacityUnits - usedUnits) <= 1) {
        flushPage();
      }

      const availableRowSlots = pageCapacityUnits - usedUnits - 1;
      if (availableRowSlots <= 0) {
        flushPage();
        continue;
      }

      const nextRows = weekGroup.rows.slice(rowIndex, rowIndex + availableRowSlots);
      currentWeekSections.push({
        weekStart: weekGroup.weekStart,
        weekEnd: weekGroup.weekEnd,
        weekNumber: weekGroup.weekNumber,
        continuedFromPrevious,
        rows: nextRows,
      });
      currentRows = [...currentRows, ...nextRows];
      usedUnits += nextRows.length + 1;
      rowIndex += nextRows.length;
      continuedFromPrevious = true;

      if (rowIndex < weekGroup.rows.length) {
        flushPage();
      }
    }
  }

  flushPage();

  return pages.map((page, index) => ({
    ...page,
    pageIndex: index,
    pageNumber: index + 1,
    totalPages: pages.length,
  }));
}
