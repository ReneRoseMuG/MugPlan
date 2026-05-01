import React from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeIsoWeekInput, stepIsoWeekValue } from "@/lib/isoWeekInput";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
  showEmployeeFilter?: boolean;
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
  weekLanesCollapsed?: boolean;
  onWeekLanesCollapsedChange?: (collapsed: boolean) => void;
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

function renderConflictControls({
  conflictHighlightActive,
  conflictAppointmentCount,
  onConflictHighlightChange,
}: {
  conflictHighlightActive: boolean;
  conflictAppointmentCount?: number;
  onConflictHighlightChange?: (active: boolean) => void;
}) {
  return (
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
  );
}

export function CalendarFilterPanel({
  employeeId,
  onEmployeeIdChange,
  showEmployeeFilter = true,
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
}: CalendarFilterPanelProps) {
  const showConflictHighlightControls =
    typeof conflictAppointmentCount === "number" &&
    conflictAppointmentCount > 0 &&
    typeof onConflictHighlightChange === "function";
  const showKwJumpControls =
    showKwJump &&
    typeof onKwJumpChange === "function" &&
    typeof onKwJumpSubmit === "function";

  if (showWeekDisplayMode) {
    const weekGridTemplateColumns = [
      ...(showEmployeeFilter ? ["180px"] : []),
      ...(showKwJumpControls ? ["max-content"] : []),
      ...(showConflictHighlightControls ? ["max-content"] : []),
    ].join(" ");

    return (
      <FilterPanel title="Kalenderfilter" layout="stack">
        <div
          className="grid min-h-[56px] items-start gap-x-4 gap-y-0.5 px-4 py-1"
          style={{ gridTemplateColumns: weekGridTemplateColumns }}
          data-testid="calendar-week-footer-grid"
        >
          {showEmployeeFilter ? <FooterSectionLabel>Mitarbeiter</FooterSectionLabel> : null}
          {showKwJumpControls ? <FooterSectionLabel>KW</FooterSectionLabel> : null}
          {showConflictHighlightControls ? <FooterSectionLabel>Konflikte</FooterSectionLabel> : null}

          {showEmployeeFilter ? (
            <div className="w-full">
              <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} triggerClassName="w-full" />
            </div>
          ) : null}
          {showKwJumpControls ? (
            <div>
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
            </div>
          ) : null}
          {showConflictHighlightControls ? renderConflictControls({
            conflictHighlightActive,
            conflictAppointmentCount,
            onConflictHighlightChange,
          }) : null}
        </div>
      </FilterPanel>
    );
  }

  const monthGridTemplateColumns = [
    ...(showEmployeeFilter ? ["220px"] : []),
    ...(showKwJumpControls ? ["max-content"] : []),
    ...(showConflictHighlightControls ? ["max-content"] : []),
  ].join(" ");

  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div
        className="grid w-full items-start gap-x-4 gap-y-1"
        style={{ gridTemplateColumns: monthGridTemplateColumns }}
      >
        {showEmployeeFilter ? <Label className="text-xs">Mitarbeiter</Label> : null}
        {showKwJumpControls ? <Label className="text-xs">KW</Label> : null}
        {showConflictHighlightControls ? <Label className="text-xs">Konflikte</Label> : null}

        {showEmployeeFilter ? <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} /> : null}
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
        {showConflictHighlightControls ? renderConflictControls({
          conflictHighlightActive,
          conflictAppointmentCount,
          onConflictHighlightChange,
        }) : null}
      </div>
    </FilterPanel>
  );
}
