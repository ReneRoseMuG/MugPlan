/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarWeekNotesButton verwendet den Query-Key ["calendarWeekNotes", yearNumber, weekNumber, tourId].
 * - Die Render-Prop liefert iconSlot, countSlot und dialog an den Consumer.
 * - countSlot enthält die Anzahl der geladenen Notizen.
 * - tourId=null und tourId=42 erzeugen unterschiedliche Query-Keys.
 *
 * Fehlerfälle:
 * - Query-Key weicht vom erwarteten Schema ab.
 * - Render-Prop liefert keine Slots.
 *
 * Ziel:
 * Absicherung des Wiring zwischen CalendarWeekNotesButton (Render-Prop),
 * Query-Key (inkl. tourId) und Slot-Übergabe an den Consumer.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/calendar/CalendarWeekNotesDialog", () => ({
  CalendarWeekNotesDialog: () => null,
}));

import { CalendarWeekNotesButton } from "@/components/calendar/CalendarWeekNotesButton";

beforeEach(() => {
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue({ data: [] });
});

describe("CalendarWeekNotesButton wiring", () => {
  it("verwendet Query-Key [calendarWeekNotes, yearNumber, weekNumber, tourId=null]", () => {
    renderToStaticMarkup(
      <CalendarWeekNotesButton yearNumber={2026} weekNumber={13} tourId={null} tourLabel="KW 13">
        {() => <span />}
      </CalendarWeekNotesButton>,
    );
    const call = useQueryMock.mock.calls[0]?.[0] as { queryKey: unknown[] };
    expect(call.queryKey).toEqual(["calendarWeekNotes", 2026, 13, null]);
  });

  it("verwendet Query-Key [calendarWeekNotes, yearNumber, weekNumber, tourId=42]", () => {
    renderToStaticMarkup(
      <CalendarWeekNotesButton yearNumber={2026} weekNumber={13} tourId={42} tourLabel="Tour A">
        {() => <span />}
      </CalendarWeekNotesButton>,
    );
    const call = useQueryMock.mock.calls[0]?.[0] as { queryKey: unknown[] };
    expect(call.queryKey).toEqual(["calendarWeekNotes", 2026, 13, 42]);
  });

  it("countSlot enthält die Anzahl der geladenen Notizen", () => {
    useQueryMock.mockReturnValue({
      data: [
        { id: 1, title: "A", body: "", version: 1, isPinned: false, print: false, cardColor: null, cardColorLocked: false, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "B", body: "", version: 1, isPinned: false, print: false, cardColor: null, cardColorLocked: false, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const html = renderToStaticMarkup(
      <CalendarWeekNotesButton yearNumber={2026} weekNumber={14} tourId={null} tourLabel="KW 14">
        {({ countSlot }) => <div>{countSlot}</div>}
      </CalendarWeekNotesButton>,
    );
    expect(html).toContain("2");
  });

  it("Render-Prop liefert iconSlot, countSlot und dialog", () => {
    const slots: string[] = [];
    renderToStaticMarkup(
      <CalendarWeekNotesButton yearNumber={2026} weekNumber={15} tourId={null} tourLabel="KW 15" readOnly>
        {({ iconSlot, countSlot, dialog }) => {
          if (iconSlot) slots.push("icon");
          if (countSlot) slots.push("count");
          if (dialog) slots.push("dialog");
          return <span />;
        }}
      </CalendarWeekNotesButton>,
    );
    expect(slots).toContain("icon");
    expect(slots).toContain("count");
    expect(slots).toContain("dialog");
  });

  it("liefert passive Anzeige-Slots ohne cursor-pointer", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekNotesButton yearNumber={2026} weekNumber={15} tourId={null} tourLabel="KW 15" readOnly>
        {({ iconSlot, countSlot }) => <div>{iconSlot}{countSlot}</div>}
      </CalendarWeekNotesButton>,
    );

    expect(html).not.toContain("cursor-pointer");
    expect(html).toContain('aria-hidden="true"');
  });
});
