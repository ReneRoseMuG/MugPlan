import React from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, Printer } from "lucide-react";
import type { Tour } from "@shared/schema";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeIsoWeekInput, stepIsoWeekValue } from "@/lib/isoWeekInput";

type WeekAppointmentDisplayMode = "standard" | "compact" | "detail" | "split";

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
  onKwJumpValueCommit?: (value: string) => void;
  showKwJumpBack?: boolean;
  onKwJumpBack?: () => void;
  selectedPrintTourId?: number | null;
  onSelectedPrintTourIdChange?: (tourId: number | null) => void;
  printWeekCount?: number;
  onPrintWeekCountChange?: (weekCount: number) => void;
  onOpenPrintPreview?: () => void;
  printStartNextWeek?: boolean;
  onPrintStartNextWeekChange?: (value: boolean) => void;
  weekAppointmentDisplayMode?: WeekAppointmentDisplayMode;
  onWeekAppointmentDisplayModeChange?: (value: WeekAppointmentDisplayMode) => void;
  weekAppointmentDisplayModeDisabled?: boolean;
  weekLanesCollapsed?: boolean;
  onWeekLanesCollapsedChange?: (collapsed: boolean) => void;
}

function buildStartDateValue(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return format(targetMonday, "dd.MM.", { locale: de });
}

function FooterSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </span>
  );
}

