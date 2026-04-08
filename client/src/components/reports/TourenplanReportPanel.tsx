import React from "react";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, differenceInCalendarDays, endOfISOWeek, format, getISOWeek, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import type { z } from "zod";
import { api } from "@shared/routes";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { TourenplanPaginationMeasurement } from "@/components/reports/TourenplanPaginationMeasurement";
import { ReportConfigPanel, type ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import { TourenplanPrintPage } from "@/components/reports/TourenplanPrintPage";
import {
  buildTourenplanWeekGroups,
  buildTourenplanPrintPages,
  paginateTourenplanWeekGroups,
  type TourenplanAppointmentListItem,
  type TourenplanOrientation,
  type TourenplanPreviewResponse,
  type TourenplanPrintMode,
} from "@/components/reports/tourenplan-model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RangeSummary } from "@/components/ui/RangeSummary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpinField } from "@/components/ui/SpinField";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { normalizeKwStart, normalizeWeekCount, resolveReportRangeFromKw } from "@/lib/reportRangeFromKw";

type TourEntity = z.infer<typeof api.tours.list.responses[200]>[number];
type TourenplanRangeConfig = {
  activeTab?: ReportConfigPanelMode;
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};

type TourenplanReportPanelProps = {
  defaultReportRange: {
    fromDate: string;
    toDate: string;
    weekCount: number;
    referenceDate: Date;
  };
  defaultIsoWeek: number;
  defaultIsoWeekYear: number;
  isAdmin: boolean;
};

const TOURENPLAN_RANGE_SETTING_KEY = "reports.tourenplan.rangeConfig";
const TOURENPLAN_PRINT_MODE_SETTING_KEY = "reports.tourenplan.printMode";

function parseDateOnlyInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePersistedDate(value: string | undefined): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function resolveRequiredToDate(value: string | undefined, fallback: string): string {
  return normalizePersistedDate(value) ?? fallback;
}

function buildQuickRangeLabel(referenceDate: Date, offsetWeeks: number): string {
  return `Mo. ${format(startOfISOWeek(addWeeks(referenceDate, offsetWeeks)), "dd.MM.yyyy", { locale: de })}`;
}

function buildQuickRange(referenceDate: Date, offsetWeeks: number) {
  const start = startOfISOWeek(addWeeks(referenceDate, offsetWeeks));
  const end = endOfISOWeek(start);
  return {
    fromDate: format(start, "yyyy-MM-dd"),
    toDate: format(end, "yyyy-MM-dd"),
    kwStart: getISOWeek(start),
  };
}

