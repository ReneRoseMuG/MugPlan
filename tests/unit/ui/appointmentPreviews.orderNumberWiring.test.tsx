/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Projektblock im Wochenpanel zeigt Projekttitel prominent und die Auftragsnummer dezent dahinter an.
 * - Projektinhalte werden nur bei vorhandenem Inhalt gerendert.
 * - Der Full-Preview-Modus zeigt nur einen begrenzten Vorschauausschnitt und oeffnet fuer die volle Beschreibung den Hover-Trigger.
 * - Der kollabierte Compact-Pfad verwendet keine zusaetzliche vertikale Leerzeile unter dem Header.
 *
 * Fehlerfaelle:
 * - Der Projektkopf verliert die neue Reihenfolge oder die dezente Auftragsnummer.
 * - Projektinhalte wachsen im Wochenkarten-Body wieder ungebremst in die Kartenhoehe.
 *
 * Ziel:
 * Beobachtbares Wochenpanel-Verhalten fuer Projektkopf und Projektinhalt absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoverPreviewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/project-article-description-renderer", () => ({
  ProjectArticleDescriptionRenderer: ({ testIdPrefix }: { testIdPrefix: string }) => <div>{testIdPrefix}</div>,
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
    ...props
  }: {
    children: React.ReactNode;
    preview: React.ReactNode;
  }) => {
    hoverPreviewCalls.push(props);
    return (
      <div>
        <div>{children}</div>
        <div>{preview}</div>
      </div>
    );
  },
}));

import { CalendarWeekAppointmentPanelProject } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanelProject";

describe("FT03 appointment weekly panel wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    hoverPreviewCalls.length = 0;
  });

  it("renders a visible project header with project name and trailing order number", () => {
    const markup = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Alpha"
        projectOrderNumber=" ORD-77 "
        projectArticleItems={[{ label: "Modell", value: "A" }]}
        projectDescription={null}
      />,
    );

    expect(markup).toContain("week-project-header");
    expect(markup).toContain("Projekt Alpha");
    expect(markup).toContain(" - ORD-77");
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
    expect(withPreview).toContain("max-h-[6.75rem]");
    expect(hoverPreviewCalls[0]).toMatchObject({
      mode: "cursor",
      cursorOffsetX: 20,
      cursorOffsetY: 20,
    });
    expect(withoutContent).not.toContain("week-project-renderer");
    expect(withoutContent).not.toContain("week-project-description-hover-trigger");
  });

  it("renders den Projekt-Fallback mit Hover-Trigger und dezenter Leer-Nachricht im kollabierten Body", () => {
    const markup = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Leer"
        projectOrderNumber={null}
        projectArticleItems={[]}
        projectDescription={null}
        collapsed
        enableFullDescriptionPreview
      />,
    );

    expect(markup).toContain("Projekt Leer");
    expect(markup).toContain(" - -");
    expect(markup).toContain("week-project-description-hover-trigger");
    expect(markup).not.toContain("week-project-renderer");
  });

  it("renders a hover-enabled collapsed project header in compact mode", () => {
    const markup = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelProject
        projectName="Projekt Gamma"
        projectOrderNumber="AUF-9"
        projectArticleItems={[{ label: "Modell", value: "C" }]}
        projectDescription="<p>Beschreibung</p>"
        collapsed
        enableFullDescriptionPreview
      />,
    );

    expect(markup).toContain("Projekt Gamma");
    expect(markup).toContain(" - AUF-9");
    expect(markup).toContain("week-project-description-hover-trigger");
    expect(markup).not.toContain("week-project-renderer");
    expect(markup).toContain("week-project-hover-renderer");
    expect(markup).toContain("cursor-pointer");
    expect(markup).toContain("w-full");
    expect(markup).toContain("px-2 py-1");
  });
});
