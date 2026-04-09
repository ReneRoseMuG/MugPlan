/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Tages-Hover der Tour-Lane zeigt getrennte Abschnitte fuer Wochenplanung und zusätzliche Tageszuweisungen.
 * - Beide Abschnitte rendern die zugewiesenen Mitarbeiter ueber die bestehende Badge-Liste.
 * - Leere Abschnitte zeigen einen klaren Fallbacktext.
 *
 * Fehlerfaelle:
 * - Die beiden Herkunftsgruppen werden nicht sichtbar getrennt.
 * - Leere Gruppen verschwinden ohne Hinweis.
 *
 * Ziel:
 * Das sichtbare Hover-Markup fuer die neue Tour-Lane-Tagesvorschau isoliert absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName: string; testId?: string }) => (
    <div data-testid={testId}>{fullName}</div>
  ),
}));

import { CalendarWeekTourLaneDayHoverPreview } from "../../../client/src/components/calendar/CalendarWeekTourLaneDayHoverPreview";

describe("CalendarWeekTourLaneDayHoverPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders both employee groups with labels and employees", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekTourLaneDayHoverPreview
        weekEmployees={[{ id: 1, fullName: "Ada Woche" }]}
        additionalDayEmployees={[{ id: 2, fullName: "Berta Zusatz" }]}
      />,
    );

    expect(html).toContain("Aus Wochenplanung");
    expect(html).toContain("Zusätzliche Tageszuweisungen");
    expect(html).toContain("Ada Woche");
    expect(html).toContain("Berta Zusatz");
  });

  it("renders fallback texts for empty groups", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekTourLaneDayHoverPreview
        weekEmployees={[]}
        additionalDayEmployees={[]}
      />,
    );

    expect(html).toContain("Keine Mitarbeiter aus Wochenplanung.");
    expect(html).toContain("Keine zusätzlichen Tageszuweisungen.");
  });
});
