/**
 * Test Scope:
 *
 * Feature: FT28 - Tagging System
 * Use Case: UC Kurzlabel und deduplizierte Tag-Sammlungen
 *
 * Abgedeckte Regeln:
 * - Einwort-Tags werden auf maximal drei Zeichen mit initialer Grossschreibung verkuerzt.
 * - Mehrwort-Tags werden ueber bis zu drei Anfangsbuchstaben zusammengezogen.
 * - Tag-Sammlungen aus Termin/Kunde/Projekt werden stabil ueber die Tag-ID dedupliziert.
 *
 * Fehlerfaelle:
 * - Mehrdeutige oder zu lange Badge-Labels fuer Tags.
 * - Doppelte Tags aus mehreren Quellen erscheinen mehrfach in Karten/Previews.
 *
 * Ziel:
 * Die fachliche Kernlogik fuer Tag-Badges und aggregierte Termin-Tags regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import type { Tag } from "../../../shared/schema";
import { mergeUniqueTags, trimTagLabel } from "../../../client/src/lib/tag-utils";

function buildTag(input: Partial<Tag>): Tag {
  return {
    id: 1,
    name: "Montage",
    color: "#2563eb",
    isDefault: false,
    version: 1,
    createdAt: new Date("2026-03-12T08:00:00Z"),
    updatedAt: new Date("2026-03-12T08:00:00Z"),
    ...input,
  };
}

describe("FT28 tag utils", () => {
  it("builds a title-cased short label for single-word tags", () => {
    expect(trimTagLabel("montage")).toBe("Mon");
    expect(trimTagLabel("AB")).toBe("Ab");
    expect(trimTagLabel("x")).toBe("X");
  });

  it("builds uppercase initials for multi-word tags", () => {
    expect(trimTagLabel("demo montage")).toBe("DM");
    expect(trimTagLabel("nacharbeit kunde projekt")).toBe("NKP");
    expect(trimTagLabel("eins zwei drei vier")).toBe("EZD");
  });

  it("deduplicates merged tag collections by tag id while preserving first occurrence order", () => {
    const appointmentTag = buildTag({ id: 1, name: "Termin" });
    const customerTag = buildTag({ id: 2, name: "Kunde" });
    const duplicateCustomerTag = buildTag({ id: 2, name: "Kunde doppelt" });
    const projectTag = buildTag({ id: 3, name: "Projekt" });

    const result = mergeUniqueTags(
      [appointmentTag, customerTag],
      [duplicateCustomerTag, projectTag],
      [appointmentTag],
    );

    expect(result.map((tag) => tag.id)).toEqual([1, 2, 3]);
    expect(result[1].name).toBe("Kunde");
  });
});
