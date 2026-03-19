/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT24 - Termin-Previews und Terminanhaenge
 * Use Case: UC Kalender- und Preview-Daten enthalten Terminanhang-Zaehler
 *
 * Abgedeckte Regeln:
 * - Calendar-Appointment-Contracts deklarieren appointmentAttachmentsCount.
 * - Die Kalender-Aggregation mappt appointmentAttachmentsCount aus Repository-Zaehlungen.
 * - Die Frontend-Normalisierung behandelt appointmentAttachmentsCount als nichtnegativen Zaehler.
 *
 * Fehlerfaelle:
 * - Contract, Service und Frontend driften beim neuen Terminanhang-Zaehler auseinander.
 * - Kalender-Previews verlieren den Anhang-Zaehler trotz Backend-Aggregation.
 *
 * Ziel:
 * Die Verdrahtung des Terminanhang-Zaehlerpfads ueber Contract, Service und Frontend regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03/FT24 preview attachment counters wiring", () => {
  const routesPath = path.resolve(process.cwd(), "shared/routes.ts");
  const routesSource = readFileSync(routesPath, "utf8");
  const appointmentsServicePath = path.resolve(process.cwd(), "server/services/appointmentsService.ts");
  const appointmentsServiceSource = readFileSync(appointmentsServicePath, "utf8");
  const calendarAppointmentsPath = path.resolve(process.cwd(), "client/src/lib/calendar-appointments.ts");
  const calendarAppointmentsSource = readFileSync(calendarAppointmentsPath, "utf8");

  it("declares appointment attachment counters in calendar appointment contracts", () => {
    expect(routesSource).toContain("appointmentAttachmentsCount: z.number().int().min(0)");
    expect(routesSource).toContain('path: "/api/calendar/appointments"');
  });

  it("maps appointment attachment counters in the calendar aggregation service", () => {
    expect(appointmentsServiceSource).toContain("getAppointmentAttachmentCountsByAppointmentIds");
    expect(appointmentsServiceSource).toContain("appointmentAttachmentsCount: appointmentAttachmentCounts.get(row.appointment.id) ?? 0");
    expect(appointmentsServiceSource).toContain("export async function listCalendarAppointments");
  });

  it("normalizes appointment attachment counters in the calendar appointments hook", () => {
    expect(calendarAppointmentsSource).toContain("appointmentAttachmentsCount: number;");
    expect(calendarAppointmentsSource).toContain("const appointmentAttachmentsCount = Number.isFinite(rawAppointment.appointmentAttachmentsCount)");
    expect(calendarAppointmentsSource).toContain("appointmentAttachmentsCount,");
  });
});
