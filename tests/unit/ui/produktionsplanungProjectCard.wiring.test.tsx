/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die extrahierte Produktionsplanungskarte rendert Header ohne Reason-Tags.
 * - Die Artikelliste nutzt das `label: value`-Format des gemeinsamen Renderers.
 * - Der Footer verdrahtet Mitarbeiter-, Notiz- und Anhang-Hover sowie die Tag-Zeile.
 *
 * Fehlerfaelle:
 * - Die Kartenextraktion verliert Footer-Trigger oder Tag-Zeile.
 * - Der Header rendert weiterhin die alten Reason-Tags.
 * - Der Body faellt auf das alte gestapelte Kategorienlayout zurueck.
 *
 * Ziel:
 * Die neue ReportProjectCard-Komponente in Isolation regressionssicher absichern.
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

import { ProduktionsplanungProjectCard } from "../../../client/src/components/reports/ProduktionsplanungProjectCard";

describe("FT26 UI: ProduktionsplanungProjectCard wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders article list, plain-text description and generalized footer triggers without header reason tags", () => {
    const html = renderToStaticMarkup(
      <ProduktionsplanungProjectCard
        row={{
          projectId: 1,
          customerId: 2,
          appointmentId: 3,
          projectName: "Projekt Alpha",
          orderNumber: "ORD-001",
          customerNumber: "C-001",
          customerFullName: "Kunde Alpha",
          actualDate: "2099-11-05",
          durationDays: 2,
          tourName: "Tour Nord",
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
          reportCardReasonTags: [
            { id: 7, name: "Sondermass", color: "#1e3a8a", isDefault: false, version: 1 },
          ],
          articleValues: [
            { categoryId: 10, value: "Sauna Alpha, Sauna Beta" },
            { categoryId: 20, value: "Fenster Breit" },
          ],
          projectDescription: "Beschreibung Alpha",
        }}
        categories={[
          { id: 10, name: "Fass Saunen" },
          { id: 20, name: "Fenster" },
        ]}
      />,
    );

    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("05.11.2099");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Fass Saunen");
    expect(html).toContain("Sauna Alpha");
    expect(html).toContain("Sauna Beta");
    expect(html).toContain("Fenster");
    expect(html).toContain("Fenster Breit");
    expect(html).toContain("Beschreibung Alpha");
    expect(html).toContain("reports-produktionsplanung-project-card-1-footer-tags-column");
    expect(html).toContain("reports-produktionsplanung-project-card-1-footer-badges-column");
    expect(html).toContain("employees-hover");
    expect(html).toContain("notes-hover");
    expect(html).toContain("attachments-hover");
    expect(html).toContain("tag-row");
    expect(html).not.toContain("Sondermass");
    expect(html).not.toContain("project-card-1-reasons");
  });

  it("omits the body wrapper when neither article items nor description are present", () => {
    const html = renderToStaticMarkup(
      <ProduktionsplanungProjectCard
        row={{
          projectId: 9,
          customerId: 2,
          appointmentId: 3,
          projectName: "Projekt Leer",
          orderNumber: null,
          customerNumber: null,
          customerFullName: null,
          actualDate: "2099-11-05",
          durationDays: 1,
          tourName: null,
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
          reportCardReasonTags: [],
          articleValues: [],
          projectDescription: null,
        }}
        categories={[{ id: 10, name: "Fass Saunen" }]}
      />,
    );

    expect(html).not.toContain("reports-produktionsplanung-project-card-9-description");
    expect(html).not.toContain("reports-produktionsplanung-project-card-9-articles");
  });
});
