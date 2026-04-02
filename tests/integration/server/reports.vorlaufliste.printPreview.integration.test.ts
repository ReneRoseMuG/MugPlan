/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Vorlaufliste-Druckpfad liefert den vollständigen Datensatz ohne Listen-Paginierung.
 * - Druckpfad und Listenpfad liefern für denselben Filter identische Artikel- und Statusdaten.
 * - Nur ADMIN und DISPONENT dürfen den Druckpfad lesen; LESER wird abgewiesen.
 *
 * Fehlerfälle:
 * - Der Druckpfad übernimmt versehentlich das 100er-Paging der Listenansicht.
 * - Storno-, Sondermaß- oder Artikelwerte weichen zwischen Liste und Druck voneinander ab.
 * - Der neue Druckendpunkt öffnet den Zugriff für LESER.
 *
 * Ziel:
 * Den separaten Serververtrag der Vorlaufliste-Druckvorschau end-to-end absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
} from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";
import {
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags, type Tag } from "../../../shared/schema";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-print-${authCounter}`;
  authCounter += 1;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: `test-${token}`,
    email: `test-${token}@local.test`,
    firstName: "Test",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return loginAgent(app, {
    username: `test-${token}`,
    password,
  });
}

async function createReportProjectFixture(params: {
  prefix: string;
  appointmentDates: string[];
  articleValues?: Partial<{
    sauna: string;
    door: string;
  }>;
  projectTags?: Tag[];
  appointmentTagsByIndex?: Tag[][];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    firstName: "Fixture",
    lastName: `${params.prefix} Kunde`,
  });

  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });

  const updatedProject = await projectsService.updateProject(project.id, {
    version: project.version,
    projectOrder: {
      plannedDateText: null,
      plannedWeek: null,
    },
  });

  if (!updatedProject) {
    throw new Error("Expected updated project fixture.");
  }

  const orderNumber = updatedProject.projectOrder?.orderNumber ?? updatedProject.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected project order number for report fixture.");
  }

  const appointments: Array<{ id: number }> = [];
  for (const appointmentDate of params.appointmentDates) {
    appointments.push(await createAppointmentFixture({
      projectId: project.id,
      startDate: appointmentDate,
    }));
  }

  for (const tag of params.projectTags ?? []) {
    await attachProjectTagFixture(project.id, tag.id);
  }

  for (const [appointmentIndex, tagsForAppointment] of (params.appointmentTagsByIndex ?? []).entries()) {
    const appointment = appointments[appointmentIndex];
    if (!appointment) continue;
    for (const tag of tagsForAppointment ?? []) {
      await attachAppointmentTagFixture(appointment.id, tag.id);
    }
  }

  if (params.articleValues?.sauna) {
    const product = await createProductFixture({
      categoryName: "FT26 Print Produkte",
      name: params.articleValues.sauna,
      shortCode: "PR-S",
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
    });
  }

  if (params.articleValues?.door) {
    const component = await createComponentFixture({
      categoryName: "FT26 Print Türen",
      name: params.articleValues.door,
      shortCode: "PR-T",
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
    });
  }

  return { project: updatedProject, appointments };
}

async function ensureReservedCancellationTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

async function ensureManagedSpecialMeasureTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
}

describe("FT26 integration: report vorlaufliste print preview", () => {
  it("returns the full 105-row report without list pagination", async () => {
    const admin = await loginAdminAgent(app);

    for (let index = 0; index < 105; index += 1) {
      await createReportProjectFixture({
        prefix: `FT26-PRINT-${String(index).padStart(3, "0")}`,
        appointmentDates: ["2099-12-01"],
      });
    }

    const listResponse = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-12-01&page=2&pageSize=100")
      .expect(200);
    const printResponse = await admin
      .get("/api/reports/vorlaufliste/print-preview?fromDate=2099-12-01")
      .expect(200);

    expect(listResponse.body.items).toHaveLength(5);
    expect(printResponse.body.items).toHaveLength(105);
    expect(printResponse.body).not.toHaveProperty("page");
    expect(printResponse.body).not.toHaveProperty("pageSize");
    expect(printResponse.body).not.toHaveProperty("totalPages");
  });

  it("matches article values, reportState and highlightTag with the list endpoint", async () => {
    const admin = await loginAdminAgent(app);
    const cancellationTag = await ensureReservedCancellationTag();
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();

    const mixedProject = await createReportProjectFixture({
      prefix: "FT26-PRINT-COMPARE",
      appointmentDates: ["2100-01-10", "2100-01-12"],
      articleValues: {
        sauna: "Print Sauna",
        door: "Print Tür",
      },
      projectTags: [specialMeasureTag],
      appointmentTagsByIndex: [[], [cancellationTag]],
    });

    type ReportItem = {
      projectId: number;
      reportState: string;
      highlightTag: { name: string } | null;
      articleValues: Array<{ categoryId: number; value: string | null }>;
    };

    const listResponse = await admin
      .get("/api/reports/vorlaufliste?fromDate=2100-01-01&toDate=2100-01-31&page=1&pageSize=100&useShortCodes=true")
      .expect(200);
    const printResponse = await admin
      .get("/api/reports/vorlaufliste/print-preview?fromDate=2100-01-01&toDate=2100-01-31&useShortCodes=true")
      .expect(200);

    const listRow = (listResponse.body.items as ReportItem[]).find((item) => item.projectId === mixedProject.project.id);
    const printRow = (printResponse.body.items as ReportItem[]).find((item) => item.projectId === mixedProject.project.id);

    expect(listRow).toBeDefined();
    expect(printRow).toBeDefined();
    expect(printRow).toMatchObject({
      projectId: mixedProject.project.id,
      reportState: "contains_cancelled",
      highlightTag: { name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME },
    });
    expect(printRow).toEqual(listRow);
    expect(printResponse.body.productCategories).toEqual(listResponse.body.productCategories);
    expect(printResponse.body.componentCategories).toEqual(listResponse.body.componentCategories);
  });

  it("allows dispatcher access and rejects readers", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    await createReportProjectFixture({
      prefix: "FT26-PRINT-ROLE",
      appointmentDates: ["2100-02-02"],
    });

    await dispatcher
      .get("/api/reports/vorlaufliste/print-preview?fromDate=2100-02-01")
      .expect(200);

    await reader
      .get("/api/reports/vorlaufliste/print-preview?fromDate=2100-02-01")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });
});
