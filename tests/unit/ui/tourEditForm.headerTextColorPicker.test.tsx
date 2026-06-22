/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Im Create-Modus erscheint der Kopfzeilen-Textfarb-Bereich nicht (keine tourId vorhanden).
 * - Im Edit-Modus ist die Abschnittsüberschrift "Kopfzeilen-Textfarbe" sichtbar.
 * - Im Edit-Modus zeigt die initiale statische Darstellung den Aktivierungsbutton ("Textfarbe festlegen").
 * - Picker und Zurücksetzen-Button fehlen in der initialen statischen Darstellung (useEffect läuft nicht).
 * - Im readOnly-Modus bleibt der Aktivierungsbutton verborgen.
 *
 * Fehlerfälle:
 * - Der Abschnitt erscheint im Create-Modus.
 * - Der Aktivierungsbutton ist im readOnly-Modus sichtbar.
 * - Picker oder Zurücksetzen-Button erscheinen ohne explizit gesetzte Farbe.
 *
 * Ziel:
 * Sichtbarkeitsgrenzen des Kopfzeilen-Textfarb-Pickers unter Create-, Edit- und readOnly-Bedingungen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
  };
});

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => ({}),
  useSettings: () => ({ setSetting: vi.fn() }),
}));

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: ({ children, header, sidebar, footer }: {
    children?: React.ReactNode;
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <section>
      {header}
      <div>{children}</div>
      {sidebar}
      {footer}
    </section>
  ),
}));

vi.mock("@/components/ui/color-select-button", () => ({
  ColorSelectButton: ({ testId }: { testId?: string }) => (
    <button type="button" data-testid={testId}>farbe</button>
  ),
}));

vi.mock("@/components/ui/members-section-header", () => ({
  MembersSectionHeader: ({ action }: { action?: React.ReactNode }) => (
    <div>members{action}</div>
  ),
}));

vi.mock("@/components/ui/plus-action-button", () => ({
  PlusActionButton: (props: Record<string, unknown>) => (
    <button type="button" {...props}>plus</button>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ testId }: { testId?: string }) => (
    <div data-testid={testId}>member</div>
  ),
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: () => <section data-testid="appointments-list-page" />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  buildIneligibleReasonById: () => ({}),
  EmployeePickerDialogList: () => <div>employee-picker</div>,
}));

import { TourEditForm } from "../../../client/src/components/TourEditForm";

const tourFixture = {
  id: 5,
  name: "Testtour",
  color: "#335577",
  version: 2,
};

const noop = async () => undefined;

describe("TourEditForm Kopfzeilen-Textfarb-Picker Sichtbarkeit", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
  });

  it("zeigt keinen Textfarb-Bereich im Create-Modus", () => {
    const html = renderToStaticMarkup(
      <TourEditForm
        tour={null}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        isCreate
        defaultName="Neue Tour"
        onCancel={() => undefined}
      />,
    );
    expect(html).not.toContain("Kopfzeilen-Textfarbe");
    expect(html).not.toContain("button-tour-header-text-color-enable");
    expect(html).not.toContain("button-tour-header-text-color-picker");
    expect(html).not.toContain("button-tour-header-text-color-reset");
  });

  it("zeigt den Abschnitt und den Aktivierungsbutton im Edit-Modus", () => {
    const html = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain("Kopfzeilen-Textfarbe");
    expect(html).toContain("Textfarbe festlegen");
    expect(html).toContain("button-tour-header-text-color-enable");
  });

  it("zeigt Picker und Reset-Button nicht in der initialen statischen Darstellung", () => {
    const html = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        onCancel={() => undefined}
      />,
    );
    // useEffect läuft nicht in renderToStaticMarkup → selectedHeaderTextColor bleibt undefined
    expect(html).not.toContain("button-tour-header-text-color-picker");
    expect(html).not.toContain("button-tour-header-text-color-reset");
  });

  it("versteckt den Aktivierungsbutton im readOnly-Modus", () => {
    const html = renderToStaticMarkup(
      <TourEditForm
        tour={tourFixture}
        allEmployees={[]}
        onSubmit={noop}
        isSaving={false}
        readOnly
        onCancel={() => undefined}
      />,
    );
    // Abschnitt ist vorhanden, aber kein interaktiver Button
    expect(html).toContain("Kopfzeilen-Textfarbe");
    expect(html).not.toContain("button-tour-header-text-color-enable");
    expect(html).not.toContain("button-tour-header-text-color-picker");
    expect(html).not.toContain("button-tour-header-text-color-reset");
  });
});
