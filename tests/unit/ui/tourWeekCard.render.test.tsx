/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourWeekCard zeigt die KW-Datumszeile im Format `dd.MM.yy - dd.MM.yy`.
 * - Im Mitarbeiter-Scope bleibt die Tour als Zusatzinformation sichtbar.
 * - Footer-Badges fuer Termine und Notizen bleiben an die uebergebenen Mengen verdrahtet.
 * - Blockierte Wochen rendern Warntext und Badge weiterhin ueber die gemeinsame Karte.
 *
 * Fehlerfaelle:
 * - Die vereinheitlichte Wochenkarte verliert Datumszeile, Tour-Zusatz oder Footer-Badges.
 * - Blockierte Wochen zeigen weder Warnhinweis noch Badge im gemeinsamen Kartenrenderer.
 *
 * Ziel:
 * Die neue gemeinsame tour_week-Karte auf sichtbare KW-Struktur und Footer-Verdrahtung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/colored-entity-card", () => ({
  ColoredEntityCard: ({
    children,
    footer,
    testId,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    testId?: string;
  }) => (
    <section data-testid={testId}>
      <div data-testid={`${testId}-body`}>{children}</div>
      <div data-testid={`${testId}-footer`}>{footer}</div>
    </section>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({
    firstName,
    lastName,
    renderMode,
    testId,
  }: {
    firstName?: string;
    lastName?: string;
    renderMode?: string;
    testId?: string;
  }) => (
    <div data-testid={testId}>{`${firstName ?? ""} ${lastName?.[0] ? `${lastName[0]}.` : ""}|${renderMode ?? "default"}`.trim()}</div>
  ),
}));

vi.mock("@/components/TourWeekAppointmentsHoverPreview", () => ({
  TourWeekAppointmentsHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>appointments-{count}</div>
  ),
}));

vi.mock("@/components/TourWeekNotesHoverPreview", () => ({
  TourWeekNotesHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>notes-{count}</div>
  ),
}));

import { TourWeekCard } from "../../../client/src/components/TourWeekCard";

describe("tourWeekCard render", () => {
  it("renders date line, employee scope tour label and footer counters", () => {
    const markup = renderToStaticMarkup(
      <TourWeekCard
        week={{
          tourId: 7,
          tourName: "Tour Nord",
          tourColor: "#225588",
          isoYear: 2026,
          isoWeek: 18,
          weekStartDate: "2026-04-27",
          weekEndDate: "2026-05-03",
          isLocked: false,
          isBlocked: false,
          appointmentsCount: 3,
          notesCount: 2,
          employees: [
            { assignmentId: 91, employeeId: 17, firstName: "Mia", lastName: "Mitarbeiter", fullName: "Mitarbeiter, Mia" },
          ],
        }}
        scope="employee"
        employeeId={17}
        testId="card-employee-week-plan-91"
        memberTestIdPrefix="badge-employee-week-plan-member"
      />,
    );

    expect(markup).toContain("27.04.26 - 03.05.26");
    expect(markup).toContain("Tour Nord");
    expect(markup).toContain("appointments-3");
    expect(markup).toContain("notes-2");
    expect(markup).toContain("Mia M.|standard");
  });

  it("keeps blocked warning and badge wired in tour scope", () => {
    const markup = renderToStaticMarkup(
      <TourWeekCard
        week={{
          tourId: 5,
          tourName: "Tour West",
          tourColor: "#884422",
          isoYear: 2026,
          isoWeek: 19,
          weekStartDate: "2026-05-04",
          weekEndDate: "2026-05-10",
          isLocked: false,
          isBlocked: true,
          appointmentsCount: 0,
          notesCount: 1,
          employees: [],
        }}
        scope="tour"
        testId="card-tour-week-2026-19"
        memberTestIdPrefix="badge-tour-week-member"
        blockedTextTestId="text-tour-week-blocked-2026-19"
        blockedBadgeTestId="badge-tour-week-blocked-2026-19"
      />,
    );

    expect(markup).toContain("Die Wochenplanung ist blockiert");
    expect(markup).toContain("badge-tour-week-blocked-2026-19");
    expect(markup).toContain("Keine Mitarbeiter geplant");
  });
});
