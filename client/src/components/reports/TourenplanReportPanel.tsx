import React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, endOfISOWeek, format, getISOWeek, getISOWeeksInYear, startOfISOWeek } from "date-fns";
import type { z } from "zod";
import { api } from "@shared/routes";
import { ReportPrintPreviewDialog } from "@/components/print/ReportPrintPreviewDialog";
import { TourenplanPaginationMeasurement } from "@/components/reports/TourenplanPaginationMeasurement";
import { ReportConfigPanel, type ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import { ReportOpenToggle } from "@/components/reports/ReportOpenToggle";
import { ReportResultOverlayShell } from "@/components/reports/ReportResultOverlayShell";
import { TourenplanAppointmentCard } from "@/components/reports/TourenplanAppointmentCard";
import { TourenplanPrintPage } from "@/components/reports/TourenplanPrintPage";
import { TourenplanWeekNoteStrip } from "@/components/reports/TourenplanWeekNoteStrip";
import {
  buildTourenplanPrintPagesForSections,
  buildTourenplanPrintSections,
  paginateTourenplanPrintSections,
  type TourenplanAppointmentListItem,
  type TourenplanFontSize,
  type TourenplanOrientation,
  type TourenplanPrintSection,
  type TourenplanPreviewResponse,
  type TourenplanPrintMode,
} from "@/components/reports/tourenplan-model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangeKwRangePanel } from "@/components/ui/DateRangeKwRangePanel";
import { DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-display-format";
import { normalizeServerError } from "@/lib/error-normalization";
import { countTouchedIsoWeeks } from "@/lib/isoWeekRange";
import { normalizeWeekCount, resolveReportRangeFromKw } from "@/lib/reportRangeFromKw";
import { sortToursForDisplay } from "@/lib/tourDisplayOrder";

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
  overlayHost?: HTMLElement | null;
  standaloneLaunch?: TourenplanStandaloneLaunch | null;
  buildStandaloneReportUrl: (launch: TourenplanStandaloneLaunch) => string;
};

type TourenplanStandaloneLaunch = {
  reportType: "tourenplan";
  activeTab: ReportConfigPanelMode;
  fromDate: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  tagIds: number[];
  saunaModels: string[];
  useShortCodes: boolean;
  allToursSelected?: boolean;
  selectedTourIds?: number[];
  includeWithoutTour?: boolean;
  printMode?: TourenplanPrintMode;
  fontSize?: TourenplanFontSize;
  orientation?: TourenplanOrientation;
};

type TourenplanSelectionItem =
  | { kind: "tour"; tourId: number }
  | { kind: "without-tour" };

type TourenplanSectionRequestData = {
  sectionKey: string;
  previewData: TourenplanPreviewResponse;
  appointmentItems: TourenplanAppointmentListItem[];
};

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
  const monday = startOfISOWeek(addWeeks(referenceDate, offsetWeeks));
  return `Mo. ${formatDisplayDate(monday)}`;
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
    const bodyText = await response.text();
    throw new Error(`${response.status}: ${bodyText || `Request failed for ${url}`}`);
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

function buildTourenplanSelectionKey(items: TourenplanSelectionItem[]): string {
  return items.map((item) => item.kind === "tour" ? `tour:${item.tourId}` : "without-tour").join("|");
}

function selectionItemToTourId(item: TourenplanSelectionItem): number {
  return item.kind === "tour" ? item.tourId : 0;
}

function selectionItemToSectionKey(item: TourenplanSelectionItem): string {
  return item.kind === "tour" ? `tour-${item.tourId}` : "without-tour";
}

async function fetchTourenplanSections(params: {
  items: TourenplanSelectionItem[];
  fromDate: string;
  weekCount: number;
}): Promise<TourenplanSectionRequestData[]> {
  return Promise.all(params.items.map(async (item) => {
    const tourId = selectionItemToTourId(item);
    const previewData = await fetchJson<TourenplanPreviewResponse>(`/api/tours/${tourId}/print-preview?fromDate=${params.fromDate}&weekCount=${params.weekCount}`);
    const appointmentItems = await fetchAllTourenplanAppointmentDetails({
      tourId,
      fromDate: previewData.fromDate,
      toDate: previewData.toDate,
    });

    return {
      sectionKey: selectionItemToSectionKey(item),
      previewData,
      appointmentItems,
    };
  }));
}

export function TourenplanReportPanel({
  defaultReportRange,
  defaultIsoWeek,
  defaultIsoWeekYear,
  isAdmin,
  overlayHost,
  standaloneLaunch,
  buildStandaloneReportUrl,
}: TourenplanReportPanelProps) {
  const [allToursSelected, setAllToursSelected] = React.useState(true);
  const [selectedTourIds, setSelectedTourIds] = React.useState<number[]>([]);
  const [includeWithoutTour, setIncludeWithoutTour] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ReportConfigPanelMode>("calendarWeek");
  const [fromDate, setFromDate] = React.useState(defaultReportRange.fromDate);
  const [toDate, setToDate] = React.useState(defaultReportRange.toDate);
  const [kwStart, setKwStart] = React.useState<number | undefined>(defaultIsoWeek);
  const [weekCount, setWeekCount] = React.useState(defaultReportRange.weekCount);
  const [useShortCodes, setUseShortCodes] = React.useState(false);
  const [printMode, setPrintMode] = React.useState<TourenplanPrintMode>("farbdruck");
  const [fontSize, setFontSize] = React.useState<TourenplanFontSize>("medium");
  const [orientation, setOrientation] = React.useState<TourenplanOrientation>("landscape");
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [activePageIndex, setActivePageIndex] = React.useState(0);
  const [reportRequestId, setReportRequestId] = React.useState(0);
  const hasAppliedStandaloneLaunchRef = React.useRef(false);

  React.useEffect(() => {
    if (standaloneLaunch) return;
    setFromDate(defaultReportRange.fromDate);
    setToDate(defaultReportRange.toDate);
    setKwStart(defaultIsoWeek);
    setWeekCount(defaultReportRange.weekCount);
  }, [
    defaultIsoWeek,
    defaultReportRange.fromDate,
    defaultReportRange.toDate,
    defaultReportRange.weekCount,
    standaloneLaunch,
  ]);

  const persistRangeConfig = React.useCallback(async (next: Partial<TourenplanRangeConfig>) => {
    void next;
    return undefined;
  }, []);

  const currentWeekRange = React.useMemo(() => buildQuickRange(defaultReportRange.referenceDate, 0), [defaultReportRange.referenceDate]);
  const nextWeekRange = React.useMemo(() => buildQuickRange(defaultReportRange.referenceDate, 1), [defaultReportRange.referenceDate]);
  const kwStartMax = React.useMemo(() => getISOWeeksInYear(new Date(defaultIsoWeekYear, 0, 4)), [defaultIsoWeekYear]);

  const kwRange = React.useMemo(() => resolveReportRangeFromKw({
    kwStart,
    weekCount,
    isoWeekYear: defaultIsoWeekYear,
  }), [defaultIsoWeekYear, kwStart, weekCount]);

  React.useEffect(() => {
    if (!standaloneLaunch || hasAppliedStandaloneLaunchRef.current) {
      return;
    }
    hasAppliedStandaloneLaunchRef.current = true;
    setActiveTab(standaloneLaunch.activeTab);
    setFromDate(standaloneLaunch.fromDate);
    setToDate(standaloneLaunch.toDate ?? standaloneLaunch.fromDate);
    if (typeof standaloneLaunch.kwStart === "number") setKwStart(standaloneLaunch.kwStart);
    if (typeof standaloneLaunch.weekCount === "number") setWeekCount(standaloneLaunch.weekCount);
    setUseShortCodes(standaloneLaunch.useShortCodes);
    setAllToursSelected(standaloneLaunch.allToursSelected ?? true);
    setSelectedTourIds(standaloneLaunch.selectedTourIds ?? []);
    setIncludeWithoutTour(standaloneLaunch.includeWithoutTour ?? false);
    setPrintMode(standaloneLaunch.printMode ?? "farbdruck");
    setFontSize(standaloneLaunch.fontSize ?? "medium");
    setOrientation(standaloneLaunch.orientation ?? "landscape");
    setIsReportOpen(true);
    setReportRequestId((current) => current + 1);
  }, [standaloneLaunch]);

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
      weekCount: countTouchedIsoWeeks(parsedFrom, parsedTo),
    };
  }, [activeTab, fromDate, kwRange?.fromDate, toDate, weekCount]);

  const { data: tours = [] } = useQuery<TourEntity[]>({
    queryKey: ["/api/tours"],
    queryFn: () => fetchJson("/api/tours"),
  });

  const activeTours = React.useMemo(() => sortToursForDisplay(tours), [tours]);
  const activeTourIds = React.useMemo(() => activeTours.map((tour) => tour.id), [activeTours]);
  const selectedTourIdSet = React.useMemo(() => new Set(selectedTourIds), [selectedTourIds]);
  const selectedItems = React.useMemo<TourenplanSelectionItem[]>(() => {
    const selectedRealTourIds = allToursSelected
      ? activeTourIds
      : activeTourIds.filter((tourId) => selectedTourIdSet.has(tourId));
    const items: TourenplanSelectionItem[] = selectedRealTourIds.map((tourId) => ({ kind: "tour", tourId }));
    if (includeWithoutTour) {
      items.push({ kind: "without-tour" });
    }
    return items;
  }, [activeTourIds, allToursSelected, includeWithoutTour, selectedTourIdSet]);
  const selectedItemsKey = React.useMemo(() => buildTourenplanSelectionKey(selectedItems), [selectedItems]);

  const toggleAllTours = React.useCallback((checked: boolean) => {
    setAllToursSelected(checked);
    setSelectedTourIds(checked ? [] : []);
  }, []);

  const toggleTour = React.useCallback((tourId: number, checked: boolean) => {
    setAllToursSelected(false);
    setSelectedTourIds((currentIds) => {
      const currentSet = allToursSelected ? new Set(activeTourIds) : new Set(currentIds);
      if (checked) {
        currentSet.add(tourId);
      } else {
        currentSet.delete(tourId);
      }
      const nextIds = activeTourIds.filter((activeTourId) => currentSet.has(activeTourId));
      if (nextIds.length === activeTourIds.length && activeTourIds.length > 0) {
        setAllToursSelected(true);
        return [];
      }
      return nextIds;
    });
  }, [activeTourIds, allToursSelected]);

  const {
    data: sectionData = [],
    error: previewError,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
  } = useQuery<TourenplanSectionRequestData[]>({
    queryKey: ["reports-tourenplan-preview", selectedItemsKey, previewRequest.fromDate, previewRequest.weekCount, reportRequestId],
    enabled: (isReportOpen || isPreviewOpen) && selectedItems.length > 0 && previewRequest.fromDate.length > 0,
    queryFn: () => fetchTourenplanSections({
      items: selectedItems,
      fromDate: previewRequest.fromDate,
      weekCount: previewRequest.weekCount,
    }),
  });

  const measuredSections = React.useMemo<TourenplanPrintSection[]>(
    () => buildTourenplanPrintSections(sectionData),
    [sectionData],
  );
  const estimatedPages = React.useMemo(
    () => buildTourenplanPrintPagesForSections(sectionData),
    [sectionData],
  );
  const [paginationMeasurement, setPaginationMeasurement] = React.useState<{
    pageCapacityPx: number;
    cardHeights: Record<string, number>;
  } | null>(null);

  React.useEffect(() => {
    setPaginationMeasurement(null);
  }, [fontSize, measuredSections, orientation, printMode, reportRequestId, useShortCodes]);

  const measuredPages = React.useMemo(
    () => (
      sectionData.length > 0 && paginationMeasurement
        ? paginateTourenplanPrintSections({
            sections: measuredSections,
            pageCapacityPx: paginationMeasurement.pageCapacityPx,
            cardHeights: paginationMeasurement.cardHeights,
          })
        : []
    ),
    [measuredSections, paginationMeasurement, sectionData.length],
  );
  const pages = React.useMemo(
    () => (
      typeof window === "undefined" || measuredPages.length === 0
        ? estimatedPages
        : measuredPages
    ),
    [estimatedPages, measuredPages],
  );
  const isPaginationMeasuring = typeof window !== "undefined"
    && isPreviewOpen
    && sectionData.length > 0
    && paginationMeasurement === null;

  React.useEffect(() => {
    setActivePageIndex(0);
  }, [pages.length]);

  const dialogWidthClassName = orientation === "portrait" ? "w-[calc(210mm+88px)]" : undefined;
  const isGenerateDisabled = selectedItems.length === 0 || previewRequest.fromDate.length === 0;
  const normalizedPreviewError = isPreviewError
    ? normalizeServerError(previewError, { title: "Druckvorschau konnte nicht geladen werden" })
    : null;
  const rangeMetaLabel = React.useMemo(() => {
    const from = activeTab === "calendarWeek" ? kwRange?.fromDate : fromDate;
    const to = activeTab === "calendarWeek" ? kwRange?.toDate : toDate;
    if (!from) return "";
    if (to && to !== from) {
      return `${formatDisplayDate(from)} bis ${formatDisplayDate(to)}`;
    }
    return formatDisplayDate(from);
  }, [activeTab, fromDate, kwRange?.fromDate, kwRange?.toDate, toDate]);
  const selectedToursLabel = allToursSelected
    ? "Alle Touren"
    : `${selectedItems.length} Auswahl`;

  const resolveStandaloneLaunch = React.useCallback((): TourenplanStandaloneLaunch | null => {
    const from = activeTab === "calendarWeek" ? (kwRange?.fromDate ?? "") : fromDate;
    const to = activeTab === "calendarWeek" ? kwRange?.toDate : toDate;
    if (from.trim().length === 0) return null;
    return {
      reportType: "tourenplan",
      activeTab,
      fromDate: from,
      toDate: to && to.trim().length > 0 ? to : undefined,
      kwStart: activeTab === "calendarWeek" ? kwStart : undefined,
      weekCount: activeTab === "calendarWeek" ? weekCount : undefined,
      productCategoryIds: [],
      componentCategoryIds: [],
      tagIds: [],
      saunaModels: [],
      useShortCodes,
      allToursSelected,
      selectedTourIds: allToursSelected ? [] : selectedTourIds,
      includeWithoutTour,
      printMode,
      fontSize,
      orientation,
    };
  }, [
    activeTab,
    allToursSelected,
    fontSize,
    fromDate,
    includeWithoutTour,
    kwRange?.fromDate,
    kwRange?.toDate,
    kwStart,
    orientation,
    printMode,
    selectedTourIds,
    toDate,
    useShortCodes,
    weekCount,
  ]);

  const openReport = React.useCallback((openPrintPreview = false) => {
    if (!resolveStandaloneLaunch()) return;
    setIsReportOpen(true);
    setIsPreviewOpen(openPrintPreview);
    setReportRequestId((current) => current + 1);
  }, [resolveStandaloneLaunch]);

  const openReportInTab = React.useCallback(() => {
    const launch = resolveStandaloneLaunch();
    if (!launch) return;
    window.open(buildStandaloneReportUrl(launch), "_blank");
  }, [buildStandaloneReportUrl, resolveStandaloneLaunch]);

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
        optionsSlot={(
          <>
            <div className="h-full min-w-[210px] rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700" data-testid="reports-tourenplan-tour-list">
              <label className="flex cursor-pointer items-center gap-2 py-1 text-xs font-semibold text-slate-700">
                <Checkbox
                  checked={allToursSelected}
                  onCheckedChange={(checked) => toggleAllTours(Boolean(checked))}
                  data-testid="checkbox-reports-tourenplan-all-tours"
                />
                <span>Alle Touren</span>
              </label>
              <div className="mt-1 max-h-36 space-y-1 overflow-y-auto border-t border-slate-100 pt-1">
                {activeTours.map((tour) => (
                  <label key={tour.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-slate-600">
                    <Checkbox
                      checked={allToursSelected || selectedTourIdSet.has(tour.id)}
                      onCheckedChange={(checked) => toggleTour(tour.id, Boolean(checked))}
                      data-testid={`checkbox-reports-tourenplan-tour-${tour.id}`}
                    />
                    <span className="min-w-0 truncate">{tour.name}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 py-1 pt-2 text-xs text-slate-600">
                  <Checkbox
                    checked={includeWithoutTour}
                    onCheckedChange={(checked) => setIncludeWithoutTour(Boolean(checked))}
                    data-testid="checkbox-reports-tourenplan-without-tour"
                  />
                  <span>Ohne Tour</span>
                </label>
              </div>
            </div>

            <div className="flex h-full w-fit flex-col items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700" data-testid="reports-tourenplan-filter-box">
              <label className="flex cursor-pointer items-center gap-2.5" data-testid="reports-tourenplan-shortcodes-option">
                <Checkbox
                  checked={useShortCodes}
                  onCheckedChange={(nextChecked) => setUseShortCodes(Boolean(nextChecked))}
                  data-testid="checkbox-reports-tourenplan-use-shortcodes"
                />
                <span className="text-sm text-slate-600">Shortcodes verwenden</span>
              </label>

              <div className="space-y-2">
                <div className="flex items-center gap-2" data-testid="reports-tourenplan-font-size-option">
                  <span className="text-sm text-slate-600">Schriftgröße</span>
                  <Select
                    value={fontSize}
                    onValueChange={(value) => {
                      const nextFontSize = value === "small" || value === "large" ? value : "medium";
                      setFontSize(nextFontSize);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[120px] bg-white text-xs" data-testid="select-reports-tourenplan-font-size">
                      <SelectValue placeholder="Schriftgröße" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin ? (
                  <ToggleGroup
                    type="single"
                    value={printMode}
                    onValueChange={(value) => {
                      if (value === "farbdruck" || value === "spardruck") {
                        setPrintMode(value);
                      }
                    }}
                    className="flex w-fit items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-1"
                    data-testid="reports-tourenplan-print-mode-toggle"
                  >
                    <ToggleGroupItem
                      value="farbdruck"
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:text-slate-700",
                        "data-[state=on]:border-amber-200 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:shadow-sm",
                      )}
                      data-testid="button-reports-tourenplan-print-mode-farbdruck"
                    >
                      Farbdruck
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="spardruck"
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:text-slate-700",
                        "data-[state=on]:border-slate-400 data-[state=on]:bg-white data-[state=on]:text-slate-700 data-[state=on]:shadow-sm",
                      )}
                      data-testid="button-reports-tourenplan-print-mode-spardruck"
                    >
                      Spardruck
                    </ToggleGroupItem>
                  </ToggleGroup>
                ) : null}
              </div>
              {quickRangeOptions}
            </div>
          </>
        )}
        footer={(
          <ReportOpenToggle
            disabled={isGenerateDisabled}
            onOpen={() => openReport(false)}
            onOpenInTab={openReportInTab}
            openTestId="button-reports-tourenplan-generate"
            openInTabTestId="button-reports-tourenplan-open-tab"
          />
        )}
        testId="reports-tourenplan-config-panel"
      >
        <DateRangeKwRangePanel
          mode={activeTab}
          onModeChange={(nextMode) => {
            setActiveTab(nextMode);
            void persistRangeConfig({ activeTab: nextMode });
          }}
          fromDate={activeTab === "date" ? fromDate : (kwRange?.fromDate ?? "")}
          toDate={activeTab === "date" ? toDate : (kwRange?.toDate ?? "")}
          onFromDateChange={(nextValue) => {
            setFromDate(nextValue);
            void persistRangeConfig({ fromDate: nextValue });
          }}
          onToDateChange={(nextValue) => {
            const resolved = resolveRequiredToDate(nextValue, defaultReportRange.toDate);
            setToDate(resolved);
            void persistRangeConfig({ toDate: resolved });
          }}
          kwStart={kwStart ?? defaultIsoWeek}
          kwStartMax={kwStartMax}
          weekCount={weekCount}
          onKwStartChange={(nextValue) => {
            setKwStart(nextValue);
            void persistRangeConfig({ kwStart: nextValue });
          }}
          onWeekCountChange={(nextValue) => {
            setWeekCount(nextValue);
            void persistRangeConfig({ weekCount: nextValue });
          }}
          togglePrefix="reports-tourenplan"
          fromDateTestId="reports-tourenplan-from-date"
          toDateTestId="reports-tourenplan-to-date"
          kwStartInputTestId="input-reports-tourenplan-kw-start"
          kwStartIncrementTestId="button-reports-tourenplan-kw-start-up"
          kwStartDecrementTestId="button-reports-tourenplan-kw-start-down"
          weekCountInputTestId="input-reports-tourenplan-week-count"
          weekCountIncrementTestId="button-reports-tourenplan-week-count-up"
          weekCountDecrementTestId="button-reports-tourenplan-week-count-down"
          rangeSummaryTestId="reports-tourenplan-date-summary"
        />
      </ReportConfigPanel>

      {overlayHost ? createPortal(
        <ReportResultOverlayShell
          open={isReportOpen}
          title="Tourenplan"
          metaLabel={`${rangeMetaLabel}${selectedToursLabel ? ` · ${selectedToursLabel}` : ""}`}
          onOpenPrintPreview={() => setIsPreviewOpen(true)}
          onBack={() => {
            setIsReportOpen(false);
            setIsPreviewOpen(false);
          }}
          printPreviewDisabled={isGenerateDisabled}
          testId="reports-tourenplan-overlay"
          printPreviewTestId="button-reports-tourenplan-print-preview"
          backTestId="button-reports-tourenplan-back"
          contentClassName="overflow-auto bg-slate-100 p-6"
        >
          {isPreviewLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground">
                <span>Report wird geladen...</span>
              </div>
            </div>
          ) : normalizedPreviewError ? (
            <DialogBaseInlineMessage className="bg-white text-sm" error={normalizedPreviewError} />
          ) : (
            <section className="space-y-4" data-testid="reports-tourenplan-result">
              {measuredSections.length > 0 ? measuredSections.map((section) => (
                <article key={section.sectionKey} className="rounded-md border border-border/60 bg-background/70 p-4" data-testid={`reports-tourenplan-result-${section.sectionKey}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">{section.tourName}</h4>
                    <span className="text-xs text-muted-foreground">
                      {section.weeks.reduce((count, week) => count + week.appointments.length, 0)} Termine
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {section.weeks.map((week) => (
                      <div key={week.weekStart} className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KW {week.weekNumber}</div>
                        {week.weekNotes.filter((note) => note.print).map((note) => (
                          <TourenplanWeekNoteStrip
                            key={note.id}
                            note={note}
                            printMode={printMode}
                          />
                        ))}
                        {week.appointments.length > 0 ? week.appointments.map((appointment, appointmentIndex) => (
                          <TourenplanAppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            printMode={printMode}
                            fontSize={fontSize}
                            useShortCodes={useShortCodes}
                            dataKwStart={appointmentIndex === 0 ? week.weekStart : undefined}
                            testId={`reports-tourenplan-result-appointment-${appointment.id}`}
                          />
                        )) : (
                          <p className="text-sm text-muted-foreground">Keine Termine.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              )) : (
                <p className="text-sm text-muted-foreground">Keine Tourenplan-Daten für die aktuelle Auswahl gefunden.</p>
              )}
            </section>
          )}
        </ReportResultOverlayShell>,
        overlayHost,
      ) : null}

      {isPreviewOpen && sectionData.length > 0 ? (
        <TourenplanPaginationMeasurement
          sections={measuredSections}
          printMode={printMode}
          fontSize={fontSize}
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

      <ReportPrintPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title="Druckvorschau - Tourenplan"
        dialogWidthClassName={dialogWidthClassName}
        pages={pages}
        activePageIndex={activePageIndex}
        onPageChange={setActivePageIndex}
        testIdPrefix="tourenplan-print-preview"
        dialogTestId="dialog-tourenplan-print-preview"
        showPageMetaBar={false}
        pageOrientation={orientation}
        onPageOrientationChange={setOrientation}
        orientationTestIdPrefix="button-reports-tourenplan-orientation"
        getPageKey={(page) => page.pageNumber}
        onPrint={() => window.print()}
        printDisabled={pages.length === 0 || isPaginationMeasuring}
        printTestId="button-reports-tourenplan-print"
        renderPage={(page) => (
          <TourenplanPrintPage
            page={page}
            printMode={printMode}
            fontSize={fontSize}
            orientation={orientation}
            useShortCodes={useShortCodes}
            testId={`tourenplan-print-page-${page.pageNumber}`}
          />
        )}
        loadingState={isPreviewLoading || isPaginationMeasuring ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
        errorState={normalizedPreviewError ? (
          <DialogBaseInlineMessage className="mx-auto max-w-xl bg-white text-sm" error={normalizedPreviewError} />
        ) : null}
      />
    </>
  );
}
