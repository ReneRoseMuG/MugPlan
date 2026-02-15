/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – Adaptive Preview-Breite
 *
 * Abgedeckte Regeln:
 * - Ohne gespeicherten Messwert wird die Fallback-Breite verwendet.
 * - Mit gespeicherten Messwert wird die gemessene Breite verwendet.
 *
 * Fehlerfälle:
 * - Ungueltige gespeicherte Werte werden verworfen.
 *
 * Ziel:
 * Stabilitaet der Breitenauflösung fuer Weekly-Previews absichern.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEEKLY_PREVIEW_WIDTH_FALLBACK_PX,
  WEEKLY_PREVIEW_WIDTH_STORAGE_KEY,
  parseStoredWeeklyPreviewWidth,
  resolveWeeklyPreviewWidthPx,
  storeWeeklyPreviewWidth,
} from "../../../client/src/lib/preview-width";

describe("FT03 weekly preview width resolution", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns fallback width when no value is stored", () => {
    expect(resolveWeeklyPreviewWidthPx()).toBe(WEEKLY_PREVIEW_WIDTH_FALLBACK_PX);
  });

  it("returns stored width when a valid value exists", () => {
    storeWeeklyPreviewWidth(318);
    expect(resolveWeeklyPreviewWidthPx()).toBe(318);
  });

  it("rejects invalid stored values", () => {
    expect(parseStoredWeeklyPreviewWidth("abc")).toBeNull();
    expect(parseStoredWeeklyPreviewWidth("-20")).toBeNull();
    expect(parseStoredWeeklyPreviewWidth("9999")).toBeNull();
  });
});
