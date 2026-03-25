import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import type { Note } from "@shared/schema";
import { CalendarWeekNotesDialog } from "./CalendarWeekNotesDialog";

type CalendarWeekNotesButtonProps = {
  yearNumber: number;
  weekNumber: number;
  tourId: number | null;
  tourLabel: string;
  readOnly?: boolean;
};

export function CalendarWeekNotesButton({ yearNumber, weekNumber, tourId, tourLabel, readOnly }: CalendarWeekNotesButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const tourSegment = tourId === null ? "0" : String(tourId);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["calendarWeekNotes", yearNumber, weekNumber, tourId],
    queryFn: async () => {
      const res = await fetch(`/api/calendar-weeks/${yearNumber}/${weekNumber}/tours/${tourSegment}/notes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load calendar week notes");
      return res.json();
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        data-testid={`calendar-week-notes-button-${yearNumber}-${weekNumber}-${tourSegment}`}
      >
        <StickyNote className="h-3.5 w-3.5" />
        <span>{notes.length}</span>
      </button>

      <CalendarWeekNotesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        yearNumber={yearNumber}
        weekNumber={weekNumber}
        tourId={tourId}
        title={tourLabel}
        readOnly={readOnly}
      />
    </>
  );
}
