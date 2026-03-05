/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT09/FT13 - Termin-Previews und Notizen
 * Use Case: UC Preview-Daten enthalten Notizzaehler fuer Kunde, Projekt und Termin
 *
 * Abgedeckte Regeln:
 * - Sidebar-/List-Appointment-Payloads liefern customerNotesCount, projectNotesCount und appointmentNotesCount.
 * - Contracts fuer appointments.list, projectAppointments und tourAppointments enthalten die Felder.
 *
 * Fehlerfaelle:
 * - Termin-Previews erhalten keine Notizzaehler aus den zugrunde liegenden Datenquellen.
 * - Contract und Service driften bei den Notizzaehler-Feldern auseinander.
 *
 * Ziel:
 * Sicherstellen, dass die Notizzaehler in den relevanten Preview-Datenquellen verdrahtet sind.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03/FT09/FT13 preview notes counters wiring", () => {
  const routesPath = path.resolve(process.cwd(), "shared/routes.ts");
  const routesSource = readFileSync(routesPath, "utf8");
  const appointmentsServicePath = path.resolve(process.cwd(), "server/services/appointmentsService.ts");
  const appointmentsServiceSource = readFileSync(appointmentsServicePath, "utf8");

  it("declares customer/project notes counters in appointment-related contracts", () => {
    expect(routesSource).toContain("const entityAppointmentItemSchema = z.object({");
    expect(routesSource).toContain("customerNotesCount: z.number().int().min(0)");
    expect(routesSource).toContain("projectNotesCount: z.number().int().min(0)");
    expect(routesSource).toContain("appointmentNotesCount: z.number().int().min(0)");
    expect(routesSource).toContain("path: '/api/appointments/list'");
    expect(routesSource).toContain("path: '/api/tours/:tourId/current-appointments'");
    expect(routesSource).toContain("path: '/api/projects/:projectId/appointments'");
  });

  it("maps customer/project/appointment notes counters in sidebar and list appointment services", () => {
    expect(appointmentsServiceSource).toContain("const mapSidebarAppointments = async");
    expect(appointmentsServiceSource).toContain("getCustomerNoteCountsByCustomerIds");
    expect(appointmentsServiceSource).toContain("getProjectNoteCountsByProjectIds");
    expect(appointmentsServiceSource).toContain("getAppointmentNoteCountsByAppointmentIds");
    expect(appointmentsServiceSource).toContain("customerNotesCount: customerNoteCounts.get(row.customer.id) ?? 0");
    expect(appointmentsServiceSource).toContain("projectNotesCount: projectNoteCounts.get(row.project.id) ?? 0");
    expect(appointmentsServiceSource).toContain("appointmentNotesCount: appointmentNoteCounts.get(row.appointment.id) ?? 0");
    expect(appointmentsServiceSource).toContain("export async function listAppointmentsList");
  });
});
