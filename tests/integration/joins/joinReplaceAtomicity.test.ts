import { beforeEach, describe, expect, it } from "vitest";

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as employeesService from "../../../server/services/employeesService";
import * as projectsService from "../../../server/services/projectsService";
import { resetDatabase } from "../../helpers/resetDatabase";

describe("PKG-07 Integration: join replace atomicity", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("keeps join relations unchanged when replacement contains invalid employee id", async () => {
    const customer = await customersService.createCustomer({
      customerNumber: "C-JOIN-001",
      firstName: "Join",
      lastName: "Atomic",
      company: null,
      email: null,
      phone: "12345",
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
    });

    const project = await projectsService.createProject({
      name: "Join Atomicity Project",
      customerId: customer.id,
      descriptionMd: null,
    });

    const employeeA = await employeesService.createEmployee({
      firstName: "Alice",
      lastName: "A",
      phone: null,
      email: null,
    });
    const employeeB = await employeesService.createEmployee({
      firstName: "Bob",
      lastName: "B",
      phone: null,
      email: null,
    });

    const created = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-04-01",
      employeeIds: [employeeA.id, employeeB.id],
    });

    const appointmentId = Number((created as any)?.id);
    const beforeDetails = await appointmentsService.getAppointmentDetails(appointmentId);
    const beforeEmployeeIds = (beforeDetails?.employees ?? []).map((e) => e.id).sort((a, b) => a - b);
    expect(beforeEmployeeIds).toEqual([employeeA.id, employeeB.id].sort((a, b) => a - b));

    const beforeRow = await appointmentsRepository.getAppointment(appointmentId);
    const beforeVersion = beforeRow?.version;
    expect(beforeVersion).toBeTypeOf("number");

    await expect(
      appointmentsService.updateAppointment(
        appointmentId,
        {
          version: Number(beforeVersion),
          projectId: project.id,
          startDate: "2099-04-01",
          employeeIds: [employeeA.id, 999_999_999], // invalid FK to force relation-replace failure
        },
        "ADMIN",
      ),
    ).rejects.toThrow();

    const afterDetails = await appointmentsService.getAppointmentDetails(appointmentId);
    const afterEmployeeIds = (afterDetails?.employees ?? []).map((e) => e.id).sort((a, b) => a - b);
    expect(afterEmployeeIds).toEqual(beforeEmployeeIds);

    const afterRow = await appointmentsRepository.getAppointment(appointmentId);
    expect(afterRow?.version).toBe(beforeVersion);
  });
});
