/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Monitoring-Filterpanel verdrahtet Kunden- und Auftragsnummern direkt in die lokale Filter-Patch-API.
 * - Der Tour-Select wandelt UI-Werte in numerische `tourId`-Filter um.
 * - Die Reset-Zustaende der Selects setzen Tour- und Triggerfilter wieder auf `undefined`.
 *
 * Fehlerfaelle:
 * - Kunden-, Auftrags- oder Tourfilter senden keine oder falsch typisierte Patches.
 * - Reset auf "Alle ..." behaelt veraltete Select-Filter im lokalen State.
 *
 * Ziel:
 * Die Panel-Verdrahtung fuer die relevanten Monitoring-Filter in Isolation regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMonitoringFilters } from "../../../client/src/lib/monitoring-filters";

const customerNumberFilterCalls: Array<Record<string, unknown>> = [];
const orderNumberFilterCalls: Array<Record<string, unknown>> = [];
const selectCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: () => <span>help</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/filters/customer-name-filter-input", () => ({
  CustomerNameFilterInput: () => <div>customer-name-filter</div>,
}));

vi.mock("@/components/filters/project-title-filter-input", () => ({
  ProjectTitleFilterInput: () => <div>project-title-filter</div>,
}));

vi.mock("@/components/filters/customer-number-filter-input", () => ({
  CustomerNumberFilterInput: (props: Record<string, unknown>) => {
    customerNumberFilterCalls.push(props);
    return <div>customer-number-filter</div>;
  },
}));

vi.mock("@/components/filters/project-order-number-filter-input", () => ({
  ProjectOrderNumberFilterInput: (props: Record<string, unknown>) => {
    orderNumberFilterCalls.push(props);
    return <div>order-number-filter</div>;
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    selectCalls.push(props);
    return <div>{props.children}</div>;
  },
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
}));

import { MonitoringFilterPanel } from "../../../client/src/components/ui/filter-panels/monitoring-filter-panel";

describe("FT31 UI: MonitoringFilterPanel wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    customerNumberFilterCalls.length = 0;
    orderNumberFilterCalls.length = 0;
    selectCalls.length = 0;
  });

  it("forwards customer and order identifier patches and converts the selected tour to a number", () => {
    const onChange = vi.fn();

    const html = renderToStaticMarkup(
      <MonitoringFilterPanel
        filters={defaultMonitoringFilters}
        onChange={onChange}
        tours={[
          { id: 10, name: "Beta", color: "#2563eb", version: 1 },
          { id: 7, name: "Tour 10", color: "#2563eb", version: 1 },
          { id: 8, name: "Tour 2", color: "#2563eb", version: 1 },
          { id: 9, name: "Alpha", color: "#2563eb", version: 1 },
        ]}
      />,
    );

    expect(customerNumberFilterCalls[0]).toMatchObject({
      value: "",
      numericOnly: false,
    });
    expect(orderNumberFilterCalls[0]).toMatchObject({
      value: "",
    });
    expect(selectCalls).toHaveLength(2);
    expect(selectCalls[0].value).toBe("all");
    expect(selectCalls[1].value).toBe("all");
    expect(html.indexOf("Alle Touren")).toBeLessThan(html.indexOf("Tour 2"));
    expect(html.indexOf("Tour 2")).toBeLessThan(html.indexOf("Tour 10"));
    expect(html.indexOf("Tour 10")).toBeLessThan(html.indexOf("Alpha"));
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"));

    (customerNumberFilterCalls[0].onChange as ((value: string) => void))("C-2100");
    (orderNumberFilterCalls[0].onChange as ((value: string) => void))("A-0218229A");
    (selectCalls[0].onValueChange as ((value: string) => void))("8");

    expect(onChange).toHaveBeenCalledWith({ customerNumber: "C-2100" });
    expect(onChange).toHaveBeenCalledWith({ orderNumber: "A-0218229A" });
    expect(onChange).toHaveBeenCalledWith({ tourId: 8 });
  });

  it("resets tour and trigger filters back to undefined for the all state", () => {
    const onChange = vi.fn();

    renderToStaticMarkup(
      <MonitoringFilterPanel
        filters={{ ...defaultMonitoringFilters, tourId: 7, triggerCode: "TR-02" }}
        onChange={onChange}
        tours={[{ id: 7, name: "Tour 7", color: "#2563eb", version: 1 }]}
      />,
    );

    expect(selectCalls[0].value).toBe("7");
    expect(selectCalls[1].value).toBe("TR-02");

    (selectCalls[0].onValueChange as ((value: string) => void))("all");
    (selectCalls[1].onValueChange as ((value: string) => void))("all");

    expect(onChange).toHaveBeenCalledWith({ tourId: undefined });
    expect(onChange).toHaveBeenCalledWith({ triggerCode: undefined });
  });
});
