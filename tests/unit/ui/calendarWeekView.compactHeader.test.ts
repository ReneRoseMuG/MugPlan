import { describe, expect, it } from "vitest";
import { formatCompactWeekDayHeader } from "../../../client/src/components/calendar/CalendarWeekView";

describe("CalendarWeekView compact day header", () => {
  it("formats German weekday and month labels", () => {
    expect(formatCompactWeekDayHeader(new Date("2026-04-27T00:00:00Z"))).toBe("Mo 27 Apr");
    expect(formatCompactWeekDayHeader(new Date("2026-03-03T00:00:00Z"))).toBe("Di 3 Mär");
  });

  it("omits the month label for the compact fallback", () => {
    expect(formatCompactWeekDayHeader(new Date("2026-12-31T00:00:00Z"), false)).toBe("Do 31");
  });
});
