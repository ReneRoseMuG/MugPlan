/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Terminlisten-Tourfilter zeigt den Platzhalter "Alle Touren" vor der sortierten Tourliste.
 * - Numerische `Tour N`-Namen werden vor freien Tournamen sortiert.
 *
 * Fehlerfälle:
 * - Terminliste und Monitoring verwenden unterschiedliche Tour-Reihenfolgen.
 * - Der UI-Platzhalter wird mit echten Touren vermischt.
 *
 * Ziel:
 * Die gemeinsame Tour-Dropdown-Sortierung in der Terminliste regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/filters/customer-number-filter-input", () => ({
  CustomerNumberFilterInput: () => <div>customer-number-filter</div>,
}));

vi.mock("@/components/filters/project-title-filter-input", () => ({
  ProjectTitleFilterInput: () => <div>project-title-filter</div>,
}));

vi.mock("@/components/filters/project-order-number-filter-input", () => ({
  ProjectOrderNumberFilterInput: () => <div>order-number-filter</div>,
}));

vi.mock("@/components/filters/tag-filter-input", () => ({
  TagFilterInput: () => <div>tag-filter</div>,
}));

vi.mock("@/components/ui/appointment-period-picker", () => ({
  AppointmentPeriodPicker: () => <div>period-picker</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
}));

import { AppointmentsFilterPanel } from "../../../client/src/components/ui/filter-panels/appointments-filter-panel";

describe("UI: AppointmentsFilterPanel tour order", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
  });

  it("renders all tours before numbered and custom tours in display order", () => {
    const html = renderToStaticMarkup(
      <AppointmentsFilterPanel
        filters={{
          projectTitle: "",
          customerLastName: "",
          customerNumber: "",
          orderNumber: "",
          tagIds: [],
        }}
        onChange={vi.fn()}
        appointmentScope="all"
        onAppointmentScopeChange={vi.fn()}
        availableRange={{ dateFrom: null, dateTo: null }}
        onResetAll={vi.fn()}
        tours={[
          { id: 10, name: "Beta", color: "#2563eb", version: 1 },
          { id: 7, name: "Tour 10", color: "#2563eb", version: 1 },
          { id: 8, name: "Tour 2", color: "#2563eb", version: 1 },
          { id: 9, name: "Alpha", color: "#2563eb", version: 1 },
        ]}
        selectedTags={[]}
        availableTags={[]}
        tagPickerOpen={false}
        onTagPickerOpenChange={vi.fn()}
      />,
    );

    expect(html.indexOf("Alle Touren")).toBeLessThan(html.indexOf("Tour 2"));
    expect(html.indexOf("Tour 2")).toBeLessThan(html.indexOf("Tour 10"));
    expect(html.indexOf("Tour 10")).toBeLessThan(html.indexOf("Alpha"));
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"));
  });
});
