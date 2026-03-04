import { useMemo, useState } from "react";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SupportedYear = "2025" | "2026";
type ViewMode = "full" | "week";

type WeekMeta = {
  weekId: string;
  startDate: string;
  endDate: string;
  startColumn: number;
  endColumn: number;
  totalRows: number;
};

type YearData = {
  year: SupportedYear;
  rowCount: number;
  columnCount: number;
  weeks: WeekMeta[];
};

type SheetRow = {
  rowIndex: number;
  cells: string[];
};

type SheetChunk = {
  year: SupportedYear;
  offset: number;
  limit: number;
  totalRows: number;
  hasMore: boolean;
  nextOffset: number;
  columnCount: number;
  rows: SheetRow[];
};

type UploadResponse = {
  previewSessionId: string;
  years: YearData[];
  initialSheetChunk: SheetChunk;
};

type SheetState = {
  rows: SheetRow[];
  totalRows: number;
  nextOffset: number;
  hasMore: boolean;
  loadingMore: boolean;
  columnCount: number;
};

function getColumnLabel(columnIndex: number): string {
  let index = columnIndex + 1;
  let label = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    index = Math.floor((index - 1) / 26);
  }
  return label;
}

export function SaunaTourImportPreviewPanel() {
  const [isWorking, setIsWorking] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [years, setYears] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<SupportedYear | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [sheetStates, setSheetStates] = useState<Record<SupportedYear, SheetState | undefined>>({
    "2025": undefined,
    "2026": undefined,
  });

  const selectedYearData = useMemo(
    () => years.find((entry) => entry.year === selectedYear) ?? null,
    [years, selectedYear],
  );

  const selectedWeekMeta = useMemo(
    () => selectedYearData?.weeks.find((week) => week.weekId === selectedWeekId) ?? null,
    [selectedWeekId, selectedYearData],
  );

  const selectedSheetState = selectedYear ? sheetStates[selectedYear] ?? null : null;

  const resetWorkingState = () => {
    setViewMode("full");
    setSelectedFile(null);
    setIsUploading(false);
    setError(null);
    setPreviewSessionId(null);
    setYears([]);
    setSelectedYear(null);
    setSelectedWeekId(null);
    setSheetStates({
      "2025": undefined,
      "2026": undefined,
    });
  };

  const cleanupSession = async () => {
    if (!previewSessionId) return;
    try {
      await fetch(api.admin.saunaTourImportPreviewCleanup.path, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ previewSessionId }),
      });
    } catch {
      // Cleanup is best-effort.
    }
  };

  const handleCancel = async () => {
    await cleanupSession();
    resetWorkingState();
    setIsWorking(false);
  };

  const readErrorMessage = async (response: Response): Promise<string> => {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    if (payload?.message) return payload.message;
    return "Vorschau konnte nicht erstellt werden.";
  };

  const fetchSheetChunk = async (year: SupportedYear, offset: number, limit: number): Promise<SheetChunk> => {
    if (!previewSessionId) {
      throw new Error("Preview-Session fehlt.");
    }
    const response = await fetch(api.admin.saunaTourImportPreviewSheetRows.path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previewSessionId,
        year,
        offset,
        limit,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    return await response.json() as SheetChunk;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(null);
    setIsUploading(true);
    try {
      await cleanupSession();
      const body = new FormData();
      body.append("file", selectedFile);

      const response = await fetch(api.admin.saunaTourImportPreview.path, {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const payload = await response.json() as UploadResponse;
      setPreviewSessionId(payload.previewSessionId);
      setYears(payload.years);
      setSelectedYear(payload.initialSheetChunk.year);
      const firstWeek = payload.years.find((entry) => entry.year === payload.initialSheetChunk.year)?.weeks[0];
      setSelectedWeekId(firstWeek?.weekId ?? null);
      setSheetStates({
        "2025": payload.initialSheetChunk.year === "2025" ? {
          rows: payload.initialSheetChunk.rows,
          totalRows: payload.initialSheetChunk.totalRows,
          nextOffset: payload.initialSheetChunk.nextOffset,
          hasMore: payload.initialSheetChunk.hasMore,
          loadingMore: false,
          columnCount: payload.initialSheetChunk.columnCount,
        } : undefined,
        "2026": payload.initialSheetChunk.year === "2026" ? {
          rows: payload.initialSheetChunk.rows,
          totalRows: payload.initialSheetChunk.totalRows,
          nextOffset: payload.initialSheetChunk.nextOffset,
          hasMore: payload.initialSheetChunk.hasMore,
          loadingMore: false,
          columnCount: payload.initialSheetChunk.columnCount,
        } : undefined,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Vorschau konnte nicht erstellt werden.");
    } finally {
      setIsUploading(false);
    }
  };

  const ensureYearLoaded = async (year: SupportedYear) => {
    if (sheetStates[year]) return;
    setError(null);
    try {
      const chunk = await fetchSheetChunk(year, 0, 60);
      setSheetStates((current) => ({
        ...current,
        [year]: {
          rows: chunk.rows,
          totalRows: chunk.totalRows,
          nextOffset: chunk.nextOffset,
          hasMore: chunk.hasMore,
          loadingMore: false,
          columnCount: chunk.columnCount,
        },
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Jahresblatt konnte nicht geladen werden.");
    }
  };

  const handleYearChange = async (year: SupportedYear) => {
    setSelectedYear(year);
    const firstWeek = years.find((entry) => entry.year === year)?.weeks[0];
    setSelectedWeekId(firstWeek?.weekId ?? null);
    await ensureYearLoaded(year);
  };

  const handleWeekChange = (weekId: string) => {
    setSelectedWeekId(weekId);
  };

  const handleLoadMore = async () => {
    if (!selectedYear || !selectedSheetState || !selectedSheetState.hasMore) return;
    setSheetStates((current) => ({
      ...current,
      [selectedYear]: {
        ...selectedSheetState,
        loadingMore: true,
      },
    }));
    setError(null);
    try {
      const chunk = await fetchSheetChunk(selectedYear, selectedSheetState.nextOffset, 60);
      setSheetStates((current) => {
        const existing = current[selectedYear];
        if (!existing) return current;
        return {
          ...current,
          [selectedYear]: {
            rows: [...existing.rows, ...chunk.rows],
            totalRows: chunk.totalRows,
            nextOffset: chunk.nextOffset,
            hasMore: chunk.hasMore,
            loadingMore: false,
            columnCount: chunk.columnCount,
          },
        };
      });
    } catch (loadError) {
      setSheetStates((current) => ({
        ...current,
        [selectedYear]: current[selectedYear]
          ? { ...current[selectedYear], loadingMore: false }
          : current[selectedYear],
      }));
      setError(loadError instanceof Error ? loadError.message : "Weitere Zeilen konnten nicht geladen werden.");
    }
  };

  const visibleColumnRange = useMemo(() => {
    if (!selectedSheetState) return { start: 0, end: 0, count: 0 };
    if (viewMode === "week" && selectedWeekMeta) {
      const start = selectedWeekMeta.startColumn - 1;
      const end = selectedWeekMeta.endColumn - 1;
      return { start, end, count: end - start + 1 };
    }
    return {
      start: 0,
      end: Math.max(0, selectedSheetState.columnCount - 1),
      count: selectedSheetState.columnCount,
    };
  }, [selectedSheetState, selectedWeekMeta, viewMode]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="settings-group-sauna-tour-import">
      <h4 className="font-bold text-slate-900">Admin: Saunatourenliste Import</h4>
      <p className="mt-1 text-xs text-slate-500">Schritt-1 Preview: Es werden keine Daten dauerhaft importiert.</p>

      {!isWorking ? (
        <div className="mt-3">
          <Button onClick={() => setIsWorking(true)} data-testid="button-open-sauna-tour-import-workmode">
            Import-Preview starten
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="sauna-tour-import-workmode">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="input-sauna-tour-file">
                Tabellen-Datei (.ods, .xlsx)
              </label>
              <Input
                id="input-sauna-tour-file"
                type="file"
                accept=".ods,.xlsx,application/vnd.oasis.opendocument.spreadsheet,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                data-testid="input-sauna-tour-import-file"
              />
            </div>
            <Button onClick={() => void handleUpload()} disabled={!selectedFile || isUploading} data-testid="button-run-sauna-tour-preview">
              {isUploading ? "Analysiere..." : "Datei analysieren"}
            </Button>
            <Button variant="outline" onClick={() => void handleCancel()} data-testid="button-cancel-sauna-tour-workmode">
              Abbrechen
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {years.length > 0 && selectedYear ? (
            <div className="space-y-3" data-testid="sauna-tour-preview-result">
              <Tabs value={selectedYear} onValueChange={(value) => void handleYearChange(value as SupportedYear)}>
                <TabsList>
                  {years.map((yearData) => (
                    <TabsTrigger key={yearData.year} value={yearData.year} data-testid={`sauna-tour-year-tab-${yearData.year}`}>
                      {yearData.year}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {years.map((yearData) => (
                  <TabsContent key={yearData.year} value={yearData.year}>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {yearData.weeks.map((week) => (
                        <Button
                          key={week.weekId}
                          type="button"
                          size="sm"
                          variant={selectedWeekId === week.weekId ? "default" : "outline"}
                          onClick={() => handleWeekChange(week.weekId)}
                          data-testid={`sauna-tour-week-${yearData.year}-${week.weekId}`}
                        >
                          {week.startDate} - {week.endDate}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "full" ? "default" : "outline"}
                  onClick={() => setViewMode("full")}
                  data-testid="button-sauna-tour-view-fullsheet"
                >
                  Vollblatt
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "default" : "outline"}
                  onClick={() => setViewMode("week")}
                  data-testid="button-sauna-tour-view-weekwindow"
                  disabled={!selectedWeekMeta}
                >
                  Wochenfenster
                </Button>
              </div>

              {selectedWeekMeta ? (
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Woche: {selectedWeekMeta.startDate} bis {selectedWeekMeta.endDate}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Markierter Bereich: Spalte {selectedWeekMeta.startColumn} bis {selectedWeekMeta.endColumn}
                  </p>
                </div>
              ) : null}

              {selectedSheetState ? (
                <div className="space-y-3">
                  <div className="overflow-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full text-xs" data-testid="table-sauna-tour-sheet-preview">
                      <thead className="sticky top-0 z-10 bg-slate-100">
                        <tr>
                          <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-1 text-left">#</th>
                          {Array.from({ length: visibleColumnRange.count }, (_, index) => {
                            const absoluteIndex = visibleColumnRange.start + index;
                            const isHighlighted = selectedWeekMeta
                              && absoluteIndex >= selectedWeekMeta.startColumn - 1
                              && absoluteIndex <= selectedWeekMeta.endColumn - 1;
                            return (
                              <th
                                key={absoluteIndex}
                                className={`border-b border-slate-200 px-2 py-1 text-left ${isHighlighted ? "bg-amber-100" : ""}`}
                              >
                                {getColumnLabel(absoluteIndex)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSheetState.rows.map((row) => (
                          <tr key={`${row.rowIndex}-${row.cells.length}`} className="border-b border-slate-100">
                            <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-2 py-1 font-medium text-slate-600">
                              {row.rowIndex + 1}
                            </td>
                            {Array.from({ length: visibleColumnRange.count }, (_, index) => {
                              const absoluteIndex = visibleColumnRange.start + index;
                              const cell = row.cells[absoluteIndex] ?? "";
                              const isHighlighted = selectedWeekMeta
                                && absoluteIndex >= selectedWeekMeta.startColumn - 1
                                && absoluteIndex <= selectedWeekMeta.endColumn - 1;
                              return (
                                <td
                                  key={`${row.rowIndex}-${absoluteIndex}`}
                                  className={`px-2 py-1 whitespace-pre-wrap align-top ${isHighlighted ? "bg-amber-50" : ""}`}
                                >
                                  {cell || "\u00A0"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Zeilen: {selectedSheetState.rows.length} / {selectedSheetState.totalRows} | Spalten: {selectedSheetState.columnCount}
                    </p>
                    {selectedSheetState.hasMore ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleLoadMore()}
                        disabled={selectedSheetState.loadingMore}
                        data-testid="button-sauna-tour-load-more-rows"
                      >
                        {selectedSheetState.loadingMore ? "Lade..." : "Mehr Zeilen laden"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Jahresblatt wird geladen...</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
