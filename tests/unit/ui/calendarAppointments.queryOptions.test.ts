import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

import {
  useCalendarAppointments,
  useCalendarBlockedTourWeeks,
} from "../../../client/src/lib/calendar-appointments";

describe("calendar appointments query options", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({ data: [] });
  });

  it("forces calendar appointments to refetch on mount instead of reusing the infinite-stale global cache", () => {
    useCalendarAppointments({
      fromDate: "2026-04-27",
      toDate: "2026-05-31",
      userRole: "ADMIN",
      detail: "full",
    });

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      staleTime: 0,
      refetchOnMount: "always",
      queryKey: ["calendarAppointments", "2026-04-27", "2026-05-31", "all", "ADMIN", "full"],
    }));
  });

  it("forces blocked tour weeks to refetch on mount instead of trusting a cached month range forever", () => {
    useCalendarBlockedTourWeeks({
      fromDate: "2026-04-27",
      toDate: "2026-05-31",
    });

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      staleTime: 0,
      refetchOnMount: "always",
      queryKey: ["calendarBlockedTourWeeks", "2026-04-27", "2026-05-31"],
    }));
  });
});
