/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 *
 * Abgedeckte Regeln:
 * - HelpTextsPage startet beim Oeffnen den Seed-Endpunkt.
 * - Nach erfolgreichem Seed wird die HelpText-Liste invalidiert.
 * - Board-Karten zeigen den HelpKey sichtbar an.
 *
 * Fehlerfaelle:
 * - Seed bleibt aus oder fehlende Keys sind in der UI nicht nachvollziehbar.
 *
 * Ziel:
 * Den kleinen FT28-Gap im HelpTexts-Bereich ueber beobachtbares Page-Verhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settingsByKey: new Map(), setSetting: vi.fn().mockResolvedValue(undefined) }),
  useSetting: () => "large",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({ children, testId }: { children?: React.ReactNode; testId?: string }) => <article data-testid={testId}>{children}</article>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ contentSlot, footerSlot }: { contentSlot?: React.ReactNode; footerSlot?: React.ReactNode }) => <section>{contentSlot}{footerSlot}</section>,
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div>table-view</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/help-texts-filter-panel", () => ({
  HelpTextsFilterPanel: () => <div>helptexts-filter</div>,
}));

vi.mock("@/components/HelpTextsImportExportDialog", () => ({
  HelpTextsImportExportDialog: () => <div>import-export-dialog</div>,
}));

vi.mock("lucide-react", () => ({
  HelpCircle: () => <span>help</span>,
  Plus: () => <span>plus</span>,
  LayoutGrid: () => <span>grid</span>,
  Table2: () => <span>table</span>,
  ArrowDown: () => <span>down</span>,
  ArrowUp: () => <span>up</span>,
  ArrowUpDown: () => <span>sort</span>,
  Upload: () => <span>upload</span>,
}));

async function loadHelpTextsPageWithEffect() {
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let effectCall = 0;
    return {
      ...actual,
      useEffect: ((effect: () => void | (() => void)) => {
        effectCall += 1;
        if (effectCall === 2) {
          effect();
        }
      }) as typeof actual.useEffect,
    };
  });
  return import("../../../client/src/components/HelpTextsPage");
}

describe("FT28 help texts page seed behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    apiRequestMock.mockReset();
    invalidateQueriesMock.mockReset();
    useQueryMock.mockReset();
    apiRequestMock.mockResolvedValue({ ok: true });
    useQueryMock.mockReturnValue({
      data: [{
        id: 1,
        version: 3,
        helpKey: "help.alpha",
        title: "Alpha",
        body: "<p>Text</p>",
        isActive: true,
      }],
      isLoading: false,
    });
  });

  it("triggers seed and invalidates the help text list while showing the help key on the card", async () => {
    const { HelpTextsPage } = await loadHelpTextsPageWithEffect();
    const html = renderToStaticMarkup(
      <HelpTextsPage onCreateHelpText={() => undefined} onEditHelpText={() => undefined} />,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/help-texts/seed-missing-from-frontend");
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["/api/help-texts"] });
    expect(html).toContain("text-helptext-key-1");
    expect(html).toContain("Key: help.alpha");
  });
});
