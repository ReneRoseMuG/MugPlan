/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC appointment_employee Duplikatschutz
 *
 * Abgedeckte Regeln:
 * - Composite Primary Key auf appointment_employee verhindert doppelte Paare.
 * - Dasselbe (appointment_id, employee_id) darf nur einmal existieren.
 *
 * Fehlerfaelle:
 * - Doppelte Insert-Operation auf identischem Paar.
 *
 * Ziel:
 * Expliziten Integritaetsnachweis fuer den Composite-PK der Join-Tabelle liefern.
 */
import { describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { appointmentEmployees } from "../../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";

describe("FT01 integration: appointment_employee composite PK", () => {
  it("rejects duplicate appointment/employee pair", async () => {
    resetTestDataFactoryState();
    const project = await createProjectFixture({ prefix: "AE-PK" });
    const employee = await createEmployeeFixture("AE-PK-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-01",
      employeeIds: [],
    });

    await db.insert(appointmentEmployees).values({
      appointmentId: appointment.id,
      employeeId: employee.id,
      version: 1,
    });

    let thrown: unknown = null;
    try {
      await db.insert(appointmentEmployees).values({
        appointmentId: appointment.id,
        employeeId: employee.id,
        version: 1,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeTruthy();
    const message = String(thrown).toLowerCase();
    expect(message.includes("duplicate") || message.includes("primary")).toBe(true);
  });
});