function QuickRangeButton({
  label,
  dateLabel,
  onClick,
  testId,
}: {
  label: string;
  dateLabel: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-auto min-h-14 flex-1 flex-col items-start gap-1 px-3 py-2 text-left"
      data-testid={testId}
    >
      <span className="text-xs font-semibold text-slate-800">{label}</span>
      <span className="text-xs font-medium text-slate-500">{dateLabel}</span>
    </Button>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchAllTourenplanAppointmentDetails(params: {
  fromDate: string;
  toDate: string;
  tourId: number;
}): Promise<TourenplanAppointmentListItem[]> {
  const items: TourenplanAppointmentListItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const searchParams = new URLSearchParams({
      dateFrom: params.fromDate,
      dateTo: params.toDate,
      page: String(page),
      pageSize: "200",
    });
    if (params.tourId > 0) {
      searchParams.set("tourId", String(params.tourId));
    }
    const response = await fetchJson<z.infer<typeof api.appointments.list.responses[200]>>(`/api/appointments/list?${searchParams.toString()}`);
    const filteredItems = params.tourId === 0
      ? response.items.filter((item) => item.tourId == null)
      : response.items;

    items.push(...filteredItems);
    totalPages = response.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function TourenplanReportPanel({
  defaultReportRange,
  defaultIsoWeek,
  defaultIsoWeekYear,
  isAdmin,
}: TourenplanReportPanelProps) {
  const { setSetting } = useSettings();
  const rangeConfig = useSetting(TOURENPLAN_RANGE_SETTING_KEY) as TourenplanRangeConfig | undefined;
  const configuredPrintMode = useSetting(TOURENPLAN_PRINT_MODE_SETTING_KEY) as TourenplanPrintMode | undefined;
  const [selectedTourId, setSelectedTourId] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<ReportConfigPanelMode>("date");
  const [fromDate, setFromDate] = React.useState(defaultReportRange.fromDate);
  const [toDate, setToDate] = React.useState(defaultReportRange.toDate);
  const [kwStart, setKwStart] = React.useState<number | undefined>(defaultIsoWeek);
  const [weekCount, setWeekCount] = React.useState(defaultReportRange.weekCount);
  const [useShortCodes, setUseShortCodes] = React.useState(false);
  const [printMode, setPrintMode] = React.useState<TourenplanPrintMode>("farbdruck");
  const [orientation, setOrientation] = React.useState<TourenplanOrientation>("landscape");
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [activePageIndex, setActivePageIndex] = React.useState(0);

  React.useEffect(() => {
    setActiveTab(rangeConfig?.activeTab ?? "date");
  }, [rangeConfig?.activeTab]);

  React.useEffect(() => {
    setFromDate(rangeConfig?.fromDate ?? defaultReportRange.fromDate);
    setToDate(rangeConfig?.toDate ?? defaultReportRange.toDate);
    setKwStart(rangeConfig?.kwStart ?? defaultIsoWeek);
    setWeekCount(rangeConfig?.weekCount ?? defaultReportRange.weekCount);
  }, [
    defaultIsoWeek,
    defaultReportRange.fromDate,
    defaultReportRange.toDate,
    defaultReportRange.weekCount,
    rangeConfig?.fromDate,
    rangeConfig?.kwStart,
    rangeConfig?.toDate,
    rangeConfig?.weekCount,
  ]);

  React.useEffect(() => {
    setPrintMode(configuredPrintMode ?? "farbdruck");
  }, [configuredPrintMode]);

  const persistRangeConfig = React.useCallback(async (next: Partial<TourenplanRangeConfig>) => {
    await setSetting({
      key: TOURENPLAN_RANGE_SETTING_KEY,
      scopeType: "USER",
      value: {
        activeTab: next.activeTab ?? activeTab,
        fromDate: normalizePersistedDate(next.fromDate ?? fromDate),
        toDate: resolveRequiredToDate(next.toDate ?? toDate, defaultReportRange.toDate),
        kwStart: normalizeKwStart(next.kwStart ?? kwStart),
        weekCount: normalizeWeekCount(next.weekCount ?? weekCount),
      },
    });
  }, [activeTab, defaultReportRange.toDate, fromDate, kwStart, setSetting, toDate, weekCount]);

  const currentWeekRange = React.useMemo(() => buildQuickRange(defaultReportRange.referenceDate, 0), [defaultReportRange.referenceDate]);
  const nextWeekRange = React.useMemo(() => buildQuickRange(defaultReportRange.referenceDate, 1), [defaultReportRange.referenceDate]);

  const kwRange = React.useMemo(() => resolveReportRangeFromKw({
    kwStart,
    weekCount,
    referenceDate: defaultReportRange.referenceDate,
  }), [defaultReportRange.referenceDate, kwStart, weekCount]);

  const previewRequest = React.useMemo(() => {
    if (activeTab === "calendarWeek") {
      return {
        fromDate: kwRange?.fromDate ?? "",
        weekCount: normalizeWeekCount(weekCount),
      };
    }

    const parsedFrom = parseDateOnlyInput(fromDate);
    const parsedTo = parseDateOnlyInput(toDate);
    if (!parsedFrom || !parsedTo) {
      return { fromDate: "", weekCount: 1 };
    }

    return {
      fromDate,
      weekCount: Math.max(1, Math.ceil((differenceInCalendarDays(parsedTo, parsedFrom) + 1) / 7)),
    };
  }, [activeTab, fromDate, kwRange?.fromDate, toDate, weekCount]);

  const { data: tours = [] } = useQuery<TourEntity[]>({
    queryKey: ["/api/tours"],
    queryFn: () => fetchJson("/api/tours"),
  });

  const activeTours = React.useMemo(() => tours, [tours]);

  const { data: previewData, isLoading: isPreviewLoading, isError: isPreviewError } = useQuery<TourenplanPreviewResponse>({
    queryKey: ["reports-tourenplan-preview", selectedTourId, previewRequest.fromDate, previewRequest.weekCount],
    enabled: isPreviewOpen && selectedTourId !== null && previewRequest.fromDate.length > 0,
    queryFn: () => fetchJson(`/api/tours/${selectedTourId}/print-preview?fromDate=${previewRequest.fromDate}&weekCount=${previewRequest.weekCount}`),
  });

  const { data: appointmentDetails = [], isLoading: isAppointmentDetailsLoading } = useQuery<TourenplanAppointmentListItem[]>({
    queryKey: ["reports-tourenplan-appointments", selectedTourId, previewData?.fromDate, previewData?.toDate],
    enabled: isPreviewOpen && selectedTourId !== null && Boolean(previewData?.fromDate && previewData?.toDate),
    queryFn: () => fetchAllTourenplanAppointmentDetails({
      tourId: selectedTourId!,
      fromDate: previewData!.fromDate,
      toDate: previewData!.toDate,
    }),
  });

  const measuredWeeks = React.useMemo(
    () => previewData ? buildTourenplanWeekGroups(previewData, appointmentDetails) : [],
    [appointmentDetails, previewData],
  );
  const estimatedPages = React.useMemo(
    () => previewData ? buildTourenplanPrintPages(previewData, appointmentDetails) : [],
    [appointmentDetails, previewData],
  );
  const [paginationMeasurement, setPaginationMeasurement] = React.useState<{
    pageCapacityPx: number;
    cardHeights: Record<number, number>;
  } | null>(null);

  React.useEffect(() => {
    setPaginationMeasurement(null);
  }, [measuredWeeks, orientation, printMode, useShortCodes]);

  const measuredPages = React.useMemo(
    () => (
      previewData && paginationMeasurement
        ? paginateTourenplanWeekGroups({
            tourName: previewData.tour.name,
            weeks: measuredWeeks,
            pageCapacityPx: paginationMeasurement.pageCapacityPx,
            cardHeights: paginationMeasurement.cardHeights,
          })
        : []
    ),
    [measuredWeeks, paginationMeasurement, previewData],
  );
  const pages = React.useMemo(
    () => (typeof window === "undefined" ? estimatedPages : measuredPages),
    [estimatedPages, measuredPages],
  );
  const isPaginationMeasuring = typeof window !== "undefined"
    && isPreviewOpen
    && Boolean(previewData)
    && !isAppointmentDetailsLoading
    && paginationMeasurement === null;

  React.useEffect(() => {
    setActivePageIndex(0);
  }, [pages.length]);

  const dialogWidthClassName = orientation === "portrait" ? "w-[calc(210mm+88px)]" : undefined;
  const isGenerateDisabled = selectedTourId === null || previewRequest.fromDate.length === 0;
  const quickRangeOptions = (
    <div className="hidden" data-testid="reports-tourenplan-quick-range-options">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Termine ab:</div>
      <div className="flex flex-wrap gap-2">
        <QuickRangeButton
          label="Diese Woche"
          dateLabel={buildQuickRangeLabel(defaultReportRange.referenceDate, 0)}
          onClick={() => {
            if (activeTab === "calendarWeek") {
              setKwStart(currentWeekRange.kwStart);
              setWeekCount(1);
              void persistRangeConfig({ kwStart: currentWeekRange.kwStart, weekCount: 1 });
              return;
            }

            setActiveTab("date");
            setFromDate(currentWeekRange.fromDate);
            setToDate(currentWeekRange.toDate);
            setKwStart(currentWeekRange.kwStart);
            setWeekCount(1);
            void persistRangeConfig({
              activeTab: "date",
              fromDate: currentWeekRange.fromDate,
              toDate: currentWeekRange.toDate,
              kwStart: currentWeekRange.kwStart,
              weekCount: 1,
            });
          }}
          testId={activeTab === "calendarWeek" ? "button-reports-tourenplan-kw-current" : "button-reports-tourenplan-this-week"}
        />
        <QuickRangeButton
          label="Nächste Woche"
          dateLabel={buildQuickRangeLabel(defaultReportRange.referenceDate, 1)}
          onClick={() => {
            if (activeTab === "calendarWeek") {
              setKwStart(nextWeekRange.kwStart);
              setWeekCount(1);
              void persistRangeConfig({ kwStart: nextWeekRange.kwStart, weekCount: 1 });
              return;
            }

            setActiveTab("date");
            setFromDate(nextWeekRange.fromDate);
            setToDate(nextWeekRange.toDate);
            setKwStart(nextWeekRange.kwStart);
            setWeekCount(1);
            void persistRangeConfig({
              activeTab: "date",
              fromDate: nextWeekRange.fromDate,
              toDate: nextWeekRange.toDate,
              kwStart: nextWeekRange.kwStart,
              weekCount: 1,
            });
          }}
          testId={activeTab === "calendarWeek" ? "button-reports-tourenplan-kw-next" : "button-reports-tourenplan-next-week"}
        />
      </div>
    </div>
  );

  return (
    <>
      <ReportConfigPanel
        title="Tourenplan"
        helpKey="report-tourenplan"
        mode={activeTab}
        onModeChange={(nextMode) => {
          setActiveTab(nextMode);
          void persistRangeConfig({ activeTab: nextMode });
        }}
        actionButton={(
          <div className="min-w-[150px]">
            <Select
              value={selectedTourId !== null ? String(selectedTourId) : "none"}
              onValueChange={(value) => setSelectedTourId(value === "none" ? null : Number(value))}
            >
              <SelectTrigger className="h-8 bg-white text-xs" data-testid="select-reports-tourenplan-tour">
                <SelectValue placeholder="Tour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tour</SelectItem>
                <SelectItem value="0">Ohne Tour</SelectItem>
                {activeTours.map((tour) => (
                  <SelectItem key={tour.id} value={String(tour.id)}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        optionsSlot={(
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2.5" data-testid="reports-tourenplan-shortcodes-option">
                <Checkbox
                  checked={useShortCodes}
                  onCheckedChange={(nextChecked) => setUseShortCodes(Boolean(nextChecked))}
                  data-testid="checkbox-reports-tourenplan-use-shortcodes"
                />
                <span className="text-sm text-slate-600">Shortcodes verwenden</span>
              </label>
              {isAdmin ? (
                <div className="ml-auto flex items-center gap-2" data-testid="reports-tourenplan-print-mode-toggle">
                  <Button
                    type="button"
                    variant={printMode === "farbdruck" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPrintMode("farbdruck");
                      void setSetting({ key: TOURENPLAN_PRINT_MODE_SETTING_KEY, scopeType: "GLOBAL", value: "farbdruck" });
                    }}
                    data-testid="button-reports-tourenplan-print-mode-farbdruck"
                  >
                    Farbdruck
                  </Button>
                  <Button
                    type="button"
                    variant={printMode === "spardruck" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPrintMode("spardruck");
                      void setSetting({ key: TOURENPLAN_PRINT_MODE_SETTING_KEY, scopeType: "GLOBAL", value: "spardruck" });
                    }}
                    data-testid="button-reports-tourenplan-print-mode-spardruck"
                  >
                    Spardruck
                  </Button>
                </div>
              ) : null}
            </div>
            {quickRangeOptions}
          </div>
        )}
        footer={(
          <Button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            disabled={isGenerateDisabled}
            data-testid="button-reports-tourenplan-preview"
          >
            Druckvorschau
          </Button>
        )}
        testId="reports-tourenplan-config-panel"
        togglePrefix="reports-tourenplan"
      >
        {activeTab === "date" ? (
          <div className="space-y-3" data-testid="reports-tourenplan-date-panel">
            <div className="grid gap-3">
              <div className="hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab("date");
                    setFromDate(currentWeekRange.fromDate);
                    setToDate(currentWeekRange.toDate);
                    setKwStart(currentWeekRange.kwStart);
                    setWeekCount(1);
                    void persistRangeConfig({
                      activeTab: "date",
                      fromDate: currentWeekRange.fromDate,
                      toDate: currentWeekRange.toDate,
                      kwStart: currentWeekRange.kwStart,
                      weekCount: 1,
                    });
                  }}
                  data-testid="button-reports-tourenplan-this-week"
                >
                  Diese Woche
                  <span className="ml-2 text-xs text-slate-500">{buildQuickRangeLabel(defaultReportRange.referenceDate, 0)}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab("date");
                    setFromDate(nextWeekRange.fromDate);
                    setToDate(nextWeekRange.toDate);
                    setKwStart(nextWeekRange.kwStart);
                    setWeekCount(1);
                    void persistRangeConfig({
                      activeTab: "date",
                      fromDate: nextWeekRange.fromDate,
                      toDate: nextWeekRange.toDate,
                      kwStart: nextWeekRange.kwStart,
                      weekCount: 1,
                    });
                  }}
                  data-testid="button-reports-tourenplan-next-week"
                >
                  Nächste Woche
                  <span className="ml-2 text-xs text-slate-500">{buildQuickRangeLabel(defaultReportRange.referenceDate, 1)}</span>
                </Button>
              </div>
              <div className="flex w-full flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Beginn</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFromDate(nextValue);
                      void persistRangeConfig({ fromDate: nextValue });
                    }}
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="reports-tourenplan-from-date"
                  />
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Ende</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => {
                      const nextValue = resolveRequiredToDate(event.target.value, defaultReportRange.toDate);
                      setToDate(nextValue);
                      void persistRangeConfig({ toDate: nextValue });
                    }}
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="reports-tourenplan-to-date"
                  />
                </div>
              </div>
            </div>
            <RangeSummary
              fromDate={fromDate}
              toDate={toDate}
              testId="reports-tourenplan-date-summary"
            />
          </div>
        ) : (
          <div className="space-y-3" data-testid="reports-tourenplan-calendar-week-panel">
            <div className="hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setKwStart(currentWeekRange.kwStart);
                  setWeekCount(1);
                  void persistRangeConfig({ kwStart: currentWeekRange.kwStart, weekCount: 1 });
                }}
                data-testid="button-reports-tourenplan-kw-current"
              >
                Diese Woche
                <span className="ml-2 text-xs text-slate-500">{buildQuickRangeLabel(defaultReportRange.referenceDate, 0)}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setKwStart(nextWeekRange.kwStart);
                  setWeekCount(1);
                  void persistRangeConfig({ kwStart: nextWeekRange.kwStart, weekCount: 1 });
                }}
                data-testid="button-reports-tourenplan-kw-next"
              >
                Nächste Woche
                <span className="ml-2 text-xs text-slate-500">{buildQuickRangeLabel(defaultReportRange.referenceDate, 1)}</span>
              </Button>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <SpinField
                label="KW Start"
                value={kwStart ?? defaultIsoWeek}
                onChange={(nextValue) => {
                  setKwStart(nextValue);
                  void persistRangeConfig({ kwStart: nextValue });
                }}
                min={1}
                max={53}
                strictTextBounds
                hint={`KW ${String(kwStart ?? defaultIsoWeek).padStart(2, "0")} · ${defaultIsoWeekYear}`}
                inputTestId="input-reports-tourenplan-kw-start"
                incrementTestId="button-reports-tourenplan-kw-start-up"
                decrementTestId="button-reports-tourenplan-kw-start-down"
              />
              <SpinField
                label="Anzahl Wochen"
                value={weekCount}
                onChange={(nextValue) => {
                  setWeekCount(nextValue);
                  void persistRangeConfig({ weekCount: nextValue });
                }}
                min={1}
                max={52}
                hint={`${weekCount} ${weekCount === 1 ? "Woche" : "Wochen"}`}
                inputTestId="input-reports-tourenplan-week-count"
                incrementTestId="button-reports-tourenplan-week-count-up"
                decrementTestId="button-reports-tourenplan-week-count-down"
              />
            </div>
            <RangeSummary
              fromDate={kwRange?.fromDate ?? ""}
              toDate={kwRange?.toDate ?? ""}
              testId="reports-tourenplan-calendar-week-summary"
            />
          </div>
        )}
      </ReportConfigPanel>

      {isPreviewOpen && previewData && !isAppointmentDetailsLoading ? (
        <TourenplanPaginationMeasurement
          tourName={previewData.tour.name}
          weeks={measuredWeeks}
          printMode={printMode}
          orientation={orientation}
          useShortCodes={useShortCodes}
          onMeasured={(nextMeasurement) => {
            setPaginationMeasurement((currentMeasurement) => {
              if (
                currentMeasurement
                && currentMeasurement.pageCapacityPx === nextMeasurement.pageCapacityPx
                && JSON.stringify(currentMeasurement.cardHeights) === JSON.stringify(nextMeasurement.cardHeights)
              ) {
                return currentMeasurement;
              }
              return nextMeasurement;
            });
          }}
        />
      ) : null}

      <PrintPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title="Druckvorschau Tourenplan"
        dialogWidthClassName={dialogWidthClassName}
        pages={pages}
        activePageIndex={activePageIndex}
        onPageChange={setActivePageIndex}
        testIdPrefix="tourenplan-print-preview"
        dialogTestId="dialog-tourenplan-print-preview"
        showPageMetaBar={false}
        pageOrientation={orientation}
        getPageKey={(page) => page.pageNumber}
        headerActions={(
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={orientation === "landscape" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrientation("landscape")}
              data-testid="button-reports-tourenplan-orientation-landscape"
            >
              Querformat
            </Button>
            <Button
              type="button"
              variant={orientation === "portrait" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrientation("portrait")}
              data-testid="button-reports-tourenplan-orientation-portrait"
            >
              Hochformat
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              data-testid="button-reports-tourenplan-print"
            >
              Drucken
            </Button>
          </div>
        )}
        renderPage={(page) => (
          <TourenplanPrintPage
            page={page}
            printMode={printMode}
            orientation={orientation}
            useShortCodes={useShortCodes}
            testId={`tourenplan-print-page-${page.pageNumber}`}
          />
        )}
        loadingState={isPreviewLoading || isPaginationMeasuring ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
        errorState={isPreviewError ? <div className="text-sm text-destructive">Druckvorschau konnte nicht geladen werden.</div> : null}
      />
    </>
  );
}
