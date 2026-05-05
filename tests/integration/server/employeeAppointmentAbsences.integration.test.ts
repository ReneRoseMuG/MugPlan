/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Abwesenheiten werden als normale Termine mit Systemtour, Systemkunde und Systemtag angelegt.
 * - Abwesenheiten blockieren Mitarbeiter ganztägig gegen reguläre Terminzuweisungen.
 * - Reguläre Terminzuweisungen erfordern vor der Abwesenheit eine bestätigte Mitarbeiterentfernung.
 * - Leser dürfen Abwesenheiten sehen, aber nicht anlegen.
 *
 * Ziel:
 * Die FT-33-Abwesenheitslogik gegen echte Service- und DB-Pfade absichern.
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  ABSENCE_CUSTOMER_ADDRESS_LINE1,
  ABSENCE_CUSTOMER_CITY,
  ABSENCE_CUSTOMER_COUNTRY,
  ABSENCE_CUSTOMER_NAME,
  ABSENCE_CUSTOMER_NUMBER,
  ABSENCE_CUSTOMER_POSTAL_CODE,
  ABSENCE_TOUR_NAME,
} from "../../../shared/absenceAppointments";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as appointmentNotesService from "../../../server/services/appointmentNotesService";
import { applySystemSeed } from "../../../server/services/systemSeedService";
import {
  EmployeeAppointmentAbsencesError,
  createEmployeeAppointmentAbsence,
  listEmployeeAppointmentAbsences,
} from "../../../server/services/employeeAppointmentAbsencesService";
import {
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixtureWithOverrides,
} from "../../helpers/testDataFactory";
import { listTours } from "../../../server/services/toursService";

