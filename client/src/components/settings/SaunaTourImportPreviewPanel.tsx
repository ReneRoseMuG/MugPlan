import { useMemo, useState } from "react";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SupportedYear = "2025" | "2026";

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
  weeks: WeekMeta[];
};

type WeekRow = {
  rowIndex: number;
  cells: string[];
};

type WeekChunk = {
  year: SupportedYear;
  weekId: string;
  offset: number;
  limit: number;
  totalRows: number;
  hasMore: boolean;
  nextOffset: number;
  rows: WeekRow[];
};

type UploadResponse = {
  previewSessionId: string;
  years: YearData[];
  initialChunk: WeekChunk;
};

type WeekState = {
  rows: WeekRow[];
  totalRows: number;
  nextOffset: number;
  hasMore: boolean;
  loadingMore: boolean;
};

function getWeekKey(year: SupportedYear, weekId: string): string {
  return `${year}:${weekId}`;
}

export function SaunaTourImportPreviewPanel() {
  const [isWorking, setIsWorking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [years, setYears] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<SupportedYear | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [weekStates, setWeekStates] = useState<Record<string, WeekState>>({});
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const selectedWeeks = useMemo(
    () => years.find((entry) => entry.year === selectedYear)?.weeks ?? [],
    [years, selectedYear],
  );

  const selectedWeekMeta = useMemo(
    () => selectedWeeks.find((week) => week.weekId === selectedWeekId) ?? null,
    [selectedWeeks, selectedWeekId],
  );

  const selectedWeekState = useMemo(() => {
    if (!selectedYear || !selectedWeekId) return null;
    return weekStates[getWeekKey(selectedYear, selectedWeekId)] ?? null;
  }, [selectedWeekId, selectedYear, weekStates]);

  const resetWorkingState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setError(null);
    setPreviewSessionId(null);
    setYears([]);
    setSelectedYear(null);
    setSelectedWeekId(null);
    setWeekStates({});
    setIsLoadingWeek(false);
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
      setSelectedYear(payload.initialChunk.year);
      setSelectedWeekId(payload.initialChunk.weekId);
      setWeekStates({
        [getWeekKey(payload.initialChunk.year, payload.initialChunk.weekId)]: {
          rows: payload.initialChunk.rows,
          totalRows: payload.initialChunk.totalRows,
          nextOffset: payload.initialChunk.nextOffset,
          hasMore: payload.initialChunk.hasMore,
          loadingMore: false,
        },
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Vorschau konnte nicht erstellt werden.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchWeekChunk = async (year: SupportedYear, weekId: string, offset: number, limit: number) => {
    if (!previewSessionId) return;
    const response = await fetch(api.admin.saunaTourImportPreviewWeekRows.path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previewSessionId,
        year,
        weekId,
        offset,
        limit,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    return await response.json() as WeekChunk;
  };

  const ensureWeekLoaded = async (year: SupportedYear, weekId: string) => {
    const key = getWeekKey(year, weekId);
    if (weekStates[key]) return;
    setError(null);
    setIsLoadingWeek(true);
    try {
      const chunk = await fetchWeekChunk(year, weekId, 0, 60);
      if (!chunk) return;
      setWeekStates((current) => ({
        ...current,
        [key]: {
          rows: chunk.rows,
          totalRows: chunk.totalRows,
          nextOffset: chunk.nextOffset,
          hasMore: chunk.hasMore,
          loadingMore: false,
        },
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Woche konnte nicht geladen werden.");
    } finally {
      setIsLoadingWeek(false);
    }
  };

  const handleYearChange = async (year: SupportedYear) => {
    setSelectedYear(year);
    const firstWeek = years.find((entry) => entry.year === year)?.weeks[0];
    if (!firstWeek) {
      setSelectedWeekId(null);
      return;
    }
    setSelectedWeekId(firstWeek.weekId);
    await ensureWeekLoaded(year, firstWeek.weekId);
  };

  const handleWeekChange = async (weekId: string) => {
    if (!selectedYear) return;
    setSelectedWeekId(weekId);
    await ensureWeekLoaded(selectedYear, weekId);
  };

  const handleLoadMore = async () => {
    if (!selectedYear || !selectedWeekId || !selectedWeekState || !selectedWeekState.hasMore) return;
    const key = getWeekKey(selectedYear, selectedWeekId);
    setWeekStates((current) => ({
      ...current,
      [key]: {
        ...current[key],
        loadingMore: true,
      },
    }));
    setError(null);
    try {
      const chunk = await fetchWeekChunk(selectedYear, selectedWeekId, selectedWeekState.nextOffset, 60);
      if (!chunk) return;
      setWeekStates((current) => {
        const existing = current[key];
        return {
          ...current,
          [key]: {
            rows: [...existing.rows, ...chunk.rows],
            totalRows: chunk.totalRows,
            nextOffset: chunk.nextOffset,
            hasMore: chunk.hasMore,
            loadingMore: false,
          },
        };
      });
    } catch (loadError) {
      setWeekStates((current) => ({
        ...current,
        [key]: {
          ...current[key],
          loadingMore: false,
        },
      }));
      setError(loadError instanceof Error ? loadError.message : "Weitere Zeilen konnten nicht geladen werden.");
    }
  };

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
                          onClick={() => void handleWeekChange(week.weekId)}
                          data-testid={`sauna-tour-week-${yearData.year}-${week.weekId}`}
                        >
                          {week.startDate} - {week.endDate}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {selectedWeekMeta ? (
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Woche: {selectedWeekMeta.startDate} bis {selectedWeekMeta.endDate}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Startspalte: {selectedWeekMeta.startColumn}, Endspalte: {selectedWeekMeta.endColumn}
                  </p>
                </div>
              ) : null}

              {isLoadingWeek ? (
                <p className="text-sm text-slate-500">Woche wird geladen...</p>
              ) : selectedWeekState ? (
                <div className="space-y-3">
                  <div className="overflow-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full text-xs" data-testid="table-sauna-tour-week-preview">
                      <tbody>
                        {selectedWeekState.rows.map((row) => (
                          <tr key={`${row.rowIndex}-${row.cells.length}`} className="border-b border-slate-100">
                            {row.cells.map((cell, index) => (
                              <td key={`${row.rowIndex}-${index}`} className="px-2 py-1 whitespace-pre-wrap align-top">
                                {cell || "\u00A0"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Angezeigt: {selectedWeekState.rows.length} / {selectedWeekState.totalRows} Zeilen
                    </p>
                    {selectedWeekState.hasMore ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleLoadMore()}
                        disabled={selectedWeekState.loadingMore}
                        data-testid="button-sauna-tour-load-more-rows"
                      >
                        {selectedWeekState.loadingMore ? "Lade..." : "Mehr Zeilen laden"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
