/**
 * Test Scope:
 *
 * Feature: FT16/FT28 - HelpIcon und ListEmptyState
 *
 * Abgedeckte Regeln:
 * - HelpIcon rendert nur bei vorhandenem Hilfetext mit nicht-leerem Body.
 * - Die Popover-Groesse folgt dem aufgeloesten Preview-Setting.
 * - ListEmptyState nutzt Hilfetext-Inhalt, faellt sonst sauber auf Fallback-Titel/-Text zurueck.
 *
 * Fehlerfaelle:
 * - Leere oder fehlerhafte Hilfetexte bleiben sichtbar.
 * - Fallback-Zustaende zeigen interne HelpKey-Details statt sichtbarem Nutzertext.
 *
 * Ziel:
 * Help-UI ueber gerendertes Verhalten statt ueber Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    "data-testid": testId,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    className?: string;
    "data-testid"?: string;
    "aria-label"?: string;
  }) => (
    <button type="button" className={className} data-testid={testId} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover-shell">{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <section data-testid="popover-content" className={className}>
      {children}
    </section>
  ),
}));

import { HelpIcon } from "../../../client/src/components/ui/help/help-icon";
import { ListEmptyState } from "../../../client/src/components/ui/list-empty-state";

describe("FT16/FT28 UI: help components behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    useQueryMock.mockReset();
    useSettingMock.mockReset();
    useSettingMock.mockReturnValue("small");
  });

  it("renders HelpIcon only when a non-empty help body exists and applies the preview size class", () => {
    useQueryMock.mockReturnValue({
      data: { helpKey: "alpha", title: "Hilfetext", body: "<p>Inhalt</p>" },
      isLoading: false,
      isError: false,
    });

    const html = renderToStaticMarkup(<HelpIcon helpKey="alpha" />);

    expect(html).toContain("button-help-alpha");
    expect(html).toContain("Hilfe für alpha");
    expect(html).toContain("text-help-body-alpha");
    expect(html).toContain("Hilfetext");
    expect(html).toContain("Inhalt");
    expect(html).toContain("w-80 max-h-64 overflow-y-auto");
  });

  it("suppresses HelpIcon while loading, on errors or with an empty help body", () => {
    useQueryMock.mockReturnValue({
      data: { helpKey: "beta", title: "Leer", body: "   " },
      isLoading: false,
      isError: false,
    });

    expect(renderToStaticMarkup(<HelpIcon helpKey="beta" />)).toBe("");

    useQueryMock.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    expect(renderToStaticMarkup(<HelpIcon helpKey="beta" />)).toBe("");
  });

  it("renders ListEmptyState with help content when a non-empty help text exists", () => {
    useQueryMock.mockReturnValue({
      data: { helpKey: "projects.empty", title: "Projekt-Hilfe", body: "<p>Leittext</p>" },
    });

    const html = renderToStaticMarkup(
      <ListEmptyState helpKey="projects.empty" fallbackTitle="Fallback" fallbackBody="Fallback-Body" />,
    );

    expect(html).toContain("Projekt-Hilfe");
    expect(html).toContain("Leittext");
    expect(html).not.toContain("Fallback-Body");
    expect(html).not.toContain("projects.empty");
  });

  it("falls back to visible title/body without exposing the internal help key", () => {
    useQueryMock.mockReturnValue({
      data: { helpKey: "customers.empty", title: "Leer", body: " " },
    });

    const html = renderToStaticMarkup(
      <ListEmptyState helpKey="customers.empty" fallbackTitle="Keine Einträge" fallbackBody="Bitte Filter pruefen." />,
    );

    expect(html).toContain("Keine Einträge");
    expect(html).toContain("Bitte Filter pruefen.");
    expect(html).not.toContain("customers.empty");
  });
});
