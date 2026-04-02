export type VorlauflistePrintColumn = {
  id: string;
  headerText: string;
  width: number;
  isIndicator?: boolean;
};

export type VorlauflistePrintRow = {
  projectId: number;
};

export type VorlauflistePrintPage = {
  pageIndex: number;
  pageNumber: number;
  totalPages: number;
  orientation: "landscape";
  columns: Array<VorlauflistePrintColumn & { scaledWidthPx: number }>;
  rows: VorlauflistePrintRow[];
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

export function buildVorlauflistePrintPages<TRow extends VorlauflistePrintRow>(params: {
  columns: VorlauflistePrintColumn[];
  rows: TRow[];
  rowsPerPage?: number;
  availableWidthPx?: number;
}): Array<Omit<VorlauflistePrintPage, "rows"> & { rows: TRow[] }> {
  const rowsPerPage = Math.max(1, Math.trunc(params.rowsPerPage ?? 20));
  if (params.rows.length === 0) return [];

  const scaledColumns = scaleColumns(params.columns, Math.max(1, Math.round(params.availableWidthPx ?? 1000)));
  const totalPages = Math.ceil(params.rows.length / rowsPerPage);
  const pages: Array<Omit<VorlauflistePrintPage, "rows"> & { rows: TRow[] }> = [];

  for (let index = 0; index < totalPages; index += 1) {
    const pageRows = params.rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage);
    pages.push({
      pageIndex: index,
      pageNumber: index + 1,
      totalPages,
      orientation: "landscape",
      columns: scaledColumns,
      rows: pageRows,
    });
  }

  return pages;
}
