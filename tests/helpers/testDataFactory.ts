import type { InsertCustomer } from "@shared/schema";
import * as appointmentsService from "../../server/services/appointmentsService";
import * as customersService from "../../server/services/customersService";
import * as employeesService from "../../server/services/employeesService";
import * as projectsService from "../../server/services/projectsService";

let sequence = 1;

function nextToken(prefix: string): string {
  const current = sequence;
  sequence += 1;
  return `${prefix}-${String(current).padStart(4, "0")}`;
}

export function resetTestDataFactoryState() {
  sequence = 1;
}

export function buildCustomerPayload(prefix = "CUST"): InsertCustomer {
  const token = nextToken(prefix);
  return {
    customerNumber: token,
    firstName: "Fixture",
    lastName: token,
    fullName: `Fixture ${token}`,
    company: null,
    email: null,
    phone: "0123456789",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
  };
}

export async function createCustomerFixture(prefix = "CUST") {
  return customersService.createCustomer(buildCustomerPayload(prefix));
}

export async function createProjectFixture(params?: {
  prefix?: string;
  customerId?: number;
  name?: string;
}) {
  const customerId = params?.customerId ?? (await createCustomerFixture(`${params?.prefix ?? "PROJ"}-CUST`)).id;
  const token = nextToken(params?.prefix ?? "PROJ");
  return projectsService.createProject({
    customerId,
    name: params?.name ?? token,
    descriptionMd: null,
  });
}

export async function createEmployeeFixture(prefix = "EMP") {
  const token = nextToken(prefix);
  return employeesService.createEmployee({
    firstName: "Fixture",
    lastName: token,
    phone: null,
    email: null,
  });
}

export async function createAppointmentFixture(params: {
  projectId: number;
  startDate?: string;
  employeeIds?: number[];
  tourId?: number | null;
}) {
  return appointmentsService.createAppointment({
    projectId: params.projectId,
    startDate: params.startDate ?? "2099-01-01",
    employeeIds: params.employeeIds ?? [],
    tourId: params.tourId ?? null,
  });
}
