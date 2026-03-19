/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der reservierte Termin-Storno-Tag wird namensbasiert robust erkannt.
 * - Der systemverwaltete Vorlauflisten-Tag "Reklamation" wird namensbasiert robust erkannt.
 * - Termin-Tag-Listen blenden den reservierten Storno-Tag aus.
 * - Der Vorlauflisten-Tag bleibt in normalen Tag-Listen sichtbar.
 * - Die Storno-Erkennung bleibt gegen Gross-/Kleinschreibung und Leerzeichen stabil.
 *
 * Fehlerfaelle:
 * - "Storniert" wird in anderen Schreibweisen nicht erkannt.
 * - Der reservierte Tag bleibt in generischen Termin-Tag-Listen sichtbar.
 *
 * Ziel:
 * Die zentrale Hilfslogik fuer den reservierten Einweg-Storno ohne DB-Abhaengigkeit absichern.
 */
import { describe, expect, it } from "vitest";
import {
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  isManagedReportExclusionTagName,
  isProtectedSystemTagName,
  isReservedAppointmentCancellationTagName,
} from "../../../shared/appointmentCancellation";
import {
  filterVisibleAppointmentTagRelations,
  filterVisibleAppointmentTags,
  hasAppointmentCancellationTag,
  hasManagedReportExclusionTag,
  isAppointmentCancellationTag,
  isManagedReportExclusionTag,
} from "../../../server/lib/appointmentCancellation";

describe("appointment cancellation helpers", () => {
  it("detects the reserved cancellation tag name case-insensitively", () => {
    expect(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME).toBe("Storniert");
    expect(isReservedAppointmentCancellationTagName("Storniert")).toBe(true);
    expect(isReservedAppointmentCancellationTagName(" storniert ")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("STORNIERT")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("Abgesagt")).toBe(false);
  });

  it("detects the managed report exclusion tag and protected system tag names", () => {
    expect(MANAGED_REPORT_EXCLUSION_TAG_NAME).toBe("Reklamation");
    expect(MANAGED_REPORT_EXCLUSION_TAG_COLOR).toBe("#f97316");
    expect(isManagedReportExclusionTagName("Reklamation")).toBe(true);
    expect(isManagedReportExclusionTagName(" reklamation ")).toBe(true);
    expect(isManagedReportExclusionTagName("REKLAMATION")).toBe(true);
    expect(isManagedReportExclusionTagName("Reklamation Orange")).toBe(false);
    expect(isProtectedSystemTagName("Storniert")).toBe(true);
    expect(isProtectedSystemTagName("Reklamation")).toBe(true);
    expect(isProtectedSystemTagName("Info")).toBe(false);
  });

  it("detects cancellation tags across server-side helpers", () => {
    expect(isAppointmentCancellationTag({ name: "Storniert" })).toBe(true);
    expect(isAppointmentCancellationTag({ name: "Normal" })).toBe(false);
    expect(hasAppointmentCancellationTag([{ name: "Normal" }, { name: "Storniert" }])).toBe(true);
    expect(hasAppointmentCancellationTag([{ name: "Normal" }])).toBe(false);
  });

  it("detects managed report exclusion tags across server-side helpers", () => {
    expect(isManagedReportExclusionTag({ name: "Reklamation" })).toBe(true);
    expect(isManagedReportExclusionTag({ name: "Normal" })).toBe(false);
    expect(hasManagedReportExclusionTag([{ name: "Normal" }, { name: "Reklamation" }])).toBe(true);
    expect(hasManagedReportExclusionTag([{ name: "Normal" }])).toBe(false);
  });

  it("filters the reserved cancellation tag from visible tag collections", () => {
    expect(filterVisibleAppointmentTags([{ name: "Info" }, { name: "Storniert" }, { name: "Reklamation" }])).toEqual([
      { name: "Info" },
      { name: "Reklamation" },
    ]);
    const relations = [
      { tag: { name: "Storniert" }, relationVersion: 1 },
      { tag: { name: "Reklamation" }, relationVersion: 3 },
      { tag: { name: "Info" }, relationVersion: 2 },
    ];
    expect(
      filterVisibleAppointmentTagRelations(relations as any),
    ).toEqual([
      { tag: { name: "Reklamation" }, relationVersion: 3 },
      { tag: { name: "Info" }, relationVersion: 2 },
    ]);
  });
});
