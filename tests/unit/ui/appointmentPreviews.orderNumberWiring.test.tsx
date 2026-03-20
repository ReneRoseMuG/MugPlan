/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Projektblock im Wochenpanel zeigt Auftragsnummer und Projekttitel sichtbar zusammen an.
 * - Projektinhalte werden nur bei vorhandenem Inhalt gerendert.
 * - Der Full-Preview-Modus zeigt den Hover-Trigger fuer die ausfuehrliche Projektbeschreibung.
 *
 * Fehlerfaelle:
 * - Der Projektkopf verliert die Auftragsnummer.
 * - Inhaltslose Projekte rendern weiterhin einen leeren Beschreibungsbereich.
 *
 * Ziel:
 * Beobachtbares Wochenpanel-Verhalten fuer Projektkopf und Projektinhalt absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/project-article-description-renderer", () => ({
  ProjectArticleDescriptionRenderer: ({ testIdPrefix }: { testIdPrefix: string }) => <div>{testIdPrefix}</div>,
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
  }: {
    children: React.ReactNode;
    preview: React.ReactNode;
  }) => (
    <div>
      <div>{children}</div>
      <div>{preview}</div>
    </div>
  ),
}));

import { CalendarWeekAppointmentPanelProject } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanelProject";

describe("FT03 appointment weekly panel wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders a visible project header with order number and project name", () => {
    const markup = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Alpha"
        projectOrderNumber=" ORD-77 "
        projectArticleItems={[{ label: "Modell", value: "A" }]}
        projectDescription={null}
      />,
    );

    expect(markup).toContain("week-project-header");
    expect(markup).toContain("ORD-77 - Projekt Alpha");
    expect(markup).toContain("week-project-renderer");
  });

  it("renders the hover trigger only when full description preview is enabled", () => {
    const withPreview = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Beta"
        projectOrderNumber={null}
        projectArticleItems={[{ label: "Modell", value: "B" }]}
        projectDescription="<p>Beschreibung</p>"
        enableFullDescriptionPreview
      />,
    );
    const withoutContent = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Leer"
        projectOrderNumber={null}
        projectArticleItems={[]}
        projectDescription={null}
      />,
    );

    expect(withPreview).toContain("week-project-description-hover-trigger");
    expect(withPreview).toContain("week-project-hover-renderer");
    expect(withoutContent).not.toContain("week-project-renderer");
    expect(withoutContent).not.toContain("week-project-description-hover-trigger");
  });
});
