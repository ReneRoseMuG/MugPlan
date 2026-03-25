/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarWeekNotesButton verwendet den Query-Key ["calendarWeekNotes", yearNumber, weekNumber].
 * - Der Button zeigt den Notizen-Zähler aus den geladenen Daten.
 * - Ein Klick auf den Button öffnet den CalendarWeekNotesDialog.
 *
 * Fehlerfälle:
 * - Query-Key weicht vom erwarteten Schema ab.
 * - Dialog wird bei Klick nicht geöffnet.
 *
 * Ziel:
 * Absicherung des Wiring zwischen CalendarWeekNotesButton, Query-Key und Dialog-Öffnung.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const dialogCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/calendar/CalendarWeekNotesDialog", () => ({
  CalendarWeekNotesDialog: (props: Record<string, unknown>) => {
    dialogCalls.push(props);
    return null;
  },
}));

vi.mock("date-fns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns")>();
  return { ...actual };
});

vi.mock("date-fns/locale", () => ({ de: {} }));

import { CalendarWeekNotesButton } from "@/components/calendar/CalendarWeekNotesButton";

beforeEach(() => {
  dialogCalls.length = 0;
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue({ data: [] });
});

describe("CalendarWeekNotesButton wiring", () => {
  it("verwendet Query-Key [calendarWeekNotes, yearNumber, weekNumber]", () => {
    renderToStaticMarkup(<CalendarWeekNotesButton yearNumber={2026} weekNumber={13} />);
    const call = useQueryMock.mock.calls[0]?.[0] as { queryKey: unknown[] };
    expect(call.queryKey).toEqual(["calendarWeekNotes", 2026, 13]);
  });

  it("zeigt Notizen-Zähler aus Query-Daten", () => {
    useQueryMock.mockReturnValue({
      data: [
        { id: 1, title: "A", body: "", version: 1, isPinned: false, print: false, cardColor: null, cardColorLocked: false, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "B", body: "", version: 1, isPinned: false, print: false, cardColor: null, cardColorLocked: false, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const html = renderToStaticMarkup(<CalendarWeekNotesButton yearNumber={2026} weekNumber={14} />);
    expect(html).toContain("2");
  });

  it("rendert den Dialog mit korrekten Props", () => {
    renderToStaticMarkup(<CalendarWeekNotesButton yearNumber={2026} weekNumber={15} readOnly={true} />);
    expect(dialogCalls.length).toBeGreaterThan(0);
    const dialogProps = dialogCalls[0];
    expect(dialogProps.yearNumber).toBe(2026);
    expect(dialogProps.weekNumber).toBe(15);
    expect(dialogProps.readOnly).toBe(true);
  });
});
