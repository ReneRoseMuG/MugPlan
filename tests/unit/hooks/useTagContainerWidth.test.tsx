import { describe, expect, it } from "vitest";
import { resolveTagContainerWidthLevel } from "../../../client/src/hooks/useTagContainerWidth";

describe("useTagContainerWidth", () => {
  it("maps wide, medium, narrow and ultra narrow widths to levels 0 through 3", () => {
    expect(resolveTagContainerWidthLevel(300)).toBe(0);
    expect(resolveTagContainerWidthLevel(150)).toBe(1);
    expect(resolveTagContainerWidthLevel(80)).toBe(2);
    expect(resolveTagContainerWidthLevel(79)).toBe(3);
  });

  it("keeps the documented threshold behavior", () => {
    expect(resolveTagContainerWidthLevel(200)).toBe(0);
    expect(resolveTagContainerWidthLevel(199)).toBe(1);
    expect(resolveTagContainerWidthLevel(120)).toBe(1);
    expect(resolveTagContainerWidthLevel(119)).toBe(2);
    expect(resolveTagContainerWidthLevel(80)).toBe(2);
    expect(resolveTagContainerWidthLevel(79)).toBe(3);
  });

  it("tightens the level when several tags must share the same row width", () => {
    expect(resolveTagContainerWidthLevel(200, 1)).toBe(0);
    expect(resolveTagContainerWidthLevel(200, 2)).toBe(1);
    expect(resolveTagContainerWidthLevel(160, 3)).toBe(2);
    expect(resolveTagContainerWidthLevel(120, 3)).toBe(3);
  });
});
