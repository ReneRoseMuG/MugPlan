/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragslisten-Druckkarte nutzt dieselbe Kartenstruktur wie die geöffnete Report-Ansicht.
 * - In der Druckansicht nutzt die Tag-Zeile die volle Footer-Breite; die rechte Badge-Spalte bleibt ausgeblendet.
 * - Highlight-Tags färben Header und Kartenkontur der Druckkarte sichtbar ein.
 *
 * Fehlerfaelle:
 * - Die Druckansicht weicht strukturell weiter von der Öffnen-Karte ab.
 * - Die Badge-Spalte bleibt in der Druckvorschau sichtbar und verdrängt die Tags unnötig.
 * - Das Highlight-Tag fehlt trotz Datenlage oder verliert seine sichtbare Farbverdrahtung.
 * - Die Inhaltsbereiche werden trotz Vorgabe dunkel getönt.
 *
 * Ziel:
 * Die Druckkarte der Auftragsliste auf dieselbe sichtbare Kartenbasis wie die Öffnen-Ansicht regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({
    testId,
    fullName,
    renderMode,
  }: {
    testId?: string;
    fullName?: string;
    renderMode?: string;
  }) => (
    <div data-testid={testId ?? "employee-badge"}>
      {[fullName ?? "leer", renderMode ?? ""].join("|")}
    </div>
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

import { AuftragslistePrintLayout } from "../../../client/src/components/reports/AuftragslistePrintLayout";

describe("FT26 UI: AuftragslistePrintLayout wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders the same card structure as the opened report including footer tags", () => {
    const html = renderToStaticMarkup(
      <AuftragslistePrintLayout
        categories={[
          { id: 10, name: "Fass Saunen" },
          { id: 20, name: "Fenster" },
        ]}
        items={[
          {
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
            tourColor: "#0f766e",
            employees: [{ id: 8, fullName: "Max Muster" }],
            customerNotesCount: 1,
            projectNotesCount: 2,
            appointmentNotesCount: 3,
            notesCount: 6,
            customerAttachmentsCount: 1,
            projectAttachmentsCount: 1,
            appointmentAttachmentsCount: 1,
            attachmentsCount: 3,
            tags: [
              { id: 6, name: "Anmerkungen", color: "#888780", isDefault: false, version: 1 },
              { id: 7, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: false, version: 1 },
            ],
            articleValues: [
              { categoryId: 10, value: "Sauna Alpha" },
              { categoryId: 20, value: "Fenster Breit" },
            ],
            projectDescription: "Beschreibung Alpha",
          },
        ]}
      />,
    );

    expect(html).toContain("C-001");
    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("05.11.99");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Anmerkungen,Messe Aufbau/Abbau");
    expect(html).not.toContain("employee-badge");
    expect(html).not.toContain("notes-hover");
    expect(html).not.toContain("attachments-hover");
    expect(html).toContain("background-color:rgba(52, 101, 164, 0.14)");
    expect(html).toContain("border-color:#3465A4");
    expect(html).not.toContain("background-color:rgba(52, 101, 164, 0.04)");
    expect(html).not.toContain("background-color:rgba(52, 101, 164, 0.08)");
    expect(html).not.toContain("footer-badges-column");
    expect(html).toContain("Sauna");
    expect(html).toContain("Sauna Alpha");
    expect(html).toContain("Fenster");
    expect(html).toContain("Fenster Breit");
    expect(html).toContain("Beschreibung Alpha");
  });

  it("keeps Gespiegelt ahead of Messe in the printed card markup", () => {
    const html = renderToStaticMarkup(
      <AuftragslistePrintLayout
        categories={[{ id: 10, name: "Fass Saunen" }]}
        items={[
          {
            projectId: 2,
            customerId: 2,
            appointmentId: 3,
            projectName: "Projekt Beta",
            orderNumber: "ORD-002",
            customerNumber: "C-002",
            customerFullName: "Kunde Beta",
            actualDate: "2099-11-06",
            durationDays: 1,
            tourName: "Tour West",
            tourColor: null,
            employees: [],
            customerNotesCount: 0,
            projectNotesCount: 0,
            appointmentNotesCount: 0,
            notesCount: 0,
            customerAttachmentsCount: 0,
            projectAttachmentsCount: 0,
            appointmentAttachmentsCount: 0,
            attachmentsCount: 0,
            tags: [
              { id: 16, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: false, version: 1 },
              { id: 17, name: "Gespiegelt", color: "#0891b2", isDefault: false, version: 1 },
            ],
            articleValues: [{ categoryId: 10, value: "Sauna Beta" }],
            projectDescription: null,
          },
        ]}
      />,
    );

    expect(html).toContain('data-report-dominant-tag="Gespiegelt"');
    expect(html).toContain("border-color:#0891b2");
  });
});
