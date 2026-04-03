/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der reservierte Termin-Storno-Tag wird namensbasiert robust erkannt.
 * - Die systemverwalteten Report-Tags "Reklamation", "Sondermaß" und "Anmerkungen" werden robust erkannt.
 * - "Anmerkungen" bleibt sichtbar in allen Pickern und ist kein geschuetzter System-Tag.
 * - Die serverseitigen Filter blenden weiterhin nur den Termin-Storno-Tag aus.
 *
 * Fehlerfaelle:
 * - "Anmerkungen" wuerde wie ein geschuetzter oder versteckter System-Tag behandelt.
 * - Server-Filter verlieren sichtbare Managed-Tags oder erkennen deren Namen nicht mehr robust.
 *
 * Ziel:
 * Die zentrale Tag-Hilfslogik fuer FT26 ohne DB-Abhaengigkeit regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import {
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  isManagedRemarksTagName,
  isManagedReportExclusionTagName,
  isManagedSpecialMeasureTagName,
  isPickerVisibleForDomain,
  isProtectedSystemTagName,
  isReservedAppointmentCancellationTagName,
} from "../../../shared/appointmentCancellation";
import {
  filterPickerTagsForDomain,
  filterVisibleAppointmentTagRelations,
  filterVisibleAppointmentTags,
  hasAppointmentCancellationTag,
  hasManagedRemarksTag,
  hasManagedReportExclusionTag,
  isAppointmentCancellationTag,
  isManagedRemarksTag,
  isManagedReportExclusionTag,
} from "../../../server/lib/appointmentCancellation";

describe("appointment cancellation helpers", () => {
  it("detects the reserved cancellation tag name case-insensitively", () => {
    expect(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME).toBe("Storniert");
    expect(RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR).toBe("#ef4444");
    expect(isReservedAppointmentCancellationTagName("Storniert")).toBe(true);
    expect(isReservedAppointmentCancellationTagName(" storniert ")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("STORNIERT")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("Abgesagt")).toBe(false);
  });

  it("detects the managed FT26 report tags and keeps remarks unprotected", () => {
    expect(MANAGED_REPORT_EXCLUSION_TAG_NAME).toBe("Reklamation");
    expect(MANAGED_REPORT_EXCLUSION_TAG_COLOR).toBe("#f97316");
    expect(MANAGED_SPECIAL_MEASURE_TAG_NAME).toBe("Sondermaß");
    expect(MANAGED_SPECIAL_MEASURE_TAG_COLOR).toBe("#1e3a8a");
    expect(MANAGED_REMARKS_TAG_NAME).toBe("Anmerkungen");

    expect(isManagedReportExclusionTagName(" reklamation ")).toBe(true);
    expect(isManagedSpecialMeasureTagName("SONDERMASS")).toBe(true);
    expect(isManagedRemarksTagName(" anmerkungen ")).toBe(true);
    expect(isManagedRemarksTagName("Anmerkungen Intern")).toBe(false);

    expect(isProtectedSystemTagName("Storniert")).toBe(true);
    expect(isProtectedSystemTagName("Reklamation")).toBe(true);
    expect(isProtectedSystemTagName("Sondermaß")).toBe(true);
    expect(isProtectedSystemTagName("Anmerkungen")).toBe(false);
  });

  it("detects managed tags across server-side helpers", () => {
    expect(isAppointmentCancellationTag({ name: "Storniert" })).toBe(true);
    expect(hasAppointmentCancellationTag([{ name: "Normal" }, { name: "Storniert" }])).toBe(true);

    expect(isManagedReportExclusionTag({ name: "Reklamation" })).toBe(true);
    expect(hasManagedReportExclusionTag([{ name: "Normal" }, { name: "Reklamation" }])).toBe(true);

    expect(isManagedRemarksTag({ name: "Anmerkungen" })).toBe(true);
    expect(hasManagedRemarksTag([{ name: "Normal" }, { name: "Anmerkungen" }])).toBe(true);
    expect(hasManagedRemarksTag([{ name: "Normal" }])).toBe(false);
  });

  it("filters only the reserved cancellation tag from visible picker collections", () => {
    for (const domain of ["appointment", "project", "customer", "employee"] as const) {
      expect(isPickerVisibleForDomain("Info", domain)).toBe(true);
      expect(isPickerVisibleForDomain("Anmerkungen", domain)).toBe(true);
    }

    expect(isPickerVisibleForDomain("Storniert", "appointment")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "project")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "customer")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "employee")).toBe(false);

    expect(filterPickerTagsForDomain([
      { name: "Info" },
      { name: "Storniert" },
      { name: "Reklamation" },
      { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
      { name: MANAGED_REMARKS_TAG_NAME },
    ], "project")).toEqual([
      { name: "Info" },
      { name: "Reklamation" },
      { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
      { name: MANAGED_REMARKS_TAG_NAME },
    ]);

    expect(filterVisibleAppointmentTags([
      { name: "Info" },
      { name: "Storniert" },
      { name: "Reklamation" },
      { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
      { name: MANAGED_REMARKS_TAG_NAME },
    ])).toEqual([
      { name: "Info" },
      { name: "Reklamation" },
      { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
      { name: MANAGED_REMARKS_TAG_NAME },
    ]);

    const relations = [
      { tag: { name: "Storniert" }, relationVersion: 1 },
      { tag: { name: "Reklamation" }, relationVersion: 3 },
      { tag: { name: MANAGED_SPECIAL_MEASURE_TAG_NAME }, relationVersion: 4 },
      { tag: { name: MANAGED_REMARKS_TAG_NAME }, relationVersion: 5 },
      { tag: { name: "Info" }, relationVersion: 2 },
    ];

    expect(filterVisibleAppointmentTagRelations(relations as any)).toEqual([
      { tag: { name: "Reklamation" }, relationVersion: 3 },
      { tag: { name: MANAGED_SPECIAL_MEASURE_TAG_NAME }, relationVersion: 4 },
      { tag: { name: MANAGED_REMARKS_TAG_NAME }, relationVersion: 5 },
      { tag: { name: "Info" }, relationVersion: 2 },
    ]);
  });
});
