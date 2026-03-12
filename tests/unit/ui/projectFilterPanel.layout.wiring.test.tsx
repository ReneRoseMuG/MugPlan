/**
 * Test Scope:
 *
 * Feature: FT02 - Projektlistenfilter Layout
 *
 * Abgedeckte Regeln:
 * - Projektname, Nachname, Kundennummer, Auftragsnummer, Scope-Switches und Tagfilter liegen in einer gemeinsamen Reihenstruktur.
 * - Kundennummer und Auftragsnummer bleiben als sichtbare Labels mit Placeholder `Suche: Nr.` erhalten.
 * - Die sichtbaren Feldbreiten bleiben fuer die Nummernfelder begrenzt.
 *
 * Fehlerfaelle:
 * - Projektfilter zerfaellt wieder in mehrere Zeilen oder verliert Felder.
 * - Nummernfelder verlieren Label oder Placeholder.
 * - Die beiden Switches oder der Tagfilter fallen aus der gemeinsamen Reihe.
 *
 * Ziel:
 * Das Projektfilter-Panel ueber gerendertes Markup und Props statt ueber Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const filterPanelCalls: Array<Record<string, unknown>> = [];
const tagFilterCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    filterPanelCalls.push(props);
    return <section data-testid="project-filter-panel">{props.children}</section>;
  },
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: ({ helpKey }: { helpKey: string }) => <span data-help-key={helpKey}>help</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, className }: { children?: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked }: { id: string; checked: boolean }) => (
    <input type="checkbox" id={id} checked={checked} readOnly />
  ),
}));

vi.mock("@/components/filters/project-title-filter-input", () => ({
  ProjectTitleFilterInput: (props: Record<string, unknown>) => (
    <div data-testid="filter-project-title" data-class={String(props.className)}>
      <label>Projektname</label>
      <input placeholder="Suche: Projektname" defaultValue={String(props.value ?? "")} />
    </div>
  ),
}));

vi.mock("@/components/filters/customer-name-filter-input", () => ({
  CustomerNameFilterInput: (props: Record<string, unknown>) => (
    <div data-testid="filter-customer-last-name" data-class={String(props.className)}>
      <label>Nachname</label>
      <input placeholder="Suche: Nachname" defaultValue={String(props.value ?? "")} />
    </div>
  ),
}));

vi.mock("@/components/filters/customer-number-filter-input", () => ({
  CustomerNumberFilterInput: (props: Record<string, unknown>) => (
    <div data-testid="filter-customer-number" data-class={String(props.className)}>
      <label>Kundennummer</label>
      <input placeholder={`Suche: ${String(props.placeholderLabel ?? "Kundennummer")}`} defaultValue={String(props.value ?? "")} />
    </div>
  ),
}));

vi.mock("@/components/filters/project-order-number-filter-input", () => ({
  ProjectOrderNumberFilterInput: (props: Record<string, unknown>) => (
    <div data-testid="filter-project-order-number" data-class={String(props.className)}>
      <label>Auftragsnummer</label>
      <input placeholder={`Suche: ${String(props.placeholderLabel ?? "Auftragsnummer")}`} defaultValue={String(props.value ?? "")} />
    </div>
  ),
}));

vi.mock("@/components/filters/tag-filter-input", () => ({
  TagFilterInput: (props: Record<string, unknown>) => {
    tagFilterCalls.push(props);
    return <div data-testid="filter-project-tag">Tagfilter</div>;
  },
}));

import { ProjectFilterPanel } from "../../../client/src/components/ui/filter-panels/project-filter-panel";

describe("FT02 UI: project filter panel layout wiring", () => {
  const noop = () => undefined;

  beforeEach(() => {
    filterPanelCalls.length = 0;
    tagFilterCalls.length = 0;
    vi.stubGlobal("React", React);
  });

  const renderPanel = (overrides?: Partial<React.ComponentProps<typeof ProjectFilterPanel>>) => renderToStaticMarkup(
    <ProjectFilterPanel
      title="Projektfilter"
      projectTitle=""
      onProjectTitleChange={noop}
      onProjectTitleClear={noop}
      customerLastName=""
      onCustomerLastNameChange={noop}
      onCustomerLastNameClear={noop}
      customerNumber=""
      onCustomerNumberChange={noop}
      onCustomerNumberClear={noop}
      orderNumber=""
      onOrderNumberChange={noop}
      onOrderNumberClear={noop}
      selectedTags={[]}
      availableTags={[]}
      tagPickerOpen={false}
      onTagPickerOpenChange={noop}
      onAddTag={noop}
      onRemoveTag={noop}
      projectScope="upcoming"
      onProjectScopeChange={noop}
      {...overrides}
    />,
  );

  it("renders the shared row with project and customer filters in the expected order", () => {
    const html = renderPanel({ projectTitle: "Projekt A", customerLastName: "Muster", customerNumber: "C-1", orderNumber: "ORD-1" });

    const projectIndex = html.indexOf("filter-project-title");
    const customerIndex = html.indexOf("filter-customer-last-name");
    const customerNumberIndex = html.indexOf("filter-customer-number");
    const orderNumberIndex = html.indexOf("filter-project-order-number");
    const allProjectsIndex = html.indexOf("Alle Projekte");
    const noAppointmentsIndex = html.indexOf("Ohne Termine");
    const tagIndex = html.indexOf("filter-project-tag");

    expect(projectIndex).toBeGreaterThan(-1);
    expect(customerIndex).toBeGreaterThan(projectIndex);
    expect(customerNumberIndex).toBeGreaterThan(customerIndex);
    expect(orderNumberIndex).toBeGreaterThan(customerNumberIndex);
    expect(allProjectsIndex).toBeGreaterThan(orderNumberIndex);
    expect(noAppointmentsIndex).toBeGreaterThan(allProjectsIndex);
    expect(tagIndex).toBeGreaterThan(noAppointmentsIndex);
  });

  it("keeps visible number labels and the normalized number placeholder", () => {
    const html = renderPanel();

    expect(html).toContain("Kundennummer");
    expect(html).toContain("Auftragsnummer");
    expect(html).toContain("Suche: Nr.");
  });

  it("keeps constrained field widths and forwards the tag picker wiring", () => {
    renderPanel({ tagPickerOpen: true, projectScope: "all" });

    expect(filterPanelCalls[0]).toMatchObject({
      title: "Projektfilter",
      layout: "row",
    });
    expect(tagFilterCalls[0]).toMatchObject({
      isOpen: true,
      selectedTags: [],
      availableTags: [],
    });
  });
});
