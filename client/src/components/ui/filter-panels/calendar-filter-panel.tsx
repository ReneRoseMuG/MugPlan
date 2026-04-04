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

function FooterCell({
  label,
  children,
  style,
  alignTop = false,
}: {
  label?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  alignTop?: boolean;
}) {
  return (
    <div
      style={style}
      className={[
        "flex min-h-[92px] flex-col gap-2 px-4 py-3",
        alignTop ? "justify-start" : "justify-center",
      ].join(" ")}
    >
      {label ? <FooterSectionLabel>{label}</FooterSectionLabel> : null}
      <div className="flex min-w-0 items-center gap-2.5">{children}</div>
    </div>
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
    const parsedValue = Number.parseInt(value, 10);
    const baseValue = Number.isFinite(parsedValue) ? parsedValue : min;
    const nextValue = String(Math.min(max, Math.max(min, baseValue + delta)));
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
        className={`h-9 rounded-none border-0 px-3 text-left text-sm font-semibold text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
          error ? "bg-destructive/5 text-destructive" : ""
        }`}
        onChange={(event) => onChange?.(event.target.value.replace(/\D/g, ""))}
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

const WEEK_DISPLAY_MODE_OPTIONS: Array<{ value: WeekAppointmentDisplayMode; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "compact", label: "Zentriert" },
  { value: "detail", label: "Gefüllt" },
  { value: "split", label: "Geteilt" },
];

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
  weekAppointmentDisplayMode = "standard",
  onWeekAppointmentDisplayModeChange,
  weekAppointmentDisplayModeDisabled = false,
  weekLanesCollapsed = false,
  onWeekLanesCollapsedChange,
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
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={{ display: "grid", gridTemplateColumns: "auto auto auto 32px auto" }}
          data-testid="calendar-week-footer-grid"
        >
          <FooterCell label="Mitarbeiter" style={{ gridColumn: 1, gridRow: 1 }}>
            <div className="min-w-[220px]">
              <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} triggerClassName="w-full" />
            </div>
          </FooterCell>

          <FooterCell label="Füllmodus" style={{ gridColumn: 2, gridRow: 1 }}>
            <div className="min-w-[180px]">
              <Select
                value={weekAppointmentDisplayMode}
                onValueChange={(value: WeekAppointmentDisplayMode) => onWeekAppointmentDisplayModeChange?.(value)}
                disabled={weekAppointmentDisplayModeDisabled}
              >
                <SelectTrigger className="h-9 min-w-[180px] bg-white" data-testid="select-week-display-mode">
                  <SelectValue placeholder="Füllmodus wählen" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DISPLAY_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FooterCell>

          {showConflictHighlightControls ? (
            <FooterCell
              label="Konflikte"
              style={{ gridColumn: 3, gridRow: 1 }}
              alignTop
            >
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
            </FooterCell>
          ) : (
            <div style={{ gridColumn: 3, gridRow: 1 }} />
          )}

          <div style={{ gridColumn: 4, gridRow: "1 / 3" }} />

          <div
            className="grid"
            style={{ gridColumn: 5, gridRow: "1 / 3", gridTemplateColumns: "auto auto", gridTemplateRows: "auto auto" }}
            data-testid="calendar-panel-print"
          >
            <div className="col-span-2 px-4 pb-0 pt-3">
              <FooterSectionLabel>Wochenplanung drucken</FooterSectionLabel>
            </div>

            <div className="flex items-center px-4 pb-3 pt-2">
              <div className="min-w-[150px]">
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
            </div>

            <div className="flex items-center gap-2 px-4 pb-3 pt-2">
              <NumberSpinner
                value={printWeekCount}
                min={1}
                max={12}
                onChange={onPrintWeekCountChange}
                testId="input-tour-print-week-count"
              />
              <span className="whitespace-nowrap text-xs text-slate-500">
                {printWeekCount === 1 ? "Woche" : "Wochen"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 px-4 py-3">
              <FooterSectionLabel>Beginn</FooterSectionLabel>
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
            </div>

            <div className="flex items-end px-4 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={onOpenPrintPreview}
                disabled={selectedPrintTourId === null}
                data-testid="button-open-tour-print-preview"
                className="inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Drucken
              </Button>
            </div>
          </div>

          <FooterCell label="Kalenderwoche" style={{ gridColumn: 1, gridRow: 2 }}>
            {showKwJumpControls ? (
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
            ) : null}
          </FooterCell>

          <FooterCell label="Touren" style={{ gridColumn: 2, gridRow: 2 }}>
            <SegmentedButtons
              value={weekLanesCollapsed ? "collapsed" : "expanded"}
              onChange={(value) => onWeekLanesCollapsedChange?.(value === "collapsed")}
              compact
              options={[
                { value: "expanded", label: "Aufgeklappt", testId: "toggle-week-lanes-expanded" },
                { value: "collapsed", label: "Zugeklappt", testId: "toggle-week-lanes-collapsed" },
              ]}
            />
          </FooterCell>

          <div
            style={{ gridColumn: 3, gridRow: 2 }}
            data-testid="calendar-week-footer-conflict-placeholder"
          />
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
            <Label className="text-xs">Kalenderwoche</Label>
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
