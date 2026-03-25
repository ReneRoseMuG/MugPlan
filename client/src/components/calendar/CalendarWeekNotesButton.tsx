import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import type { Note } from "@shared/schema";
import { CalendarWeekNotesDialog } from "./CalendarWeekNotesDialog";

type CalendarWeekNotesButtonRenderProps = {
  iconSlot: React.ReactNode;
  countSlot: React.ReactNode;
  dialog: React.ReactNode;
};

type CalendarWeekNotesButtonProps = {
  yearNumber: number;
  weekNumber: number;
  tourId: number | null;
  tourLabel: string;
  readOnly?: boolean;
  children: (props: CalendarWeekNotesButtonRenderProps) => React.ReactNode;
};

export function CalendarWeekNotesButton({
  yearNumber,
  weekNumber,
  tourId,
  tourLabel,
  readOnly,
  children,
}: CalendarWeekNotesButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const tourSegment = tourId === null ? "0" : String(tourId);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["calendarWeekNotes", yearNumber, weekNumber, tourId],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar-weeks/${yearNumber}/${weekNumber}/tours/${tourSegment}/notes`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load calendar week notes");
      return res.json();
    },
  });

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogOpen(true);
  };

  const iconSlot = (
    <span
      onClick={open}
      className="inline-flex items-center cursor-pointer"
      data-testid={`calendar-week-notes-icon-${yearNumber}-${weekNumber}-${tourSegment}`}
    >
      <StickyNote className="h-3.5 w-3.5" />
    </span>
  );

  const countSlot = (
    <span
      onClick={open}
      className="inline-flex items-center cursor-pointer tabular-nums"
      data-testid={`calendar-week-notes-count-${yearNumber}-${weekNumber}-${tourSegment}`}
    >
      {notes.length}
    </span>
  );

  const dialog = (
    <CalendarWeekNotesDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      yearNumber={yearNumber}
      weekNumber={weekNumber}
      tourId={tourId}
      title={tourLabel}
      readOnly={readOnly}
    />
  );

  return <>{children({ iconSlot, countSlot, dialog })}</>;
}
