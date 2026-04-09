import React, { type ReactNode } from "react";

import { HelpIcon } from "@/components/ui/help/help-icon";
import { defaultHeaderColor } from "@/lib/colors";

export type ReportConfigPanelMode = "date" | "calendarWeek";

type ReportConfigPanelProps = {
  title: string;
  helpKey?: string;
  actionButton?: ReactNode;
  children: ReactNode;
  optionsSlot?: ReactNode;
  secondaryOptionsSlot?: ReactNode;
  footer: ReactNode;
  testId?: string;
};

export function ReportConfigPanel({
  title,
  helpKey,
  actionButton,
  children,
  optionsSlot,
  secondaryOptionsSlot,
  footer,
  testId,
}: ReportConfigPanelProps) {
  return (
    <section
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid={testId}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-border px-5 py-2"
        style={{ backgroundColor: defaultHeaderColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-sm font-bold text-slate-800">{title}</span>
          {helpKey ? <HelpIcon helpKey={helpKey} size="sm" /> : null}
        </div>
        {actionButton}
      </div>

      {/* Body: linke Spalte (DateRange-Komponente) + rechte Spalte (Options) */}
      <div className="grid grid-cols-[auto_1fr] gap-6 px-5 py-4">
        {/* Linke Spalte: DateRange/KWRange Panel */}
        <div className="shrink-0">{children}</div>

        {/* Rechte Spalte: Options */}
        <div className="flex flex-col gap-4">
          {optionsSlot ? <div>{optionsSlot}</div> : null}
          {secondaryOptionsSlot ? <div>{secondaryOptionsSlot}</div> : null}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-2">
        {footer}
      </div>
    </section>
  );
}
