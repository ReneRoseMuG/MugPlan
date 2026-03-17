import React from "react";
import type { ReactNode } from "react";

import { formatTourPrintDateShort } from "@/lib/tour-print-preview";
import { PrintDayColumn } from "@/components/print/PrintDayColumn";

type CalendarTourPrintDayColumnProps = {
  dateKey: string;
  children: ReactNode;
};

export function CalendarTourPrintDayColumn({ dateKey, children }: CalendarTourPrintDayColumnProps) {
  return (
    <PrintDayColumn label={formatTourPrintDateShort(dateKey)} dateKey={dateKey}>
      {children}
    </PrintDayColumn>
  );
}
