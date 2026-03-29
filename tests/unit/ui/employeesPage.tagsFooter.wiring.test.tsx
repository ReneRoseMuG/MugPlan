/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EmployeesPage rendert in der Board-Karte die Footer-Badge-Zeile für Termine, Notizen und Anhänge.
 * - Die Mitarbeiterkarte übergibt die serverseitig gelieferten Tags an EntityTagFooterRow.
 * - Die neuen Mitarbeiter-Zähler stammen direkt aus der Listenprojektion.
 *
 * Fehlerfälle:
 * - Notiz- oder Anhang-Badges fehlen im Mitarbeiterkartenfooter.
 * - Die Mitarbeiterliste liefert die neuen Count-Felder nicht bis in die Karte durch.
 *
 * Ziel:
 * Das Footer-Wiring der Mitarbeiterkarte für die vereinheitlichten Badges regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const appointmentPreviewCalls: Array<Record<string, unknown>> = [];
const notesPreviewCalls: Array<Record<string, unknown>> = [];
const attachmentPreviewCalls: Array<Record<string, unknown>> = [];
const tagFooterCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: (options: unknown) => useListFiltersMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, footerSlot, contentSlot }: { filterSlot?: React.ReactNode; footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {filterSlot}
      {footerSlot}
      {contentSlot}
    </section>
  ),
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

vi.mock("@/components/ui/filter-panels/employee-filter-panel", () => ({
  EmployeeFilterPanel: () => <div>employee-filter-panel</div>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: (props: Record<string, unknown> & { children?: React.ReactNode; footer?: React.ReactNode }) => {
    entityCardCalls.push(props);
    return (
      <article data-testid={String(props.testId)}>
        {props.children}
        {props.footer}
      </article>
    );
  },
}));

vi.mock("@/components/ui/entity-appointments-hover-preview", () => ({
  EntityAppointmentsHoverPreview: (props: Record<string, unknown>) => {
    appointmentPreviewCalls.push(props);
    const source = props.source as { count?: number } | undefined;
    return <span>Termine:{String(source?.count ?? 0)}</span>;
  },
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: (props: Record<string, unknown>) => {
    notesPreviewCalls.push(props);
    const sources = props.sources as { count?: number } | undefined;
    return <span>Notizen:{String(sources?.count ?? 0)}</span>;
  },
}));

vi.mock("@/components/ui/EmployeeAttachmentsHover", () => ({
  EmployeeAttachmentsHover: (props: Record<string, unknown>) => {
    attachmentPreviewCalls.push(props);
    return <span>Anhänge:{String(props.totalAttachmentsCount ?? 0)}</span>;
  },
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: (props: Record<string, unknown>) => {
    tagFooterCalls.push(props);
    return <div data-testid={String(props.testId)}>tags</div>;
  },
}));

vi.mock("@/components/EmployeeForm", () => ({
  EmployeeForm: () => <div>employee-form</div>,
}));

vi.mock("@/components/ImportExportPage", () => ({
  EmployeeImportPanel: () => <div>employee-import-panel</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: () => <div>team</div>,
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: () => <div>tour</div>,
}));

vi.mock("@/components/ui/table-hover-previews", () => ({
  EmployeeTableHoverPreview: () => <div>employee-table-preview</div>,
}));

import { EmployeesPage } from "../../../client/src/components/EmployeesPage";

describe("FT05+ employees page footer badge wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    appointmentPreviewCalls.length = 0;
    notesPreviewCalls.length = 0;
    attachmentPreviewCalls.length = 0;
    tagFooterCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { lastName: "" },
      setFilter: vi.fn(),
    });

    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const queryKey = options.queryKey;
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

      if (key === "/api/employees") {
        return {
          data: [
            {
              id: 8,
              firstName: "Mia",
              lastName: "Muster",
              fullName: "Muster, Mia",
              phone: "0123",
              email: "mia@example.test",
              teamId: null,
              tourId: null,
              isActive: true,
              version: 2,
              notesCount: 3,
              attachmentsCount: 2,
              tags: [
                { id: 4, name: "Montage", color: "#112233", isDefault: false, version: 1 },
              ],
            },
          ],
          isLoading: false,
        };
      }

      if (key === "/api/tours" || key === "/api/teams") {
        return { data: [], isLoading: false };
      }

      if (key === "employees-page-appointments") {
        return {
          data: new Map([[8, [{ id: 91, startDate: "2099-03-10", startTimeHour: 8 }]]]),
          isLoading: false,
        };
      }

      return { data: [], isLoading: false };
    });

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  it("renders the unified employee footer badges with list-projected counters", () => {
    const markup = renderToStaticMarkup(<EmployeesPage />);

    expect(markup).toContain("Termine:1");
    expect(markup).toContain("Notizen:3");
    expect(markup).toContain("Anhänge:2");
    expect(entityCardCalls[0]).toMatchObject({
      testId: "employee-card-8",
      footerVisibility: "visible",
    });
    expect(appointmentPreviewCalls[0]).toMatchObject({
      source: { type: "employee", id: 8, count: 1 },
      triggerTestId: "text-employee-current-appointments-8",
    });
    expect(notesPreviewCalls[0]).toMatchObject({
      sources: { type: "employee", id: 8, count: 3 },
      triggerTestId: "text-employee-notes-count-8",
    });
    expect(attachmentPreviewCalls[0]).toMatchObject({
      employeeId: 8,
      totalAttachmentsCount: 2,
      triggerTestId: "text-employee-attachments-count-8",
    });
    expect(tagFooterCalls[0]).toMatchObject({
      testId: "employee-card-tags-8",
      tags: [{ id: 4, name: "Montage" }],
    });
  });
});
