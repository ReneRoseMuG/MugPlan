import React from "react";

import { formatTourPrintDateShort } from "@/lib/tour-print-preview";
import { PrintDayColumn } from "@/components/print/PrintDayColumn";

type CalendarTourPrintDayColumnProps = {
  dateKey: string;
};

export function CalendarTourPrintDayColumn({ dateKey }: CalendarTourPrintDayColumnProps) {
  return <PrintDayColumn label={formatTourPrintDateShort(dateKey)} dateKey={dateKey} />;
}
