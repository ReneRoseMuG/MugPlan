/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Endpoint liefert aggregierte Umsatzwochen mit qualifizierten Detailterminen.
 * - Reklamations-Projekte, stornierte Termine und globale Auftrags-Dubletten werden serverseitig ausgeschlossen.
 * - Nicht-Admin bleibt bei inaktiven Mitarbeitenden ausgesperrt, Leserolle darf aktive Daten lesen.
 *
 * Fehlerfälle:
 * - Umsatzsummen oder Wochenzuordnungen sind fachlich falsch.
 * - Reklamationen, Stornos oder Dubletten tauchen im Payload wieder auf.
 * - Inaktive Mitarbeitende werden für Nicht-Admin lesbar.
 *
 * Ziel:
 * Den neuen Mitarbeiter-Read-Endpoint samt Rollen- und Aggregationsverhalten Ende-zu-Ende absichern.
 */
import type { Express } from "express";
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { MANAGED_COMPLAINT_TAG_NAME, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME } from "@shared/appointmentCancellation";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import * as employeesService from "../../../server/services/employeesService";
import {
  attachProjectTagFixture,
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createEmployeeFixture,
  createExactTagFixture,
  createProjectFixtureWithOverrides,
} from "../../helpers/testDataFactory";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";

let app: Express;
let readerCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createReaderAgent(): Promise<SuperAgentTest> {
  const token = `employee-revenue-reader-${readerCounter}`;
  readerCounter += 1;
  const password = `${token}-password`;
  await createUser({
    username: token,
    email: `${token}@local.test`,
    firstName: "Reader",
    lastName: "Revenue",
    passwordHash: await hashPassword(password),
    roleCode: "READER",
  });

  return loginAgent(app, {
    username: token,
    password,
  });
}

describe("employee revenue overview endpoint", () => {
  it("returns sorted weeks, excludes complaints and cancellations, and deduplicates order numbers globally", async () => {
    const admin = await loginAdminAgent(app);
    const complaintTag = await createExactTagFixture(MANAGED_COMPLAINT_TAG_NAME, "#ff011b");
    const cancellationTag = await createExactTagFixture(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#3b2025");
    const employee = await createEmployeeFixture("EMP-REV-INT");

    const duplicatePrimaryProject = await createProjectFixtureWithOverrides({
      prefix: "REV-PRIMARY",
      orderNumber: "REV-ORDER-100",
      name: "Nord Projekt",
      projectOrder: { amount: "100.00" },
    });
    const followUpProject = await createProjectFixtureWithOverrides({
      prefix: "REV-FOLLOW",
      orderNumber: "REV-ORDER-200",
      name: "Süd Projekt",
      projectOrder: { amount: "250.50" },
    });
    const complaintProject = await createProjectFixtureWithOverrides({
      prefix: "REV-COMPLAINT",
      orderNumber: "REV-ORDER-999",
      name: "Reklamationsprojekt",
      projectOrder: { amount: "999.99" },
    });

    await attachProjectTagFixture(complaintProject.id, complaintTag.id);

    const cancelledDuplicateAppointment = await createAppointmentFixture({
      projectId: duplicatePrimaryProject.id,
      customerId: duplicatePrimaryProject.customerId,
      employeeIds: [employee.id],
      startDate: "2026-12-24",
      startTime: "08:00",
    });
    await attachAppointmentTagFixture(cancelledDuplicateAppointment.id, cancellationTag.id);

    await createAppointmentFixture({
      projectId: duplicatePrimaryProject.id,
      customerId: duplicatePrimaryProject.customerId,
      employeeIds: [employee.id],
      startDate: "2026-12-31",
      startTime: "08:00",
    });
    await createAppointmentFixture({
      projectId: duplicatePrimaryProject.id,
      customerId: duplicatePrimaryProject.customerId,
      employeeIds: [employee.id],
      startDate: "2027-01-02",
      startTime: "09:00",
    });
    await createAppointmentFixture({
      projectId: followUpProject.id,
      customerId: followUpProject.customerId,
      employeeIds: [employee.id],
      startDate: "2027-01-04",
      startTime: "10:00",
    });
    await createAppointmentFixture({
      projectId: complaintProject.id,
      customerId: complaintProject.customerId,
      employeeIds: [employee.id],
      startDate: "2027-01-05",
      startTime: "11:00",
    });
    await createAppointmentFixture({
      projectId: null,
      customerId: followUpProject.customerId,
      employeeIds: [employee.id],
      startDate: "2027-01-06",
      startTime: "12:00",
    });

    await admin
      .get(`/api/employees/${employee.id}/revenue-overview`)
      .expect(200)
      .expect((res) => {
        expect(res.body.employeeId).toBe(employee.id);
        expect(res.body.employeeFullName).toBe(employee.fullName);
        expect(res.body.weeks).toEqual([
          {
            isoYear: 2026,
            isoWeek: 53,
            weekStartDate: "2026-12-28",
            weekEndDate: "2027-01-03",
            weekLabel: "KW 53 / 2026",
            orderCount: 1,
            revenueAmount: "100.00",
            appointments: [
              {
                appointmentId: expect.any(Number),
                startDate: "2026-12-31",
                projectName: "Nord Projekt",
                orderNumber: "REV-ORDER-100",
                amount: "100.00",
              },
            ],
          },
          {
            isoYear: 2027,
            isoWeek: 1,
            weekStartDate: "2027-01-04",
            weekEndDate: "2027-01-10",
            weekLabel: "KW 01 / 2027",
            orderCount: 1,
            revenueAmount: "250.50",
            appointments: [
              {
                appointmentId: expect.any(Number),
                startDate: "2027-01-04",
                projectName: "Süd Projekt",
                orderNumber: "REV-ORDER-200",
                amount: "250.50",
              },
            ],
          },
        ]);
      });
  });

  it("allows readers to read active employees and keeps inactive employees hidden for non-admin", async () => {
    const reader = await createReaderAgent();
    const employee = await createEmployeeFixture("EMP-REV-ROLE");

    await reader.get(`/api/employees/${employee.id}/revenue-overview`).expect(200);

    const inactiveEmployee = await createEmployeeFixture("EMP-REV-INACTIVE");
    const updatedInactiveEmployee = await employeesService.updateEmployee(
      inactiveEmployee.id,
      { isActive: false, version: inactiveEmployee.version },
      "ADMIN",
    );
    if (!updatedInactiveEmployee) {
      throw new Error("Expected inactive employee to be updated");
    }

    await reader.get(`/api/employees/${inactiveEmployee.id}/revenue-overview`).expect(404);
  });
});
