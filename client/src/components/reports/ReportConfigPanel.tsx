import React, { type ReactNode } from "react";
import { Calendar, CalendarDays } from "lucide-react";

import { HelpIcon } from "@/components/ui/help/help-icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { defaultHeaderColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

export type ReportConfigPanelMode = "date" | "calendarWeek";

type ReportConfigPanelProps = {
  title: string;
  helpKey?: string;
  mode: ReportConfigPanelMode;
  onModeChange: (mode: ReportConfigPanelMode) => void;
  actionButton?: ReactNode;
  children: ReactNode;
  optionsSlot?: ReactNode;
  footer: ReactNode;
  testId?: string;
  togglePrefix: string;
};

const modeOptions: Array<{
  value: ReportConfigPanelMode;
  label: string;
  icon: ReactNode;
}> = [
  { value: "date", label: "Datum", icon: <Calendar className="h-3.5 w-3.5" /> },
  { value: "calendarWeek", label: "Kalenderwoche", icon: <CalendarDays className="h-3.5 w-3.5" /> },
];

export function ReportConfigPanel({
  title,
  helpKey,
  mode,
  onModeChange,
  actionButton,
  children,
  optionsSlot,
  footer,
  testId,
  togglePrefix,
}: ReportConfigPanelProps) {
  return (
    <section
      className="flex w-[440px] min-w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid={testId}
    >
      <div
        className="flex items-center justify-between border-b border-border px-5 py-3"
        style={{ backgroundColor: defaultHeaderColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-sm font-bold text-slate-800">{title}</span>
          {helpKey ? <HelpIcon helpKey={helpKey} size="sm" /> : null}
        </div>
        {actionButton}
      </div>

      <div className="px-5 pb-4 pt-4">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value === "date" || value === "calendarWeek") {
              onModeChange(value);
            }
          }}
          className="flex w-fit items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-1"
          data-testid={`toggle-group-${togglePrefix}`}
        >
          {modeOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:text-slate-700",
                "data-[state=on]:border-slate-200 data-[state=on]:bg-white data-[state=on]:text-slate-800 data-[state=on]:shadow-sm",
              )}
              data-testid={`toggle-${togglePrefix}-${option.value}`}
            >
              {option.icon}
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="border-t border-slate-100" />

      <div className="flex-1 px-5 py-4">{children}</div>

      {optionsSlot ? (
        <>
          <div className="border-t border-slate-100" />
          <div className="px-5 py-3">{optionsSlot}</div>
        </>
      ) : null}

      <div className="mt-auto flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>
    </section>
  );
}
