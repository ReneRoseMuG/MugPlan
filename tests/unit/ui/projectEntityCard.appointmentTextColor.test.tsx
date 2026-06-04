/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Termininfo-Zeile der ProjectEntityCard trägt die Tailwind-Klasse text-slate-700.
 * - Es wird kein inline color-Style gesetzt, der weiße Schrift erzwingen könnte.
 *
 * Fehlerfälle:
 * - getReadableNoteTextColors oder ein anderer Mechanismus setzt die Textfarbe auf Weiß zurück.
 * - text-slate-700 geht durch Refactoring verloren.
 *
 * Ziel:
 * Textfarbe der Termininfo im Board-View der Projektkarte regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="entity-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/customer-info-panel", () => ({
  CustomerInfoPanel: () => <div data-testid="customer-info" />,
}));

vi.mock("@/components/ui/project-info-panel", () => ({
  ProjectInfoPanel: () => <div data-testid="project-info" />,
  canOpenProjectInfoPreview: () => false,
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="hover-preview">{children}</div>
  ),
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: () => <span data-testid="notes-hover" />,
}));

vi.mock("@/components/ui/ProjectAttachmentsHover", () => ({
  ProjectAttachmentsHover: () => <span data-testid="project-attachments" />,
}));

vi.mock("@/components/ui/entity-appointments-hover-preview", () => ({
  EntityAppointmentsHoverPreview: () => <span data-testid="appointments-hover" />,
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: () => <div data-testid="tag-row" />,
}));

import { ProjectEntityCard } from "../../../client/src/components/ui/entity-preview-cards";

const baseProject = {
  id: 42,
  name: "Testprojekt",
  orderNumber: "A-42",
  isActive: true,
  notesCount: 0,
  appointmentsCount: 0,
  attachmentsCount: 0,
  descriptionMd: null,
  tags: [],
  projectArticleItems: [],
  customer: {
    id: 1,
    customerNumber: "K-1",
    fullName: "Testkunde",
    addressLine1: null,
    postalCode: null,
    city: null,
    country: null,
    phone: null,
    email: null,
  },
};

describe("FT02 UI: ProjectEntityCard Termininfo-Textfarbe", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("trägt text-slate-700 und keinen inline color-Style wenn keine Tour-Farbe gesetzt ist", () => {
    const html = renderToStaticMarkup(
      <ProjectEntityCard
        project={{
          ...baseProject,
          nextAppointmentStartDate: "2099-08-20",
          nextAppointmentStartTimeHour: 8,
          nextAppointmentTourName: null,
          nextAppointmentTourColor: null,
        }}
      />,
    );

    const match = html.match(/<div[^>]*data-testid="text-project-next-appointment-42"[^>]*>/);
    const tag = match?.[0] ?? "";
    expect(tag).toContain("text-slate-700");
    expect(tag).not.toMatch(/(?<!-)color:/);
  });

  it("trägt text-slate-700 und keinen inline color-Style wenn eine Tour-Farbe gesetzt ist", () => {
    const html = renderToStaticMarkup(
      <ProjectEntityCard
        project={{
          ...baseProject,
          nextAppointmentStartDate: "2099-08-20",
          nextAppointmentStartTimeHour: 8,
          nextAppointmentTourName: "Tour 3",
          nextAppointmentTourColor: "#226688",
        }}
      />,
    );

    const match = html.match(/<div[^>]*data-testid="text-project-next-appointment-42"[^>]*>/);
    const tag = match?.[0] ?? "";
    expect(tag).toContain("text-slate-700");
    expect(tag).not.toMatch(/(?<!-)color:/);
  });
});
