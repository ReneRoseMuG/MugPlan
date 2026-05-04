/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Tabellen-Previews fuer Projekte, Kunden und Mitarbeiter verwenden die gemeinsamen Entity-Card-Renderer.
 * - Die Preview-Breite orientiert sich am 3-Spalten-Board-Mass.
 * - Navigations-Doppelklicks werden bis zur gemeinsamen Kartenbasis durchgereicht.
 *
 * Fehlerfaelle:
 * - Tabellen-Previews fallen auf Legacy-Sonderlayouts zurueck.
 * - Die gemeinsame Breite oder der Doppelklick-Handler gehen beim Verdrahten verloren.
 *
 * Ziel:
 * Den gemeinsamen Preview-Einstieg fuer Projekt-, Kunden- und Mitarbeiter-Tabellen regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const projectEntityCardMock = vi.fn();
const customerEntityCardMock = vi.fn();
const employeeEntityCardMock = vi.fn();

vi.mock("@/components/ui/entity-preview-cards", () => ({
  TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS: "w-[360px]",
  ProjectEntityCard: (props: Record<string, unknown>) => {
    projectEntityCardMock(props);
    return <div data-testid="project-entity-card-preview" />;
  },
  CustomerEntityCard: (props: Record<string, unknown>) => {
    customerEntityCardMock(props);
    return <div data-testid="customer-entity-card-preview" />;
  },
  EmployeeEntityCard: (props: Record<string, unknown>) => {
    employeeEntityCardMock(props);
    return <div data-testid="employee-entity-card-preview" />;
  },
}));

import {
  CustomerTableHoverPreview,
  EmployeeTableHoverPreview,
  ProjectTableHoverPreview,
} from "../../../client/src/components/ui/table-hover-previews";

describe("FT03 table entity card previews", () => {
  it("wraps the project table preview with the shared project entity card", () => {
    const handleOpen = vi.fn();

    renderToStaticMarkup(
      <ProjectTableHoverPreview
        project={{
          id: 7,
          name: "Projekt Sieben",
          orderNumber: "A-7",
          descriptionMd: null,
          isActive: true,
          notesCount: 2,
          appointmentsCount: 3,
          nextAppointmentStartDate: "2099-07-01",
          nextAppointmentStartTimeHour: 8,
          nextAppointmentTourName: "Tour 1",
          nextAppointmentTourColor: "#226688",
          attachmentsCount: 1,
          tags: [],
          customer: {
            id: 4,
            customerNumber: "K-4",
            fullName: "Kunde Vier",
          },
          projectArticleItems: [],
        }}
        onDoubleClick={handleOpen}
      />,
    );

    expect(projectEntityCardMock).toHaveBeenCalledWith(expect.objectContaining({
      className: "w-[360px]",
      onDoubleClick: handleOpen,
    }));
  });

  it("wraps the customer table preview with the shared customer entity card", () => {
    const handleOpen = vi.fn();

    renderToStaticMarkup(
      <CustomerTableHoverPreview
        customer={{
          id: 3,
          fullName: "Musterkunde",
          customerNumber: "C-3",
          notesCount: 1,
          appointmentsCount: 2,
          attachmentsCount: 0,
          tags: [],
        }}
        onDoubleClick={handleOpen}
      />,
    );

    expect(customerEntityCardMock).toHaveBeenCalledWith(expect.objectContaining({
      className: "w-[360px]",
      onDoubleClick: handleOpen,
    }));
  });

  it("wraps the employee table preview with the shared employee entity card", () => {
    const handleOpen = vi.fn();

    renderToStaticMarkup(
      <EmployeeTableHoverPreview
        employee={{
          id: 9,
          fullName: "Anna Beispiel",
          isActive: true,
          notesCount: 4,
          attachmentsCount: 2,
          tags: [],
          appointmentsCount: 5,
        }}
        team={{ id: 2, name: "Team Blau", members: [] }}
        tour={{ id: 1, name: "Tour Ost", members: [] }}
        onDoubleClick={handleOpen}
      />,
    );

    expect(employeeEntityCardMock).toHaveBeenCalledWith(expect.objectContaining({
      className: "w-[360px]",
      onDoubleClick: handleOpen,
      team: expect.objectContaining({ name: "Team Blau" }),
      tour: expect.objectContaining({ name: "Tour Ost" }),
    }));
  });
});
