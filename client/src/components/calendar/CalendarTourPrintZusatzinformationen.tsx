import React from "react";
import { type TourPrintAdditionalInfoCard } from "@/lib/tour-print-preview";
import { CalendarTourPrintNoteCard } from "./CalendarTourPrintNoteCard";

type Props = {
  cards: TourPrintAdditionalInfoCard[];
  showHeading: boolean;
  continued: boolean;
};

export function CalendarTourPrintZusatzinformationen({ cards, showHeading, continued }: Props) {
  if (cards.length === 0) return null;

  return (
    <section className="mt-6 break-inside-avoid" data-testid="tour-print-zusatzinformationen">
      {showHeading ? (
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {continued ? "Zusatzinformationen (Fortsetzung)" : "Zusatzinformationen"}
        </h3>
      ) : null}
      <div className="space-y-2">
        {cards.map((card) => (
          <CalendarTourPrintNoteCard
            key={`${card.appointment.id}-${card.weekStart}`}
            appointment={card.appointment}
            weekStart={card.weekStart}
          />
        ))}
      </div>
    </section>
  );
}
