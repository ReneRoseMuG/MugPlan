import React from "react";
import type { ReactNode } from "react";
import { PrintPageShell } from "./PrintPageShell";
import { PrintDayColumn } from "./PrintDayColumn";

type PrintWeekDay = {
  dateKey: string;
  label: string;
  children: ReactNode;
};

type PrintWeekPageProps = {
  header: ReactNode;
  days: PrintWeekDay[];
  gridTemplate: string;
  testId?: string;
  gridTestId?: string;
};

export function PrintWeekPage({ header, days, gridTemplate, testId, gridTestId }: PrintWeekPageProps) {
  return (
    <PrintPageShell orientation="landscape" testId={testId}>
      {header}
      <div className="grid gap-3" style={{ gridTemplateColumns: gridTemplate }} data-testid={gridTestId}>
        {days.map((day) => (
          <PrintDayColumn key={day.dateKey} label={day.label} dateKey={day.dateKey}>
            {day.children}
          </PrintDayColumn>
        ))}
      </div>
    </PrintPageShell>
  );
}
