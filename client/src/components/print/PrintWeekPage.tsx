import React from "react";
import type { ReactNode } from "react";
import { PrintPageShell } from "./PrintPageShell";
import { PrintDayColumn } from "./PrintDayColumn";

type PrintWeekDay = {
  dateKey: string;
  label: string;
};

type PrintWeekPageProps = {
  header: ReactNode;
  days: PrintWeekDay[];
  appointmentRows: ReactNode[][];
  gridTemplate: string;
  testId?: string;
  gridTestId?: string;
};

export function PrintWeekPage({ header, days, appointmentRows, gridTemplate, testId, gridTestId }: PrintWeekPageProps) {
  return (
    <PrintPageShell orientation="landscape" testId={testId}>
      {header}
      <div
        className="grid gap-x-3"
        style={{ gridTemplateColumns: gridTemplate }}
        data-testid={gridTestId}
      >
        {days.map((day) => (
          <PrintDayColumn key={day.dateKey} label={day.label} dateKey={day.dateKey} />
        ))}
        {appointmentRows.flatMap((row, rowIdx) =>
          days.map((_day, colIdx) => (
            <div key={`${rowIdx}-${colIdx}`} className="pt-1.5">
              {row[colIdx]}
            </div>
          ))
        )}
      </div>
    </PrintPageShell>
  );
}