function SpinnerButton({
  direction,
  onClick,
  disabled = false,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex flex-1 items-center justify-center px-1.5 text-slate-400 transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50 hover:text-slate-700"
      } ${direction === "up" ? "border-b border-slate-200" : ""}`}
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
      aria-hidden="true"
    >
      {direction === "up" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );
}

function KwJumpSpinner({
  value,
  min,
  max,
  error = false,
  onChange,
  onSubmit,
  onCommitValue,
}: {
  value: string;
  min: number;
  max: number;
  error?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onCommitValue?: (value: string) => void;
}) {
  const commitStep = (delta: number) => {
    const nextValue = String(Math.min(max, Math.max(min, stepIsoWeekValue(value, delta))));
    onChange?.(nextValue);
    onCommitValue?.(nextValue);
    if (!onCommitValue) {
      onSubmit?.();
    }
  };

  return (
    <div className="flex w-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Input
        id="input-calendar-kw-jump"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        value={value}
        aria-invalid={error || undefined}
        className={`h-9 rounded-none border-0 px-3 text-left text-sm font-semibold text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
          error ? "bg-destructive/5 text-destructive" : ""
        }`}
        onChange={(event) => onChange?.(sanitizeIsoWeekInput(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        onBlur={() => {
          if (value.trim().length > 0) {
            onSubmit?.();
          }
        }}
        data-testid="input-calendar-kw-jump"
      />
      <div className="flex w-6 flex-col border-l border-slate-200">
        <SpinnerButton direction="up" onClick={() => commitStep(1)} />
        <SpinnerButton direction="down" onClick={() => commitStep(-1)} />
      </div>
    </div>
  );
}

function NumberSpinner({
  value,
  min,
  max,
  onChange,
  testId,
}: {
  value: number;
  min: number;
  max: number;
  onChange?: (value: number) => void;
  testId?: string;
}) {
  const setValue = (nextValue: number) => {
    onChange?.(Math.min(max, Math.max(min, nextValue)));
  };

  return (
    <div className="flex w-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        className="h-9 rounded-none border-0 px-3 text-left text-sm font-semibold text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
        onChange={(event) => {
          const sanitized = event.target.value.replace(/\D/g, "");
          if (sanitized.length === 0) return;
          setValue(Number.parseInt(sanitized, 10));
        }}
        data-testid={testId}
      />
      <div className="flex w-6 flex-col border-l border-slate-200">
        <SpinnerButton direction="up" onClick={() => setValue(value + 1)} />
        <SpinnerButton direction="down" onClick={() => setValue(value - 1)} />
      </div>
    </div>
  );
}

function SegmentedButtons({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: Array<{ value: string; label: string; secondaryLabel?: string; testId?: string }>;
  value: string;
  onChange?: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            data-testid={option.testId}
            className={`min-w-[96px] rounded-md px-3 py-1.5 text-left transition-all ${
              isActive
                ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            } ${compact ? "text-[10px] font-semibold leading-none" : ""}`}
          >
            <div className={`${compact ? "text-[10px]" : "text-[10px]"} font-semibold leading-none`}>
              {option.label}
            </div>
            {option.secondaryLabel ? (
              <div className="mt-1 text-xs font-bold leading-none">{option.secondaryLabel}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
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
  onKwJumpValueCommit,
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
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const showWeekPrintControls =
    showWeekDisplayMode &&
    typeof onSelectedPrintTourIdChange === "function" &&
    typeof onPrintWeekCountChange === "function" &&
    typeof onOpenPrintPreview === "function" &&
    typeof printWeekCount === "number";
  const showConflictHighlightControls =
    typeof conflictAppointmentCount === "number" &&
    conflictAppointmentCount > 0 &&
    typeof onConflictHighlightChange === "function";
  const showKwJumpControls =
    showKwJump &&
    typeof onKwJumpChange === "function" &&
    typeof onKwJumpSubmit === "function";

  if (showWeekDisplayMode && showWeekPrintControls) {
    return (
      <FilterPanel title="Kalenderfilter" layout="stack">
        <div
          className="grid min-h-[56px] items-start gap-x-4 gap-y-0.5 px-4 py-1"
          style={{
            gridTemplateColumns: "180px max-content max-content minmax(140px, max-content) max-content max-content max-content",
          }}
          data-testid="calendar-week-footer-grid"
        >
          {/* Zeile 1: Labels */}
          <FooterSectionLabel>Mitarbeiter</FooterSectionLabel>
          <FooterSectionLabel>KW</FooterSectionLabel>
          {showConflictHighlightControls ? (
            <FooterSectionLabel>Konflikte</FooterSectionLabel>
          ) : (
            <div />
          )}
          <div className="pl-6">
            <FooterSectionLabel>Planung drucken</FooterSectionLabel>
          </div>
          <FooterSectionLabel>Wochen</FooterSectionLabel>
          <FooterSectionLabel>Beginn</FooterSectionLabel>
          <div />

          {/* Zeile 2: Controls */}
          <div className="w-full">
            <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} triggerClassName="w-full" />
          </div>
          <div>
            {showKwJumpControls ? (
              <div className="flex items-center gap-2">
                <KwJumpSpinner
                  value={kwJumpValue}
                  min={1}
                  max={53}
                  error={kwJumpError}
                  onChange={onKwJumpChange}
                  onSubmit={onKwJumpSubmit}
                  onCommitValue={onKwJumpValueCommit}
                />
                {showKwJumpBack && typeof onKwJumpBack === "function" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    onClick={onKwJumpBack}
                    data-testid="button-calendar-kw-jump-back"
                  >
                    ← Zurück
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {showConflictHighlightControls ? (
            <button
              type="button"
              className={`inline-flex min-h-9 min-w-[172px] items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                conflictHighlightActive
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
              onClick={() => onConflictHighlightChange?.(!conflictHighlightActive)}
              data-testid="button-conflict-highlight"
            >
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 ${conflictHighlightActive ? "text-amber-500" : "text-slate-400"}`} />
                Hervorheben
              </span>
              <span
                className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  conflictHighlightActive ? "bg-amber-500 text-white" : "invisible"
                }`}
                data-testid="badge-conflict-appointment-count"
                aria-hidden={conflictHighlightActive ? undefined : "true"}
              >
                {conflictAppointmentCount}
              </span>
            </button>
          ) : (
            <div />
          )}
          <div className="pl-6" data-testid="calendar-panel-print">
            <Label className="sr-only">Tour</Label>
            <Select
              value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
              onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
            >
              <SelectTrigger className="h-9 min-w-[140px] bg-white" data-testid="select-tour-print-preview">
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
          <NumberSpinner
            value={printWeekCount}
            min={1}
            max={12}
            onChange={onPrintWeekCountChange}
            testId="input-tour-print-week-count"
          />
          <SegmentedButtons
            value={printStartNextWeek ? "next" : "current"}
            onChange={(value) => onPrintStartNextWeekChange?.(value === "next")}
            options={[
              {
                value: "current",
                label: "Diese Woche",
                secondaryLabel: `Mo. ${buildStartDateValue(false)}`,
                testId: "toggle-print-start-current-week",
              },
              {
                value: "next",
                label: "Nächste Woche",
                secondaryLabel: `Mo. ${buildStartDateValue(true)}`,
                testId: "toggle-print-start-next-week",
              },
            ]}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onOpenPrintPreview}
            disabled={selectedPrintTourId === null}
            data-testid="button-open-tour-print-preview"
            className="inline-flex h-9 items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Drucken
          </Button>
        </div>
      </FilterPanel>
    );
  }

  const conflictControls = showConflictHighlightControls ? (
    <button
      type="button"
      className={`inline-flex min-h-9 min-w-[172px] items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
        conflictHighlightActive
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
      }`}
      onClick={() => onConflictHighlightChange?.(!conflictHighlightActive)}
      data-testid="button-conflict-highlight"
    >
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className={`h-3.5 w-3.5 ${conflictHighlightActive ? "text-amber-500" : "text-slate-400"}`} />
        Hervorheben
      </span>
      <span
        className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
          conflictHighlightActive ? "bg-amber-500 text-white" : "invisible"
        }`}
        data-testid="badge-conflict-appointment-count"
        aria-hidden={conflictHighlightActive ? undefined : "true"}
      >
        {conflictAppointmentCount}
      </span>
    </button>
  ) : null;

  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div className="flex w-full flex-wrap items-start gap-4">
        <div className="min-w-[220px]">
          <Label className="text-xs">Mitarbeiter</Label>
          <div className="mt-1">
            <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
          </div>
        </div>
        {showKwJumpControls ? (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">KW</Label>
            <div className="flex items-end gap-2">
              <KwJumpSpinner
                value={kwJumpValue}
                min={1}
                max={53}
                error={kwJumpError}
                onChange={onKwJumpChange}
                onSubmit={onKwJumpSubmit}
                onCommitValue={onKwJumpValueCommit}
              />
              {showKwJumpBack && typeof onKwJumpBack === "function" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 self-end rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  onClick={onKwJumpBack}
                  data-testid="button-calendar-kw-jump-back"
                >
                  ← Zurück
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {conflictControls}
      </div>
    </FilterPanel>
  );
}
