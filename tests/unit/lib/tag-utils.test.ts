/**
 * Test Scope:
 *
 * Feature: FT28 - Tagging System
 * Use Case: UC Kurzlabel und deduplizierte Tag-Sammlungen
 *
 * Abgedeckte Regeln:
 * - Einwort-Tags werden auf maximal vier Zeichen mit initialer Großschreibung verkürzt und erhalten nur bei echter Kürzung einen Punkt.
 * - Mehrwort-Tags werden über bis zu drei Anfangsbuchstaben zusammengezogen.
 * - Tag-Sammlungen aus Termin/Kunde/Projekt werden stabil über die Tag-ID dedupliziert.
 * - Druckrelevante Tour-Tags beschränken sich auf Sondermaß und Reklamation.
 *
 * Fehlerfälle:
 * - Mehrdeutige oder zu lange Badge-Labels für Tags.
 * - Doppelte Tags aus mehreren Quellen erscheinen mehrfach in Karten/Previews.
 * - Irrelevante Tags wie "Fix" werden in der Tour-Druckausgabe mitgeschleppt.
 *
 * Ziel:
 * Die fachliche Kernlogik für Tag-Badges und aggregierte Termin-Tags regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import type { Tag } from "../../../shared/schema";
import { mergeTourPrintTags, mergeUniqueTags, trimTagLabel } from "../../../client/src/lib/tag-utils";

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
  it("builds a title-cased short label for single-word tags with an abbreviation dot only when needed", () => {
    expect(trimTagLabel("montage")).toBe("Mont.");
    expect(trimTagLabel("Reklamation")).toBe("Rekl.");
    expect(trimTagLabel("AB")).toBe("Ab");
    expect(trimTagLabel("Demo")).toBe("Demo");
    expect(trimTagLabel("x")).toBe("X");
  });

  it("supports narrower single-word trimming levels while keeping the default backward compatible", () => {
    expect(trimTagLabel("Reklamation", 0)).toBe("Rekl.");
    expect(trimTagLabel("Reklamation", 1)).toBe("Rek.");
    expect(trimTagLabel("Reklamation", 2)).toBe("Re");
    expect(trimTagLabel("Reklamation", 3)).toBe("R");
    expect(trimTagLabel("IT", 2)).toBe("It");
    expect(trimTagLabel("IT", 3)).toBe("I");
    expect(trimTagLabel("A", 2)).toBe("A");
    expect(trimTagLabel("Re")).toBe("Re");
  });

  it("builds uppercase initials for multi-word tags and narrows them further on small levels", () => {
    expect(trimTagLabel("demo montage")).toBe("DM");
    expect(trimTagLabel("nacharbeit kunde projekt")).toBe("NKP");
    expect(trimTagLabel("eins zwei drei vier")).toBe("EZD");
    expect(trimTagLabel("messe aufbau/abbau", 2)).toBe("MA");
    expect(trimTagLabel("nacharbeit kunde projekt", 2)).toBe("NK");
    expect(trimTagLabel("nacharbeit kunde projekt", 3)).toBe("N");
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

  it("keeps only Sondermaß and Reklamation for the tour print info pills", () => {
    const specialMeasureTag = buildTag({ id: 1, name: "Sondermaß" });
    const reportExclusionTag = buildTag({ id: 2, name: "Reklamation" });
    const irrelevantTag = buildTag({ id: 3, name: "Fix" });

    const result = mergeTourPrintTags(
      [irrelevantTag, specialMeasureTag],
      [reportExclusionTag],
      [buildTag({ id: 4, name: "Montage" })],
    );

    expect(result.map((tag) => tag.name)).toEqual(["Sondermaß", "Reklamation"]);
  });
});
