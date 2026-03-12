import React from "react";

import type { TourPrintSummaryRow } from "@/lib/tour-print-preview";

type CalendarTourPrintSummaryTableProps = {
  rows: TourPrintSummaryRow[];
};

export function CalendarTourPrintSummaryTable({ rows }: CalendarTourPrintSummaryTableProps) {
  return (
    <section className="space-y-3" data-testid="tour-print-summary-section">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Terminliste</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm" data-testid="tour-print-summary-table">
          <thead className="bg-slate-100 text-left text-[11px] uppercase tracking-[0.2em] text-slate-600">
            <tr>
              <th className="border-r border-slate-200 px-4 py-3">Datum</th>
              <th className="border-r border-slate-200 px-4 py-3">Dauer in Tagen</th>
              <th className="border-r border-slate-200 px-4 py-3">Saunamodell</th>
              <th className="px-4 py-3">Postleitzahl</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-t border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}`}
                data-testid={`tour-print-summary-row-${row.id}`}
              >
                <td className="border-r border-slate-200 px-4 py-3.5 text-slate-800">{row.dateLabel}</td>
                <td className="border-r border-slate-200 px-4 py-3.5 text-slate-700">{row.durationDays}</td>
                <td className="border-r border-slate-200 px-4 py-3.5 text-slate-700">{row.saunaModel}</td>
                <td className="px-4 py-3.5 text-slate-700">{row.postalCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
