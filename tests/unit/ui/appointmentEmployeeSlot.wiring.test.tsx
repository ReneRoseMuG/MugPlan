/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Mitarbeiterbereich zeigt Teams, Tour-Picker und Zuweisungen in einem sichtbaren Panel.
 * - Der Tour-Picker wird nur ohne bereits ausgewaehlte Tour angezeigt.
 * - Leere und belegte Zuweisungszustaende werden sichtbar unterschieden.
 *
 * Fehlerfaelle:
 * - Tour-Auswahl bleibt trotz selektierter Tour sichtbar.
 * - Das Panel verliert seine Plus-Aktion oder die leeren Zuweisungshinweise.
 *
 * Ziel:
 * Beobachtbares Rendering des Mitarbeiter-Panels im Terminformular absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/plus-action-button", () => ({
  PlusActionButton: ({ disabled, ...props }: { disabled?: boolean; ["data-testid"]?: string }) => (
    <button type="button" disabled={disabled} data-testid={props["data-testid"]}>
      add
    </button>
  ),
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: ({ name, testId }: { name: string; testId?: string }) => (
    <div data-testid={testId}>{name}</div>
  ),
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: ({ name, testId }: { name: string; testId?: string }) => (
    <div data-testid={testId}>{name}</div>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ firstName, lastName, testId }: { firstName: string; lastName: string; testId?: string }) => (
    <div data-testid={testId}>{`${firstName} ${lastName}`}</div>
  ),
}));

import { AppointmentEmployeeSlot } from "../../../client/src/components/AppointmentEmployeeSlot";

function renderSlot(
  overrides: Partial<React.ComponentProps<typeof AppointmentEmployeeSlot>> = {},
) {
  return renderToStaticMarkup(
    <AppointmentEmployeeSlot
      teams={[
        { id: 11, name: "Montage", color: "#111111" } as never,
      ]}
      assignedEmployees={[]}
      teamMembersById={new Map([[11, [{ id: 201, fullName: "Alex Team" }]]])}
      isLocked={false}
      onAssignTeam={() => undefined}
      onAddEmployee={() => undefined}
      onRemoveEmployee={() => undefined}
      tours={[
        { id: 21, name: "Nordtour", color: "#224466" } as never,
      ]}
      tourMembersById={new Map([[21, [{ id: 301, fullName: "Tina Tour" }]]])}
      selectedTour={null}
      onTourChange={() => undefined}
      {...overrides}
    />,
  );
}

describe("FT01 UI: AppointmentEmployeeSlot wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders visible team, tour and assignment sections while no tour is selected", () => {
    const markup = renderSlot();

    expect(markup).toContain("slot-appointment-employees");
    expect(markup).toContain("button-add-employee");
    expect(markup).toContain("Teams");
    expect(markup).toContain("Tour");
    expect(markup).toContain("Zugewiesen");
    expect(markup).toContain("badge-team-11");
    expect(markup).toContain("badge-tour-select-21");
    expect(markup).toContain("Keine Mitarbeiter zugewiesen");
    expect(markup).toContain("section-tour-picker");
  });

  it("hides the tour picker after a tour is selected and shows assigned employees", () => {
    const markup = renderSlot({
      selectedTour: { id: 21, name: "Nordtour", color: "#224466" } as never,
      assignedEmployees: [
        { id: 41, firstName: "Mia", lastName: "Muster" } as never,
      ],
    });

    expect(markup).not.toContain("section-tour-picker");
    expect(markup).toContain("badge-employee-41");
    expect(markup).toContain("Mia Muster");
    expect(markup).not.toContain("Keine Mitarbeiter zugewiesen");
  });
});
