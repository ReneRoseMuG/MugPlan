/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Remove-Endpunkt fuer appointment_employee erwartet eine frische Appointment-Version.
 * - Erfolgreiches Entfernen bump't die Appointment-Version und entfernt genau die gewuenschte Relation.
 *
 * Fehlerfaelle:
 * - Veraltete Appointment-Version liefert keinen VERSION_CONFLICT.
 *
 * Ziel:
 * Den versionierten Remove-Pfad fuer Termin-Mitarbeiter end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("FT01 integration: appointment employee removal versioning", () => {
  it("removes an employee and bumps the appointment version when the version matches", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT01-APMT-REMOVE" });
    const employeeA = await createEmployeeFixture("FT01-APMT-REMOVE-A");
    const employeeB = await createEmployeeFixture("FT01-APMT-REMOVE-B");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employeeA.id, employeeB.id],
    });

    await admin
      .delete(`/api/appointments/${appointment.id}/employees/${employeeA.id}`)
      .send({ version: appointment.version })
      .expect(204);

    await admin.get(`/api/appointments/${appointment.id}`).expect(200).expect(({ body }) => {
      expect(body.version).toBe(appointment.version + 1);
      expect((body.employees as Array<{ id: number }>).map((entry) => entry.id)).not.toContain(employeeA.id);
      expect((body.employees as Array<{ id: number }>).map((entry) => entry.id)).toContain(employeeB.id);
    });
  });

  it("returns VERSION_CONFLICT when removing with a stale appointment version", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT01-APMT-STALE" });
    const employeeA = await createEmployeeFixture("FT01-APMT-STALE-A");
    const employeeB = await createEmployeeFixture("FT01-APMT-STALE-B");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      employeeIds: [employeeA.id, employeeB.id],
    });

    await admin
      .delete(`/api/appointments/${appointment.id}/employees/${employeeA.id}`)
      .send({ version: appointment.version + 99 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });

    await admin.get(`/api/appointments/${appointment.id}`).expect(200).expect(({ body }) => {
      expect(body.version).toBe(appointment.version);
      expect((body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual(
        expect.arrayContaining([employeeA.id, employeeB.id]),
      );
    });
  });
});
