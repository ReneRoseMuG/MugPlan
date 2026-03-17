import React from "react";
import type { ReactNode } from "react";

type PrintDayColumnProps = {
  label: string;
  dateKey: string;
  children: ReactNode;
};

export function PrintDayColumn({ label, dateKey, children }: PrintDayColumnProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50" data-testid={`tour-print-day-column-${dateKey}`}>
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        {label}
      </div>
      <div className="flex min-h-[540px] flex-col gap-2 px-2 py-2" data-testid={`tour-print-day-${dateKey}`}>
        {children}
      </div>
    </div>
  );
}
