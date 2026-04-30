/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Abwesenheiten werden als normale Termine mit Systemtour, Systemkunde und Systemtag angelegt.
 * - Abwesenheiten blockieren Mitarbeiter ganztägig gegen reguläre Terminzuweisungen.
 * - Reguläre Terminzuweisungen blockieren nachträgliche Abwesenheiten im selben Zeitraum.
 * - Leser dürfen Abwesenheiten sehen, aber nicht anlegen.
 */
import { describe, expect, it } from "vitest";

import {
  ABSENCE_CUSTOMER_NAME,
  ABSENCE_CUSTOMER_NUMBER,
  ABSENCE_TOUR_NAME,
} from "../../../shared/absenceAppointments";
import * as appointmentsService from "../../../server/services/appointmentsService";
import {
  EmployeeAppointmentAbsencesError,
  createEmployeeAppointmentAbsence,
  listEmployeeAppointmentAbsences,
} from "../../../server/services/employeeAppointmentAbsencesService";
import {
  createCustomerFixture,
  createEmployeeFixture,
} from "../../helpers/testDataFactory";

describe("FT33 integration: Employee absence appointments", () => {
  it("creates a vacation absence as appointment with system tour, system customer, tag and note", async () => {
    const employee = await createEmployeeFixture("ABS-CREATE-EMP");
    const noteToken = `ABS-NOTE-${employee.id}`;

    const created = await createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "vacation",
      startDate: "2099-05-10",
      endDate: "2099-05-12",
      note: noteToken,
    }, "DISPONENT");

    expect(created.id).toBeGreaterThan(0);
    expect(created.startDate).toBe("2099-05-10");
    expect(created.endDate).toBe("2099-05-12");
    expect(created.startTime).toBeNull();
    expect(created.description).toBe(noteToken);
    expect(created.tourName).toBe(ABSENCE_TOUR_NAME);
    expect(created.customer.customerNumber).toBe(ABSENCE_CUSTOMER_NUMBER);
    expect(created.customer.fullName).toBe(ABSENCE_CUSTOMER_NAME);
    expect(created.employees.map((entry) => entry.id)).toEqual([employee.id]);
    expect(created.appointmentTags.map((tag) => tag.name)).toContain("Urlaub");

    const readerList = await listEmployeeAppointmentAbsences(employee.id, "LESER");
    expect(readerList.map((item) => item.id)).toContain(created.id);
  });

  it("rejects a regular timed appointment when the employee has an all-day absence", async () => {
    const employee = await createEmployeeFixture("ABS-BLOCK-EMP");
    await createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "sick",
      startDate: "2099-06-03",
      endDate: null,
      note: `ABS-BLOCK-${employee.id}`,
    }, "ADMIN");
    const customer = await createCustomerFixture("ABS-BLOCK-CUST");

    await expect(appointmentsService.createAppointment({
      customerId: customer.id,
      startDate: "2099-06-03",
      startTime: "09:00:00",
      employeeIds: [employee.id],
    }, "ADMIN")).rejects.toMatchObject({
      code: "EMPLOYEE_OVERLAP_CONFLICT",
      conflictEmployees: [{ id: employee.id, fullName: employee.fullName }],
    });
  });

  it("rejects an all-day absence when the employee already has a timed appointment", async () => {
    const employee = await createEmployeeFixture("ABS-REVERSE-EMP");
    const customer = await createCustomerFixture("ABS-REVERSE-CUST");
    const regular = await appointmentsService.createAppointment({
      customerId: customer.id,
      startDate: "2099-07-04",
      startTime: "10:00:00",
      employeeIds: [employee.id],
    }, "ADMIN");

    expect(regular?.id).toBeGreaterThan(0);
    await expect(createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "absent",
      startDate: "2099-07-04",
      endDate: null,
      note: `ABS-REVERSE-${employee.id}`,
    }, "ADMIN")).rejects.toMatchObject({
      code: "EMPLOYEE_OVERLAP_CONFLICT",
      conflictEmployees: [{ id: employee.id, fullName: employee.fullName }],
    });
  });

  it("keeps mutation permission server-side for dispatcher/admin only", async () => {
    const employee = await createEmployeeFixture("ABS-ROLE-EMP");

    await expect(createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "vacation",
      startDate: "2099-08-01",
      endDate: null,
      note: `ABS-ROLE-${employee.id}`,
    }, "LESER")).rejects.toBeInstanceOf(EmployeeAppointmentAbsencesError);
  });
});
