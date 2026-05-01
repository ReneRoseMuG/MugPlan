import { describe, expect, it } from "vitest";

import {
  isPickerVisibleForDomain,
  isProtectedSystemTagName,
} from "../../../shared/appointmentCancellation";

describe("FT33 unit: absence system tags", () => {
  it("keeps absence tags protected and hidden from normal tag pickers", () => {
    for (const tagName of ["Urlaub", "Krankheit", "Abwesend"]) {
      expect(isProtectedSystemTagName(tagName)).toBe(true);
      expect(isPickerVisibleForDomain(tagName, "appointment")).toBe(false);
      expect(isPickerVisibleForDomain(tagName, "employee")).toBe(false);
    }
  });
});
