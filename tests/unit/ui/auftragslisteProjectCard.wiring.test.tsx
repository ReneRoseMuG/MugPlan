/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragslisten-Karte nutzt die gemeinsame Report-Karte samt Header, Artikelliste und Footer-Hovern.
 * - Leere Artikellisten oder Beschreibungen erzeugen keinen leeren Body-Wrapper.
 *
 * Fehlerfaelle:
 * - Die wiederverwendete Kachel verliert Footer-Trigger oder Artikellabels.
 * - Leere Inhalte rendern trotzdem einen sichtbaren Body-Bereich.
 *
 * Ziel:
 * Die neue Auftragslisten-Karte in Isolation regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/calendar/CalendarWeekAppointmentEmployeesHover", () => ({
  CalendarWeekAppointmentEmployeesHover: ({ employees }: { employees: Array<{ id: number; fullName: string }> }) => (
    <div data-testid="employees-hover">{employees.map((employee) => employee.fullName).join(", ") || "leer"}</div>
  ),
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: ({ triggerLabel }: { triggerLabel?: string }) => (
    <div data-testid="notes-hover">{triggerLabel ?? "Notizen"}</div>
  ),
}));

vi.mock("@/components/calendar/CalendarWeekAppointmentAttachmentsHover", () => ({
  CalendarWeekAppointmentAttachmentsHover: ({ totalAttachmentsCount }: { totalAttachmentsCount: number }) => (
    <div data-testid="attachments-hover">Anhaenge {totalAttachmentsCount}</div>
  ),
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: ({ tags }: { tags: Array<{ name: string }> }) => (
    <div data-testid="tag-row">{tags.map((tag) => tag.name).join(",")}</div>
  ),
}));

import { AuftragslisteProjectCard } from "../../../client/src/components/reports/AuftragslisteProjectCard";

describe("UI: AuftragslisteProjectCard wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders description, article labels and generalized footer", () => {
    const html = renderToStaticMarkup(
      <AuftragslisteProjectCard
        row={{
          projectId: 1,
          customerId: 2,
          appointmentId: 3,
          projectName: "Projekt Alpha",
          orderNumber: "ORD-001",
          customerNumber: "C-001",
          customerFullName: "Kunde Alpha",
          tourName: "Tour Nord",
          actualDate: "2099-11-05",
          durationDays: 2,
          employees: [{ id: 8, fullName: "Max Muster" }],
          customerNotesCount: 1,
          projectNotesCount: 2,
          appointmentNotesCount: 3,
          notesCount: 6,
          customerAttachmentsCount: 1,
          projectAttachmentsCount: 1,
          appointmentAttachmentsCount: 1,
          attachmentsCount: 3,
          tags: [{ id: 6, name: "Info", color: "#2563eb", isDefault: false, version: 1 }],
          articleValues: [
            { categoryId: 10, value: "WIN-A" },
            { categoryId: 20, value: "DOOR-B" },
          ],
          projectDescription: "Beschreibung Alpha",
        }}
        categories={[
          { id: 10, name: "Fenster" },
          { id: 20, name: "Tueren" },
        ]}
      />,
    );

    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("05.11.2099");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Fenster");
    expect(html).toContain("WIN-A");
    expect(html).toContain("Tür");
    expect(html).toContain("DOOR-B");
    expect(html).toContain("Beschreibung Alpha");
    expect(html).toContain("employees-hover");
    expect(html).toContain("notes-hover");
    expect(html).toContain("attachments-hover");
    expect(html).toContain("tag-row");
  });

  it("omits the body wrapper when article values and description are empty", () => {
    const html = renderToStaticMarkup(
      <AuftragslisteProjectCard
        row={{
          projectId: 9,
          customerId: 2,
          appointmentId: 3,
          projectName: "Projekt Leer",
          orderNumber: null,
          customerNumber: null,
          customerFullName: null,
          tourName: null,
          actualDate: "2099-11-05",
          durationDays: 1,
          employees: [],
          customerNotesCount: 0,
          projectNotesCount: 0,
          appointmentNotesCount: 0,
          notesCount: 0,
          customerAttachmentsCount: 0,
          projectAttachmentsCount: 0,
          appointmentAttachmentsCount: 0,
          attachmentsCount: 0,
          tags: [],
          articleValues: [],
          projectDescription: null,
        }}
        categories={[{ id: 10, name: "Fenster" }]}
      />,
    );

    expect(html).not.toContain("reports-auftragsliste-project-card-9-description");
    expect(html).not.toContain("reports-auftragsliste-project-card-9-articles");
  });
});
