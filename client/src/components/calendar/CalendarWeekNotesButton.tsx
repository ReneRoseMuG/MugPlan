import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import type { Note } from "@shared/schema";
import { CalendarWeekNotesDialog } from "./CalendarWeekNotesDialog";
import { format, getISOWeek, startOfISOWeek, endOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";

type CalendarWeekNotesButtonProps = {
  yearNumber: number;
  weekNumber: number;
  readOnly?: boolean;
};

export function CalendarWeekNotesButton({ yearNumber, weekNumber, readOnly }: CalendarWeekNotesButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["calendarWeekNotes", yearNumber, weekNumber],
    queryFn: async () => {
      const res = await fetch(`/api/calendar-weeks/${yearNumber}/${weekNumber}/notes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load calendar week notes");
      return res.json();
    },
  });

  const weekLabel = (() => {
    try {
      // Build an approximate date for the ISO week to get the label
      const jan4 = new Date(yearNumber, 0, 4);
      const weekStart = startOfISOWeek(new Date(jan4.getTime() + (weekNumber - getISOWeek(jan4)) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = endOfISOWeek(weekStart);
      return `KW ${weekNumber} · ${format(weekStart, "d. MMM", { locale: de })}–${format(weekEnd, "d. MMM yyyy", { locale: de })}`;
    } catch {
      return `KW ${weekNumber}`;
    }
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        data-testid={`calendar-week-notes-button-${yearNumber}-${weekNumber}`}
      >
        <StickyNote className="h-3.5 w-3.5" />
        <span>{notes.length}</span>
      </button>

      <CalendarWeekNotesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        yearNumber={yearNumber}
        weekNumber={weekNumber}
        weekLabel={weekLabel}
        readOnly={readOnly}
      />
    </>
  );
}
