import React from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import type { Tour } from "@shared/schema";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
  showWeekDisplayMode?: boolean;
  conflictHighlightActive?: boolean;
  conflictAppointmentCount?: number;
  onConflictHighlightChange?: (active: boolean) => void;
  showKwJump?: boolean;
  kwJumpValue?: string;
  kwJumpError?: boolean;
  onKwJumpChange?: (value: string) => void;
  onKwJumpSubmit?: () => void;
  showKwJumpBack?: boolean;
  onKwJumpBack?: () => void;
  selectedPrintTourId?: number | null;
  onSelectedPrintTourIdChange?: (tourId: number | null) => void;
  printWeekCount?: number;
  onPrintWeekCountChange?: (weekCount: number) => void;
  onOpenPrintPreview?: () => void;
  printStartNextWeek?: boolean;
  onPrintStartNextWeekChange?: (value: boolean) => void;
}

function buildStartDateTitle(nextWeek: boolean): string {
  return nextWeek ? "Startet nächste Woche" : "Start diese Woche";
}

function buildStartDateValue(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return format(targetMonday, "EEE dd.MM.yyyy", { locale: de });
}

export function CalendarFilterPanel({
  employeeId,
  onEmployeeIdChange,
  showWeekDisplayMode = false,
  conflictHighlightActive = false,
  conflictAppointmentCount,
  onConflictHighlightChange,
  showKwJump = false,
  kwJumpValue = "",
  kwJumpError = false,
  onKwJumpChange,
  onKwJumpSubmit,
  showKwJumpBack = false,
  onKwJumpBack,
  selectedPrintTourId,
  onSelectedPrintTourIdChange,
  printWeekCount,
  onPrintWeekCountChange,
  onOpenPrintPreview,
  printStartNextWeek = false,
  onPrintStartNextWeekChange,
}: CalendarFilterPanelProps) {
  const weekActionPanelClassName = "flex h-full min-h-[116px] flex-col rounded-xl px-4 py-3 shadow-sm";
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const showWeekPrintControls =
    showWeekDisplayMode &&
    typeof onSelectedPrintTourIdChange === "function" &&
    typeof onPrintWeekCountChange === "function" &&
    typeof onOpenPrintPreview === "function" &&
    typeof printWeekCount === "number";

  const startDateTitle = buildStartDateTitle(printStartNextWeek);
  const startDateValue = buildStartDateValue(printStartNextWeek);
  const showConflictHighlightControls =
    typeof conflictAppointmentCount === "number" &&
    conflictAppointmentCount > 0 &&
    typeof onConflictHighlightChange === "function";
  const showKwJumpControls =
    showKwJump &&
    typeof onKwJumpChange === "function" &&
    typeof onKwJumpSubmit === "function";

  const weekJumpControls = showKwJumpControls ? (
    <div className="flex flex-wrap items-end gap-3" data-testid="calendar-panel-kw-inline">
      <div className="flex w-[9ch] flex-col gap-1">
        <Label className="text-xs" htmlFor="input-calendar-kw-jump">
          KW:
        </Label>
        <Input
          id="input-calendar-kw-jump"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={kwJumpValue}
          className={kwJumpError ? "border-destructive ring-1 ring-destructive/30" : undefined}
          onChange={(event) => onKwJumpChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onKwJumpSubmit();
            }
          }}
          onBlur={() => {
            if (kwJumpValue.trim().length > 0) {
              onKwJumpSubmit();
            }
          }}
          data-testid="input-calendar-kw-jump"
        />
      </div>
      {showKwJumpBack && typeof onKwJumpBack === "function" ? (
        <Button
          type="button"
          variant="outline"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onKwJumpBack}
          data-testid="button-calendar-kw-jump-back"
        >
          ← Zurück
        </Button>
      ) : null}
    </div>
  ) : null;

  const conflictControls = showConflictHighlightControls ? (
    <div
      className={`${weekActionPanelClassName} border border-destructive/20 bg-destructive/5`}
      data-testid="calendar-panel-conflicts"
    >
      <div className="flex h-full flex-1 flex-col justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <Label className="text-xs font-semibold text-destructive">Konflikte hervorheben</Label>
          </div>
          <span
            className="inline-flex items-center rounded-full bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground"
            data-testid="badge-conflict-appointment-count"
          >
            {conflictAppointmentCount}
          </span>
        </div>
        <div className="mt-3">
          <Switch
            checked={conflictHighlightActive}
            onCheckedChange={onConflictHighlightChange}
            data-testid="switch-conflict-highlight"
          />
        </div>
      </div>
    </div>
  ) : null;

  if (showWeekDisplayMode && showWeekPrintControls) {
    return (
      <FilterPanel title="Kalenderfilter" layout="stack">
        <div className="flex w-full flex-wrap items-start gap-4 xl:flex-nowrap" data-testid="calendar-week-toolbar-row">
          <div
            className="flex min-w-[220px] flex-1 flex-wrap items-end gap-4 xl:max-w-xl"
            data-testid="calendar-panel-employee-filter"
          >
            <div className="flex min-w-[220px] flex-1 flex-col gap-1 xl:max-w-xs">
              <Label className="text-xs">Mitarbeiter</Label>
              <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
            </div>
            {weekJumpControls}
          </div>

          <div
            className="ml-auto flex flex-wrap items-stretch justify-end gap-4"
            data-testid="calendar-week-action-row"
          >
            {conflictControls}
            <div
              className={`${weekActionPanelClassName} border border-primary/15 bg-primary/5`}
              data-testid="calendar-panel-print"
            >
              <div className="mb-3">
                <Label className="text-xs font-semibold text-primary">Wochenplanung drucken</Label>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <Label className="text-xs">Tour</Label>
                  <Select
                    value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
                    onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
                  >
                    <SelectTrigger className="w-[12ch] bg-white" data-testid="select-tour-print-preview">
                      <SelectValue placeholder="Tour" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tour</SelectItem>
                      <SelectItem value="0">Ohne Tour</SelectItem>
                      {tours.map((tour) => (
                        <SelectItem key={tour.id} value={String(tour.id)}>
                          {tour.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex w-[14ch] flex-col gap-1">
                  <Label className="text-xs">Anzahl Wochen</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={String(printWeekCount)}
                    onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
                    data-testid="input-tour-print-week-count"
                  />
                </div>

                {typeof onPrintStartNextWeekChange === "function" ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-xs" data-testid="label-print-start-title">
                      {startDateTitle}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={printStartNextWeek}
                        onCheckedChange={onPrintStartNextWeekChange}
                        data-testid="switch-print-start-next-week"
                      />
                      <span className="text-xs text-muted-foreground" data-testid="label-print-start-date">
                        {startDateValue}
                      </span>
                    </div>
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenPrintPreview}
                  disabled={selectedPrintTourId === null}
                  data-testid="button-open-tour-print-preview"
                >
                  Drucken
                </Button>
              </div>
            </div>
          </div>
        </div>
      </FilterPanel>
    );
  }

  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div className="flex w-full flex-wrap items-start gap-4">
        <div className="flex min-w-[220px] flex-col gap-1">
          <Label className="text-xs">Mitarbeiter</Label>
          <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
        </div>
        {showWeekPrintControls ? (
          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 shadow-sm">
            <div className="mb-3">
              <Label className="text-xs font-semibold text-primary">Wochenplanung drucken</Label>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Label className="text-xs">Tour</Label>
                <Select
                  value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
                  onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
                >
                  <SelectTrigger className="w-[12ch] bg-white" data-testid="select-tour-print-preview">
                    <SelectValue placeholder="Tour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tour</SelectItem>
                    <SelectItem value="0">Ohne Tour</SelectItem>
                    {tours.map((tour) => (
                      <SelectItem key={tour.id} value={String(tour.id)}>
                        {tour.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[14ch] flex-col gap-1">
                <Label className="text-xs">Anzahl Wochen</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={String(printWeekCount)}
                  onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
                  data-testid="input-tour-print-week-count"
                />
              </div>
              {showWeekPrintControls && typeof onPrintStartNextWeekChange === "function" ? (
                <div className="flex min-w-0 flex-col gap-1">
                  <Label className="text-xs" data-testid="label-print-start-title">
                    {startDateTitle}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printStartNextWeek}
                      onCheckedChange={onPrintStartNextWeekChange}
                      data-testid="switch-print-start-next-week"
                    />
                    <span className="text-xs text-muted-foreground" data-testid="label-print-start-date">
                      {startDateValue}
                    </span>
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={onOpenPrintPreview}
                disabled={selectedPrintTourId === null}
                data-testid="button-open-tour-print-preview"
              >
                Drucken
              </Button>
            </div>
          </div>
        ) : null}
        {weekJumpControls}
        {conflictControls}
      </div>
    </FilterPanel>
  );
}
