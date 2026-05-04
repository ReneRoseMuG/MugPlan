import { describe, expect, it } from "vitest";
import { getReadableNoteTextColors, shouldUseLightNoteText } from "../../../client/src/lib/note-colors";

describe("note color contrast", () => {
  it("uses dark text on light note backgrounds", () => {
    expect(shouldUseLightNoteText("#f8fafc")).toBe(false);
    expect(getReadableNoteTextColors("#fef3c7")).toMatchObject({
      primary: "#0f172a",
      isLight: false,
    });
  });

  it("uses light text on dark note backgrounds", () => {
    expect(shouldUseLightNoteText("#1e40af")).toBe(true);
    expect(getReadableNoteTextColors("#4c1d95")).toMatchObject({
      primary: "#ffffff",
      isLight: true,
    });
  });

  it("falls back to dark text for missing or invalid colors", () => {
    expect(shouldUseLightNoteText(null)).toBe(false);
    expect(shouldUseLightNoteText("not-a-color")).toBe(false);
  });

  it("supports short hex colors", () => {
    expect(shouldUseLightNoteText("#000")).toBe(true);
    expect(shouldUseLightNoteText("#fff")).toBe(false);
  });
});
