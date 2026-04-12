/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der reservierte Termin-Storno-Tag wird namensbasiert robust erkannt.
 * - Die systemverwalteten Report-Tags "Reklamation", "Sondermaß" und "Anmerkungen" werden robust erkannt.
 * - "Anmerkungen" bleibt sichtbar in allen Pickern und ist kein geschuetzter System-Tag.
 * - Die serverseitigen Picker-Filter vereinheitlichen alle Domaenen auf "alles ausser Storniert".
 *
 * Fehlerfaelle:
 * - "Anmerkungen" wuerde wie ein geschuetzter oder versteckter System-Tag behandelt.
 * - Picker-Filter behalten alte domaenenspezifische Ausschluesse fuer Managed-Tags bei.
 *
 * Ziel:
 * Die zentrale Tag-Hilfslogik fuer die vereinheitlichte Picker-Sichtbarkeit ohne DB-Abhaengigkeit regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import {
  MANAGED_COMPLAINT_TAG_COLOR,
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
  isManagedComplaintTagName,
  isManagedRemarksTagName,
  isManagedSpecialMeasureTagName,
  isPickerVisibleForDomain,
  isProtectedSystemTagName,
  isReservedAppointmentCancellationTagName,
  isReservedVacantTagName,
} from "../../../shared/appointmentCancellation";
import {
  filterPickerTagsForDomain,
  filterVisibleAppointmentTagRelations,
  filterVisibleAppointmentTags,
  hasAppointmentCancellationTag,
  hasManagedComplaintTag,
  hasManagedRemarksTag,
  isAppointmentCancellationTag,
  isManagedComplaintTag,
  isManagedRemarksTag,
} from "../../../server/lib/appointmentCancellation";

describe("appointment cancellation helpers", () => {
  it("detects the reserved cancellation tag name case-insensitively", () => {
    expect(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME).toBe("Storniert");
    expect(RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR).toBe("#2C2C2A");
    expect(isReservedAppointmentCancellationTagName("Storniert")).toBe(true);
    expect(isReservedAppointmentCancellationTagName(" storniert ")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("STORNIERT")).toBe(true);
    expect(isReservedAppointmentCancellationTagName("Abgesagt")).toBe(false);
  });

  it("detects the managed FT26 report tags and keeps remarks unprotected", () => {
    expect(MANAGED_COMPLAINT_TAG_NAME).toBe("Reklamation");
    expect(MANAGED_COMPLAINT_TAG_COLOR).toBe("#FF011B");
    expect(MANAGED_SPECIAL_MEASURE_TAG_NAME).toBe("Sondermaß");
    expect(MANAGED_SPECIAL_MEASURE_TAG_COLOR).toBe("#BA7517");
    expect(MANAGED_REMARKS_TAG_NAME).toBe("Anmerkungen");

    expect(isManagedComplaintTagName(" reklamation ")).toBe(true);
    expect(isManagedSpecialMeasureTagName("SONDERMASS")).toBe(true);
    expect(isManagedRemarksTagName(" anmerkungen ")).toBe(true);
    expect(isManagedRemarksTagName("Anmerkungen Intern")).toBe(false);

    expect(isProtectedSystemTagName("Storniert")).toBe(true);
    expect(isProtectedSystemTagName("Reklamation")).toBe(true);
    expect(isProtectedSystemTagName("Sondermaß")).toBe(true);
    expect(isProtectedSystemTagName(RESERVED_VACANT_TAG_NAME)).toBe(true);
    expect(isProtectedSystemTagName("Anmerkungen")).toBe(false);

    expect(RESERVED_VACANT_TAG_NAME).toBe("Geparkt");
    expect(isReservedVacantTagName("Geparkt")).toBe(true);
    expect(isReservedVacantTagName(" geparkt ")).toBe(true);
    expect(isReservedVacantTagName("GEPARKT")).toBe(true);
    expect(isReservedVacantTagName("Vakant")).toBe(false);
  });

  it("detects managed tags across server-side helpers", () => {
    expect(isAppointmentCancellationTag({ name: "Storniert" })).toBe(true);
    expect(hasAppointmentCancellationTag([{ name: "Normal" }, { name: "Storniert" }])).toBe(true);

    expect(isManagedComplaintTag({ name: "Reklamation" })).toBe(true);
    expect(hasManagedComplaintTag([{ name: "Normal" }, { name: "Reklamation" }])).toBe(true);

    expect(isManagedRemarksTag({ name: "Anmerkungen" })).toBe(true);
    expect(hasManagedRemarksTag([{ name: "Normal" }, { name: "Anmerkungen" }])).toBe(true);
    expect(hasManagedRemarksTag([{ name: "Normal" }])).toBe(false);
  });

  it("filters only the reserved cancellation tag from visible picker collections", () => {
    for (const domain of ["appointment", "project", "customer", "employee"] as const) {
      expect(isPickerVisibleForDomain("Info", domain)).toBe(true);
      expect(isPickerVisibleForDomain("Anmerkungen", domain)).toBe(true);
      expect(isPickerVisibleForDomain("Reklamation", domain)).toBe(true);
      expect(isPickerVisibleForDomain(MANAGED_SPECIAL_MEASURE_TAG_NAME, domain)).toBe(true);
    }

    expect(isPickerVisibleForDomain("Storniert", "appointment")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "project")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "customer")).toBe(false);
    expect(isPickerVisibleForDomain("Storniert", "employee")).toBe(false);

    expect(isPickerVisibleForDomain("Geparkt", "appointment")).toBe(false);
    expect(isPickerVisibleForDomain("Geparkt", "project")).toBe(false);
    expect(isPickerVisibleForDomain("Geparkt", "customer")).toBe(false);
    expect(isPickerVisibleForDomain("Geparkt", "employee")).toBe(false);

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

    expect(filterPickerTagsForDomain([
      { name: "Info" },
      { name: "Storniert" },
      { name: "Reklamation" },
      { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
      { name: MANAGED_REMARKS_TAG_NAME },
    ], "customer")).toEqual([
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
