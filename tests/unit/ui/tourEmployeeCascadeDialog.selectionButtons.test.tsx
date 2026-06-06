/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - "Alle waehlen" und "Alle abwaehlen" werden im Wochenplanungsdialog nicht gerendert.
 * - Die Auswahl bleibt auf explizite Termin-Checkboxen begrenzt.
 *
 * Fehlerfaelle:
 * - Sammelbuttons kehren in Add- oder Remove-Modus sichtbar zurueck.
 *
 * Ziel:
 * Die entfernten Sammelbuttons des TourEmployeeCascadeDialog gegen Regressionen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buttonPropsLog: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    buttonPropsLog.push(props);
    return <button type="button" {...props}>{children}</button>;
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, disabled, ...props }: { checked?: boolean; disabled?: boolean; [key: string]: unknown }) => (
    <input type="checkbox" checked={checked} disabled={disabled} readOnly {...props} />
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName?: string; testId?: string }) => (
    <span data-testid={testId}>{fullName}</span>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <section {...props}>{children}</section>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

const previewItems = [
  {
    appointmentId: 51,
    startDate: "2099-02-03",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: "C-1",
    customerName: "Kunde Eins",
    projectName: "Projekt Eins",
    orderNumber: "A-1",
    currentEmployees: [],
    eligible: true,
    conflictReason: null,
  },
  {
    appointmentId: 52,
    startDate: "2099-02-05",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: "C-2",
    customerName: "Kunde Zwei",
    projectName: "Projekt Zwei",
    orderNumber: "A-2",
    currentEmployees: [],
    eligible: false,
    conflictReason: "EMPLOYEE_OVERLAP" as const,
  },
  {
    appointmentId: 53,
    startDate: "2099-03-01",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: "C-3",
    customerName: "Kunde Drei",
    projectName: "Projekt Drei",
    orderNumber: "A-3",
    currentEmployees: [],
    eligible: true,
    conflictReason: null,
  },
];

async function loadDialog() {
  vi.resetModules();
  return import("../../../client/src/components/TourEmployeeCascadeDialog");
}

function getButtonClickHandler(testId: string): (() => void) | undefined {
  const props = buttonPropsLog.find((entry) => entry["data-testid"] === testId);
  return props?.onClick as (() => void) | undefined;
}

describe("FT04 TourEmployeeCascadeDialog selection buttons", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  it("does not render bulk selection buttons in add mode", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialog();

    renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={onSelectedAppointmentIdsChange}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(getButtonClickHandler("button-tour-cascade-select-all")).toBeUndefined();
    expect(getButtonClickHandler("button-tour-cascade-deselect-all")).toBeUndefined();
    expect(onSelectedAppointmentIdsChange).not.toHaveBeenCalled();
  });

  it("does not render bulk selection buttons in remove mode", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialog();

    renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="remove"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[51, 53]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={onSelectedAppointmentIdsChange}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(getButtonClickHandler("button-tour-cascade-select-all")).toBeUndefined();
    expect(getButtonClickHandler("button-tour-cascade-deselect-all")).toBeUndefined();
    expect(onSelectedAppointmentIdsChange).not.toHaveBeenCalled();
  });
});
