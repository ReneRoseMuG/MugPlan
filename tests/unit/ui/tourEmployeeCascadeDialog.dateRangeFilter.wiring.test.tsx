/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ohne aktive Filter bleiben beide Date-Inputs sichtbar und der Reset-Button ausgeblendet.
 * - Mit aktivem Datumsfilter erscheinen nur passende Vorschauzeilen und der Reset-Button wird sichtbar.
 * - Die Summenzeile bleibt auf allen Vorschauterminen und nicht nur auf den gefilterten Treffern bezogen.
 * - Die Sammelbuttons bleiben auch mit und ohne aktiven Filter sichtbar.
 *
 * Fehlerfaelle:
 * - Die Filter-UI verliert ihre sichtbaren Eingabefelder.
 * - Die Filterung blendet Treffer nicht sauber ein oder aus.
 * - Die Bereichssummenzeile kippt auf die gefilterte Teilmenge.
 *
 * Ziel:
 * Den sichtbaren Date-Range-Filter des TourEmployeeCascadeDialog ueber gerendertes Verhalten statt ueber useState-Quelltext absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
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

const previewItems = [
  {
    appointmentId: 51,
    startDate: "2099-02-03",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: null,
    customerName: null,
    projectName: "Projekt Eins",
    orderNumber: "A-1",
    currentEmployees: [],
    eligible: true,
    conflictReason: null,
  },
  {
    appointmentId: 52,
    startDate: "2099-02-20",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: null,
    customerName: null,
    projectName: "Projekt Zwei",
    orderNumber: "A-2",
    currentEmployees: [],
    eligible: true,
    conflictReason: null,
  },
];

describe("FT04 TourEmployeeCascadeDialog date filter behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("shows the filter inputs without a reset button when no filter is active", async () => {
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters(undefined, undefined);
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[51, 52]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("input-tour-cascade-date-from");
    expect(html).toContain("input-tour-cascade-date-to");
    expect(html).not.toContain("button-tour-cascade-date-filter-reset");
    expect(html).toContain("button-tour-cascade-select-all");
    expect(html).toContain("button-tour-cascade-deselect-all");
    expect(html).toContain("tour-employee-cascade-row-51");
    expect(html).toContain("tour-employee-cascade-row-52");
  });

  it("filters visible rows, shows reset and keeps the range summary on all preview items", async () => {
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters("2099-02-10", undefined);
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[52]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("button-tour-cascade-date-filter-reset");
    expect(html).toContain("button-tour-cascade-select-all");
    expect(html).toContain("button-tour-cascade-deselect-all");
    expect(html).not.toContain("tour-employee-cascade-row-51");
    expect(html).toContain("tour-employee-cascade-row-52");
    expect(html).toContain("Termine (2) - Termine im Zeitraum von 03.02.99 bis 20.02.99");
  });

  it("shows the empty state when the active date filter excludes every preview item", async () => {
    const { TourEmployeeCascadeDialog } = await loadDialogWithFilters("2099-03-01", undefined);
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeName="Mia Muster"
        previewItems={previewItems}
        selectedAppointmentIds={[]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("button-tour-cascade-date-filter-reset");
    expect(html).toContain("button-tour-cascade-select-all");
    expect(html).toContain("button-tour-cascade-deselect-all");
    expect(html).toContain("Keine zuk");
    expect(html).not.toContain("tour-employee-cascade-row-51");
    expect(html).not.toContain("tour-employee-cascade-row-52");
  });
});
