/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - READER sieht in TourManagement keine Neuanlageaktion.
 * - DISPONENT behaelt die sichtbare Neuanlageaktion.
 * - Tour-Karten rendern ohne Mitgliederpanel im Kartenkontext.
 *
 * Fehlerfaelle:
 * - Der Readonly-Modus zeigt wieder Mutationsaktionen an.
 * - Berechtigte Rollen verlieren den Tour-Anlageeinstieg.
 *
 * Ziel:
 * Das rollenabhaengige Sichtbarkeitsverhalten in TourManagement ueber gerendertes Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-10",
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(),
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ footerSlot, contentSlot }: { footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {footerSlot}
      {contentSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children, gridTestId }: { children?: React.ReactNode; gridTestId?: string }) => (
    <div data-testid={gridTestId}>{children}</div>
  ),
}));

vi.mock("@/components/ui/colored-entity-card", () => ({
  ColoredEntityCard: ({ children, footer, testId }: { children?: React.ReactNode; footer?: React.ReactNode; testId?: string }) => (
    <article data-testid={testId}>
      {children}
      {footer}
    </article>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ testId }: { testId?: string }) => <div data-testid={testId}>member</div>,
}));

vi.mock("@/components/ui/members-section-header", () => ({
  MembersSectionHeader: () => <div>members</div>,
}));

vi.mock("@/components/ui/badge-interaction-provider", () => ({
  BadgeInteractionProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: ({ count, testId }: { count: number; testId?: string }) => <div data-testid={testId}>{count}</div>,
}));

vi.mock("@/components/TourEditForm", () => ({
  TourEditForm: () => <section>tour-edit-form</section>,
}));

vi.mock("@/components/TourEmployeeCascadeDialog", () => ({
  TourEmployeeCascadeDialog: () => <section>cascade-dialog</section>,
}));

import { TourManagement } from "../../../client/src/components/TourManagement";

describe("FT04 TourManagement readonly behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/tours") {
        return {
          data: [{ id: 5, name: "Nordtour", color: "#224466", version: 3 }],
          isLoading: false,
        };
      }
      if (key === "/api/employees") {
        return {
          data: [{ id: 8, firstName: "Kim", lastName: "Tour", fullName: "Kim Tour", tourId: 5, version: 6, isActive: true }],
          isLoading: false,
        };
      }
      if (key === "tour-management-appointments-count") {
        return { data: new Map([[5, 2]]), isLoading: false };
      }
      return { data: [], isLoading: false };
    });
  });

  it("hides the create button for readonly users", () => {
    const html = renderToStaticMarkup(<TourManagement userRole="READER" />);

    expect(html).not.toContain("button-new-tour");
    expect(html).toContain("card-tour-5");
    expect(html).not.toContain("members");
    expect(html).not.toContain("text-tour-member-8");
    expect(html).not.toContain("Keine Mitarbeiter zugewiesen");
  });

  it("keeps the create button visible for mutating roles", () => {
    const html = renderToStaticMarkup(<TourManagement userRole="DISPONENT" />);

    expect(html).toContain("button-new-tour");
    expect(html).toContain("Neue Tour");
    expect(html).not.toContain("members");
  });
});
