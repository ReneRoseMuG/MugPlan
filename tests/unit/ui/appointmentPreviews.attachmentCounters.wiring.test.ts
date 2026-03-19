/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT24 - Termin-Previews und Terminanhaenge
 * Use Case: UC Kalender- und Preview-Daten enthalten akkumulierte Dokument-Zaehler
 *
 * Abgedeckte Regeln:
 * - Calendar-Appointment-Contracts deklarieren Kunden-, Projekt-, Termin- und Gesamtzaehler.
 * - Die Kalender-Aggregation mappt die Dokument-Zaehler aus Repository-Zaehlungen.
 * - Die Frontend-Normalisierung behandelt alle Dokument-Zaehler als nichtnegative Werte.
 *
 * Fehlerfaelle:
 * - Contract, Service und Frontend driften bei den akkumulierten Dokument-Zaehlern auseinander.
 * - Kalender-Previews verlieren Teilzaehler oder Gesamtzaehler trotz Backend-Aggregation.
 *
 * Ziel:
 * Die Verdrahtung des Dokument-Zaehlerpfads ueber Contract, Service und Frontend regressionssicher absichern.
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

  it("declares aggregated attachment counters in calendar appointment contracts", () => {
    expect(routesSource).toContain("customerAttachmentsCount: z.number().int().min(0)");
    expect(routesSource).toContain("projectAttachmentsCount: z.number().int().min(0)");
    expect(routesSource).toContain("appointmentAttachmentsCount: z.number().int().min(0)");
    expect(routesSource).toContain("totalAttachmentsCount: z.number().int().min(0)");
    expect(routesSource).toContain('path: "/api/calendar/appointments"');
  });

  it("maps aggregated attachment counters in the calendar aggregation service", () => {
    expect(appointmentsServiceSource).toContain("getCustomerAttachmentCountsByCustomerIds");
    expect(appointmentsServiceSource).toContain("getProjectAttachmentCountsByProjectIds");
    expect(appointmentsServiceSource).toContain("getAppointmentAttachmentCountsByAppointmentIds");
    expect(appointmentsServiceSource).toContain("const customerAttachmentsCount = customerAttachmentCounts.get(row.customer.id) ?? 0");
    expect(appointmentsServiceSource).toContain("const projectAttachmentsCount = projectId ? (projectAttachmentCounts.get(projectId) ?? 0) : 0");
    expect(appointmentsServiceSource).toContain("const appointmentAttachmentsCount = appointmentAttachmentCounts.get(row.appointment.id) ?? 0");
    expect(appointmentsServiceSource).toContain("customerAttachmentsCount,");
    expect(appointmentsServiceSource).toContain("projectAttachmentsCount,");
    expect(appointmentsServiceSource).toContain("appointmentAttachmentsCount,");
    expect(appointmentsServiceSource).toContain("totalAttachmentsCount: customerAttachmentsCount + projectAttachmentsCount + appointmentAttachmentsCount");
    expect(appointmentsServiceSource).toContain("export async function listCalendarAppointments");
  });

  it("normalizes aggregated attachment counters in the calendar appointments hook", () => {
    expect(calendarAppointmentsSource).toContain("customerAttachmentsCount: number;");
    expect(calendarAppointmentsSource).toContain("projectAttachmentsCount: number;");
    expect(calendarAppointmentsSource).toContain("appointmentAttachmentsCount: number;");
    expect(calendarAppointmentsSource).toContain("totalAttachmentsCount: number;");
    expect(calendarAppointmentsSource).toContain("const customerAttachmentsCount = Number.isFinite(rawAppointment.customerAttachmentsCount)");
    expect(calendarAppointmentsSource).toContain("const projectAttachmentsCount = Number.isFinite(rawAppointment.projectAttachmentsCount)");
    expect(calendarAppointmentsSource).toContain("const appointmentAttachmentsCount = Number.isFinite(rawAppointment.appointmentAttachmentsCount)");
    expect(calendarAppointmentsSource).toContain("const totalAttachmentsCount = Number.isFinite(rawAppointment.totalAttachmentsCount)");
    expect(calendarAppointmentsSource).toContain("customerAttachmentsCount,");
    expect(calendarAppointmentsSource).toContain("projectAttachmentsCount,");
    expect(calendarAppointmentsSource).toContain("appointmentAttachmentsCount,");
    expect(calendarAppointmentsSource).toContain("totalAttachmentsCount,");
  });
});
