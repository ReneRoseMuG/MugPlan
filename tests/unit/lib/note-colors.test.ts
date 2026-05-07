import { describe, expect, it } from "vitest";
import { getReadableNoteTextColors, shouldUseLightNoteText } from "../../../client/src/lib/note-colors";

describe("note color contrast", () => {
  it("uses fixed white text on light note backgrounds", () => {
    expect(shouldUseLightNoteText("#f8fafc")).toBe(true);
    expect(getReadableNoteTextColors("#fef3c7")).toMatchObject({
      primary: "#ffffff",
      isLight: true,
    });
  });

  it("uses light text on dark note backgrounds", () => {
    expect(shouldUseLightNoteText("#1e40af")).toBe(true);
    expect(getReadableNoteTextColors("#4c1d95")).toMatchObject({
      primary: "#ffffff",
      isLight: true,
    });
  });

  it("uses light text on strong saturated mid-tone note backgrounds", () => {
    expect(shouldUseLightNoteText("#ef4444")).toBe(true);
    expect(getReadableNoteTextColors("#ef4444")).toMatchObject({
      primary: "#ffffff",
      isLight: true,
    });
  });

  it("keeps white text for missing or invalid colors", () => {
    expect(shouldUseLightNoteText(null)).toBe(true);
    expect(shouldUseLightNoteText("not-a-color")).toBe(true);
    expect(getReadableNoteTextColors(null)).toMatchObject({
      primary: "#ffffff",
      isLight: true,
    });
  });

  it("ignores short hex colors and keeps white text", () => {
    expect(shouldUseLightNoteText("#000")).toBe(true);
    expect(shouldUseLightNoteText("#fff")).toBe(true);
  });
});