describe("FT33 integration: Employee absence appointments", () => {
  beforeEach(async () => {
    await applySystemSeed();
  });

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
    expect(created.customer.company).toBe(ABSENCE_CUSTOMER_NAME);
    expect(created.customer.addressLine1).toBe(ABSENCE_CUSTOMER_ADDRESS_LINE1);
    expect(created.customer.postalCode).toBe(ABSENCE_CUSTOMER_POSTAL_CODE);
    expect(created.customer.city).toBe(ABSENCE_CUSTOMER_CITY);
    expect(created.customer.country).toBe(ABSENCE_CUSTOMER_COUNTRY);
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

  it("requires employee-removal confirmation when the employee already has a timed appointment", async () => {
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
      code: "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL",
      employeeRemovalConflicts: [
        expect.objectContaining({
          id: regular!.id,
          version: regular!.version,
        }),
      ],
    });
  });

  it("removes the employee from confirmed regular appointments before creating the absence", async () => {
    const employee = await createEmployeeFixture("ABS-PARK-EMP");
    const customer = await createCustomerFixture("ABS-PARK-CUST");
    const regular = await appointmentsService.createAppointment({
      customerId: customer.id,
      startDate: "2099-07-06",
      startTime: "10:00:00",
      employeeIds: [employee.id],
    }, "ADMIN");

    expect(regular?.id).toBeGreaterThan(0);
    const created = await createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "absent",
      startDate: "2099-07-06",
      endDate: null,
      note: `ABS-PARK-${employee.id}`,
      confirmedEmployeeRemovalAppointments: [
        { appointmentId: regular!.id, version: regular!.version },
      ],
    }, "ADMIN");

    expect(created.id).toBeGreaterThan(0);
    const updatedRegular = await appointmentsService.getAppointmentDetails(regular!.id);
    expect(updatedRegular?.employees).toEqual([]);
    expect(updatedRegular?.tourId).toBe(regular!.tourId);
    expect(updatedRegular?.appointmentTags.map((tag) => tag.name)).not.toContain("Geparkt");
    expect(updatedRegular?.version).toBe(regular!.version + 1);
  });

  it("rejects stale employee-removal confirmations before creating the absence", async () => {
    const employee = await createEmployeeFixture("ABS-PARK-STALE-EMP");
    const customer = await createCustomerFixture("ABS-PARK-STALE-CUST");
    const regular = await appointmentsService.createAppointment({
      customerId: customer.id,
      startDate: "2099-07-08",
      startTime: "10:00:00",
      employeeIds: [employee.id],
    }, "ADMIN");

    expect(regular?.id).toBeGreaterThan(0);
    await expect(createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "absent",
      startDate: "2099-07-08",
      endDate: null,
      note: `ABS-PARK-STALE-${employee.id}`,
      confirmedEmployeeRemovalAppointments: [
        { appointmentId: regular!.id, version: regular!.version + 1 },
      ],
    }, "ADMIN")).rejects.toMatchObject({
      code: "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL",
      employeeRemovalConflicts: [
        expect.objectContaining({
          id: regular!.id,
          version: regular!.version,
        }),
      ],
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

  it("keeps generic mutation services available for a regular project appointment on Tour 1", async () => {
    const [tourOne] = (await listTours()).filter((tour) => tour.name === "Tour 1");
    expect(tourOne?.id).toBeGreaterThan(0);

    const customer = await createCustomerFixture("REG-MUTATE-CUST");
    const project = await createProjectFixtureWithOverrides({
      prefix: "REG-MUTATE-PROJ",
      customerId: customer.id,
      name: "Regulärer Mutationspfad",
    });
    const employee = await createEmployeeFixture("REG-MUTATE-EMP");

    const editable = await appointmentsService.createAppointment({
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-10",
      startTime: "08:00:00",
    }, "ADMIN");
    const removableEmployee = await appointmentsService.createAppointment({
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-11",
      startTime: "08:30:00",
      employeeIds: [employee.id],
    }, "ADMIN");
    const cancellable = await appointmentsService.createAppointment({
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-12",
      startTime: "09:00:00",
      employeeIds: [employee.id],
    }, "ADMIN");
    const parkable = await appointmentsService.createAppointment({
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-13",
      startTime: "09:30:00",
      employeeIds: [employee.id],
    }, "ADMIN");
    const deletable = await appointmentsService.createAppointment({
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-14",
      startTime: "10:00:00",
    }, "ADMIN");

    expect(editable?.id).toBeGreaterThan(0);
    expect(removableEmployee?.id).toBeGreaterThan(0);
    expect(cancellable?.id).toBeGreaterThan(0);
    expect(parkable?.id).toBeGreaterThan(0);
    expect(deletable?.id).toBeGreaterThan(0);

    const updated = await appointmentsService.updateAppointment(editable!.id, {
      version: editable!.version,
      projectId: project.id,
      customerId: customer.id,
      tourId: tourOne!.id,
      startDate: "2099-10-15",
      endDate: null,
      startTime: "11:00:00",
      description: "Regulärer Update-Pfad",
      employeeIds: [],
    }, "ADMIN");
    const updatedStartDate = updated?.startDate instanceof Date
      ? updated.startDate.toISOString().slice(0, 10)
      : String(updated?.startDate).slice(0, 10);
    expect(updatedStartDate).toBe("2099-10-15");
    expect(updated?.description).toBe("Regulärer Update-Pfad");

    const createdNote = await appointmentNotesService.createAppointmentNote(editable!.id, {
      title: "Reguläre Terminnotiz",
      body: "<p>Mutationspfad aktiv.</p>",
      print: false,
    });
    expect(createdNote.id).toBeGreaterThan(0);

    await expect(
      appointmentsService.removeEmployeeFromAppointment(removableEmployee!.id, employee.id, removableEmployee!.version, "ADMIN"),
    ).resolves.toEqual({ found: true });
    const removableEmployeeAfter = await appointmentsService.getAppointmentDetails(removableEmployee!.id);
    expect(removableEmployeeAfter?.employees).toEqual([]);

    await expect(
      appointmentsService.cancelAppointment(cancellable!.id, cancellable!.version, "ADMIN"),
    ).resolves.toEqual({ found: true });
    const cancelledAfter = await appointmentsService.getAppointmentDetails(cancellable!.id);
    expect(cancelledAfter?.isCancelled).toBe(true);
    expect(cancelledAfter?.appointmentTags.map((tag) => tag.name)).toContain("Storniert");

    await expect(
      appointmentsService.parkAppointment(parkable!.id, parkable!.version, "ADMIN"),
    ).resolves.toEqual({ found: true });
    const parkedAfter = await appointmentsService.getAppointmentDetails(parkable!.id);
    expect(parkedAfter?.tourId).not.toBe(tourOne!.id);
    expect(parkedAfter?.appointmentTags.map((tag) => tag.name)).toContain("Geparkt");

    const deleted = await appointmentsService.deleteAppointment(deletable!.id, deletable!.version, "ADMIN");
    expect(deleted?.id).toBe(deletable!.id);
    await expect(appointmentsService.getAppointmentDetails(deletable!.id)).resolves.toBeNull();
  });

  it("blocks generic appointment and appointment-note mutations for absence appointments outside the FT-33 employee flow", async () => {
    const employee = await createEmployeeFixture("ABS-READONLY-EMP");
    const created = await createEmployeeAppointmentAbsence(employee.id, {
      absenceType: "vacation",
      startDate: "2099-09-10",
      endDate: "2099-09-12",
      note: `ABS-READONLY-${employee.id}`,
    }, "ADMIN");

    await expect(appointmentsService.updateAppointment(created.id, {
      version: created.version,
      customerId: created.customer.id,
      tourId: created.tourId,
      startDate: "2099-09-11",
      endDate: "2099-09-13",
      startTime: null,
      description: "Generischer Update-Versuch",
      employeeIds: [employee.id],
    }, "ADMIN")).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });

    await expect(appointmentsService.deleteAppointment(created.id, created.version, "ADMIN")).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });

    await expect(appointmentNotesService.createAppointmentNote(created.id, {
      title: `ABS-NOTE-${employee.id}`,
      body: "<p>Readonly</p>",
      print: false,
    })).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });

    await expect(
      appointmentsService.removeEmployeeFromAppointment(created.id, employee.id, created.version, "ADMIN"),
    ).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });

    await expect(
      appointmentsService.cancelAppointment(created.id, created.version, "ADMIN"),
    ).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });

    await expect(
      appointmentsService.parkAppointment(created.id, created.version, "ADMIN"),
    ).rejects.toMatchObject({
      code: "ABSENCE_APPOINTMENT_READONLY",
    });
  });
});
