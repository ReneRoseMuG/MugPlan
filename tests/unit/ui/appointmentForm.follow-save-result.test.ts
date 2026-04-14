/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Edit-Saves loesen Termin-Folge aus, wenn sich das Startdatum aendert.
 * - Edit-Saves loesen Termin-Folge aus, wenn sich die Tour aendert.
 * - Unveraenderte Termine loesen keine Termin-Folge aus.
 *
 * Fehlerfaelle:
 * - Datumswechsel innerhalb derselben Kalenderwoche wird beim Follow uebersehen.
 * - Unveraenderte Saves springen unerwartet im Kalender.
 *
 * Ziel:
 * Die SaveResult-Entscheidung fuer das automatische Folgen lokal und beobachtbar absichern.
 */
import { describe, expect, it } from "vitest";

import { shouldOfferFollowAfterAppointmentSave } from "../../../client/src/components/AppointmentForm";

describe("appointment form follow save result", () => {
  it("offers follow when the start date changes within the same calendar week", () => {
    expect(shouldOfferFollowAfterAppointmentSave({
      isEditing: true,
      savedAppointmentId: 41,
      originalTourId: 7,
      nextTourId: 7,
      originalStartDate: "2026-04-14",
      nextStartDate: "2026-04-16",
    })).toBe(true);
  });

  it("offers follow when the tour changes", () => {
    expect(shouldOfferFollowAfterAppointmentSave({
      isEditing: true,
      savedAppointmentId: 41,
      originalTourId: 7,
      nextTourId: 9,
      originalStartDate: "2026-04-14",
      nextStartDate: "2026-04-14",
    })).toBe(true);
  });

  it("does not offer follow for unchanged edit saves", () => {
    expect(shouldOfferFollowAfterAppointmentSave({
      isEditing: true,
      savedAppointmentId: 41,
      originalTourId: 7,
      nextTourId: 7,
      originalStartDate: "2026-04-14",
      nextStartDate: "2026-04-14",
    })).toBe(false);
  });
});
