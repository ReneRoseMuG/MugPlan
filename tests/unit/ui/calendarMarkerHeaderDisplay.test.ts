import { describe, expect, it } from "vitest";
import { resolveCalendarMarkerHeaderVariant } from "../../../client/src/lib/calendar-marker-header-display";

describe("calendar marker header display", () => {
  it("uses the full label when enough width is available", () => {
    expect(resolveCalendarMarkerHeaderVariant({
      availableWidth: 112,
      fullWidth: 96,
      ftWidth: 30,
      iconWidth: 28,
    })).toBe("full");
  });

  it("falls back to FT when the full label no longer fits", () => {
    expect(resolveCalendarMarkerHeaderVariant({
      availableWidth: 32,
      fullWidth: 96,
      ftWidth: 30,
      iconWidth: 28,
    })).toBe("ft");
  });

  it("falls back to the icon when even FT no longer fits", () => {
    expect(resolveCalendarMarkerHeaderVariant({
      availableWidth: 20,
      fullWidth: 96,
      ftWidth: 30,
      iconWidth: 28,
    })).toBe("icon");
  });
});
