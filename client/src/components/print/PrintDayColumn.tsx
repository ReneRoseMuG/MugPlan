import React from "react";

type PrintDayColumnProps = {
  label: string;
  dateKey: string;
};

export function PrintDayColumn({ label, dateKey }: PrintDayColumnProps) {
  return (
    <div
      className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
      data-testid={`tour-print-day-column-${dateKey}`}
    >
      {label}
    </div>
  );
}
