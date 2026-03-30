/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - "Alle waehlen" uebernimmt nur eligible Termine.
 * - "Alle waehlen" arbeitet auf der aktuell gefilterten Ansicht statt auf allen Vorschauterminen.
 * - "Alle abwaehlen" leert die Auswahl vollstaendig.
 * - Die Sammelbuttons funktionieren in Add- und Remove-Modus gleich.
 *
 * Fehlerfaelle:
 * - Ineligible Termine werden durch "Alle waehlen" mitselektiert.
 * - Datumsfilter wird von den Sammelbuttons ignoriert.
 * - "Alle abwaehlen" laesst alte Auswahlreste stehen.
 *
 * Ziel:
 * Die neuen Sammelbuttons des TourEmployeeCascadeDialog ueber ihre verdrahteten Handler absichern.
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <section {...props}>{children}</section>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

async function loadDialogWithFilters(filterDateFrom?: string, filterDateTo?: string) {
  vi.resetModules();

  let stateCall = 0;
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: (<T,>(initial: T) => {
        stateCall += 1;
        if (stateCall === 1) {
          return [filterDateFrom, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 2) {
          return [filterDateTo, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return actual.useState(initial);
      }) as typeof actual.useState,
    };
  });

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

  it("selects only eligible appointments in add mode", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters();

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

    getButtonClickHandler("button-tour-cascade-select-all")?.();

    expect(onSelectedAppointmentIdsChange).toHaveBeenCalledWith([51, 53]);
  });

  it("limits select-all to the currently filtered view", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters("2099-02-01", "2099-02-28");

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

    getButtonClickHandler("button-tour-cascade-select-all")?.();

    expect(onSelectedAppointmentIdsChange).toHaveBeenCalledWith([51]);
  });

  it("clears the complete selection in remove mode", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters();

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

    getButtonClickHandler("button-tour-cascade-deselect-all")?.();

    expect(onSelectedAppointmentIdsChange).toHaveBeenCalledWith([]);
  });

  it("selects only eligible appointments in remove mode as well", async () => {
    const onSelectedAppointmentIdsChange = vi.fn();
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters();

    renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="remove"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={onSelectedAppointmentIdsChange}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    getButtonClickHandler("button-tour-cascade-select-all")?.();

    expect(onSelectedAppointmentIdsChange).toHaveBeenCalledWith([51, 53]);
  });
});
