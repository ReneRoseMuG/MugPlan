import { eq } from "drizzle-orm";
import type { InsertCustomer } from "@shared/schema";
import { appointmentTags, componentCategories, components, productCategories, products, projectTags, projects, tags } from "@shared/schema";
import { db } from "../../server/db";
import * as appointmentsService from "../../server/services/appointmentsService";
import * as employeeAbsencesService from "../../server/services/employeeAbsencesService";
import * as appointmentsRepository from "../../server/repositories/appointmentsRepository";
import * as customersService from "../../server/services/customersService";
import * as employeesService from "../../server/services/employeesService";
import * as projectsService from "../../server/services/projectsService";
import * as teamsService from "../../server/services/teamsService";
import * as tourEmployeesService from "../../server/services/tourEmployeesService";
import * as toursService from "../../server/services/toursService";
import { getBerlinTodayDateString } from "../../client/src/lib/project-appointments";

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

export async function createCustomerFixtureWithOverrides(params?: {
  prefix?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  company?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  const payload = buildCustomerPayload(params?.prefix ?? "CUST");
  return customersService.createCustomer({
    ...payload,
    firstName: params?.firstName ?? payload.firstName,
    lastName: params?.lastName ?? payload.lastName,
    fullName: params?.fullName ?? payload.fullName,
    company: params?.company ?? payload.company,
    postalCode: params?.postalCode ?? payload.postalCode,
    city: params?.city ?? payload.city,
  });
}

export async function createTagFixture(prefix = "TAG") {
  const token = nextToken(prefix);
  const result = await db.insert(tags).values({
    name: token,
    color: "#2563eb",
    isDefault: false,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
  return { id: insertedId, name: token };
}

export async function createExactTagFixture(name: string, color = "#2563eb") {
  const result = await db.insert(tags).values({
    name,
    color,
    isDefault: false,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
  return { id: insertedId, name };
}

export async function ensureComponentCategoryFixture(name: string) {
  const [existing] = await db
    .select({
      id: componentCategories.id,
      name: componentCategories.name,
      version: componentCategories.version,
      isActive: componentCategories.isActive,
    })
    .from(componentCategories)
    .where(eq(componentCategories.name, name))
    .limit(1);

  if (existing) return existing;

  const result = await db.insert(componentCategories).values({
    name,
    isActive: true,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);

  const [created] = await db
    .select({
      id: componentCategories.id,
      name: componentCategories.name,
      version: componentCategories.version,
      isActive: componentCategories.isActive,
    })
    .from(componentCategories)
    .where(eq(componentCategories.id, insertedId))
    .limit(1);

  if (!created) {
    throw new Error(`Component category fixture ${name} could not be created.`);
  }

  return created;
}

export async function ensureProductCategoryFixture(name: string) {
  const [existing] = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      version: productCategories.version,
      isActive: productCategories.isActive,
    })
    .from(productCategories)
    .where(eq(productCategories.name, name))
    .limit(1);

  if (existing) return existing;

  const result = await db.insert(productCategories).values({
    name,
    isActive: true,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);

  const [created] = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      version: productCategories.version,
      isActive: productCategories.isActive,
    })
    .from(productCategories)
    .where(eq(productCategories.id, insertedId))
    .limit(1);

  if (!created) {
    throw new Error(`Product category fixture ${name} could not be created.`);
  }

  return created;
}

export async function createProductFixture(params: {
  categoryName: string;
  name: string;
  description?: string | null;
}) {
  const category = await ensureProductCategoryFixture(params.categoryName);
  const result = await db.insert(products).values({
    name: params.name,
    categoryId: category.id,
    description: params.description ?? null,
    isActive: true,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);

  const [created] = await db
    .select()
    .from(products)
    .where(eq(products.id, insertedId))
    .limit(1);

  if (!created) {
    throw new Error(`Product fixture ${params.name} could not be created.`);
  }

  return created;
}

export async function createComponentFixture(params: {
  categoryName: string;
  name: string;
  description?: string | null;
}) {
  const category = await ensureComponentCategoryFixture(params.categoryName);
  const result = await db.insert(components).values({
    name: params.name,
    categoryId: category.id,
    description: params.description ?? null,
    isActive: true,
    version: 1,
  });
  const insertedId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);

  const [created] = await db
    .select()
    .from(components)
    .where(eq(components.id, insertedId))
    .limit(1);

  if (!created) {
    throw new Error(`Component fixture ${params.name} could not be created.`);
  }

  return created;
}

export async function attachProjectTagFixture(projectId: number, tagId: number) {
  await db.insert(projectTags).values({
    projectId,
    tagId,
    version: 1,
  });
}

export async function attachAppointmentTagFixture(appointmentId: number, tagId: number) {
  await db.insert(appointmentTags).values({
    appointmentId,
    tagId,
    version: 1,
  });
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
    type: 1,
    orderNumber: `ORD-${token}`,
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

export async function createEmployeeAbsenceFixture(params: {
  employeeId: number;
  type?: "vacation" | "sick";
  from?: string;
  until?: string;
  roleKey?: "ADMIN" | "DISPONENT";
}) {
  return employeeAbsencesService.createEmployeeAbsence(
    params.employeeId,
    {
      type: params.type ?? "vacation",
      from: params.from ?? getRelativeBerlinDate(1),
      until: params.until ?? getRelativeBerlinDate(2),
    },
    params.roleKey ?? "ADMIN",
  );
}

export async function createTeamFixture(color = "#0088cc") {
  return teamsService.createTeam({ color });
}

export async function createTourFixture(color = "#0088cc") {
  return toursService.createTour({ color });
}

export async function assignEmployeesToTourFixture(
  tourId: number,
  employees: Array<{ id: number; version: number }>,
) {
  const items = employees.map((employee) => ({ employeeId: employee.id, version: employee.version }));
  return tourEmployeesService.assignEmployeesToTour(tourId, items);
}

export async function createAppointmentFixture(params: {
  projectId?: number | null;
  customerId?: number;
  startDate?: string;
  endDate?: string | null;
  startTime?: string | null;
  employeeIds?: number[];
  tourId?: number | null;
}) {
  return appointmentsService.createAppointment({
    projectId: params.projectId,
    customerId: params.customerId,
    startDate: params.startDate ?? "2099-01-01",
    endDate: params.endDate ?? null,
    startTime: params.startTime ?? null,
    employeeIds: params.employeeIds ?? [],
    tourId: params.tourId ?? null,
  });
}

export async function createProjectOrderItemFixture(params: {
  projectId: number;
  orderNumber: string;
  productId?: number | null;
  componentId?: number | null;
  quantity?: number;
}) {
  return projectsService.createProjectOrderItem(params.projectId, {
    projectId: params.projectId,
    orderNumber: params.orderNumber,
    productId: params.productId ?? null,
    componentId: params.componentId ?? null,
    specificationId: null,
    quantity: params.quantity ?? 1,
  });
}

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return berlinFormatter.format(date);
}

export function getRelativeBerlinDate(daysFromToday: number): string {
  return addDaysToDateOnly(getBerlinTodayDateString(), daysFromToday);
}

export async function createProjectWithPastAndFutureAppointmentsFixture(params?: {
  prefix?: string;
  customerId?: number;
  projectName?: string;
  pastOffsetDays?: number;
  futureOffsetDays?: number;
}) {
  const project = await createProjectFixture({
    prefix: params?.prefix ?? "PROJ-APPT",
    customerId: params?.customerId,
    name: params?.projectName,
  });

  const pastDate = getRelativeBerlinDate(params?.pastOffsetDays ?? -1);
  const futureDate = getRelativeBerlinDate(params?.futureOffsetDays ?? 1);

  const pastAppointment = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: project.customerId,
      tourId: null,
      title: `${project.name} past`,
      description: null,
      startDate: new Date(`${pastDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );

  const futureAppointment = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: project.customerId,
      tourId: null,
      title: `${project.name} future`,
      description: null,
      startDate: new Date(`${futureDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );

  return {
    project,
    pastDate,
    futureDate,
    pastAppointmentId: Number(pastAppointment.id),
    futureAppointmentId: Number(futureAppointment.id),
  };
}

export async function createRawAppointmentFixture(params: {
  projectId: number;
  startDate: string;
  title: string;
  tourId?: number | null;
  employeeIds?: number[];
}) {
  const [project] = await db
    .select({
      customerId: projects.customerId,
    })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) {
    throw new Error(`Project ${params.projectId} not found for raw appointment fixture.`);
  }

  const created = await appointmentsRepository.createAppointment(
    {
      projectId: params.projectId,
      customerId: project.customerId,
      tourId: params.tourId ?? null,
      title: params.title,
      description: null,
      startDate: new Date(`${params.startDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    params.employeeIds ?? [],
  );
  return Number(created.id);
}

export async function createCustomerProjectsTimelineFixture(params?: {
  prefix?: string;
  includeProjectWithoutAppointments?: boolean;
}) {
  const prefix = params?.prefix ?? "CUST-TIMELINE";
  const customer = await createCustomerFixture(`${prefix}-CUST`);

  const projectFutureNewest = await createProjectFixture({
    prefix: `${prefix}-PROJ-A`,
    customerId: customer.id,
    name: `${prefix} Future Newest`,
  });
  const projectFutureOlder = await createProjectFixture({
    prefix: `${prefix}-PROJ-B`,
    customerId: customer.id,
    name: `${prefix} Future Older`,
  });
  const projectPast = await createProjectFixture({
    prefix: `${prefix}-PROJ-C`,
    customerId: customer.id,
    name: `${prefix} Past`,
  });

  const newestFutureDate = getRelativeBerlinDate(3);
  const olderFutureDate = getRelativeBerlinDate(1);
  const pastDate = getRelativeBerlinDate(-2);

  const futureNewestAppointmentId = await createRawAppointmentFixture({
    projectId: projectFutureNewest.id,
    startDate: newestFutureDate,
    title: `${projectFutureNewest.name} appt`,
  });
  const futureOlderAppointmentId = await createRawAppointmentFixture({
    projectId: projectFutureOlder.id,
    startDate: olderFutureDate,
    title: `${projectFutureOlder.name} appt`,
  });
  const pastAppointmentId = await createRawAppointmentFixture({
    projectId: projectPast.id,
    startDate: pastDate,
    title: `${projectPast.name} appt`,
  });

  const projectWithoutAppointments = params?.includeProjectWithoutAppointments === false
    ? null
    : await createProjectFixture({
        prefix: `${prefix}-PROJ-D`,
        customerId: customer.id,
        name: `${prefix} No Appointments`,
      });

  return {
    customer,
    projects: {
      futureNewest: projectFutureNewest,
      futureOlder: projectFutureOlder,
      past: projectPast,
      withoutAppointments: projectWithoutAppointments,
    },
    appointments: {
      futureNewest: {
        id: futureNewestAppointmentId,
        startDate: newestFutureDate,
      },
      futureOlder: {
        id: futureOlderAppointmentId,
        startDate: olderFutureDate,
      },
      past: {
        id: pastAppointmentId,
        startDate: pastDate,
      },
    },
    expectedProjectOrderByAppointmentDateDesc: [
      projectFutureNewest.id,
      projectFutureOlder.id,
      projectPast.id,
      ...(projectWithoutAppointments ? [projectWithoutAppointments.id] : []),
    ],
  };
}
