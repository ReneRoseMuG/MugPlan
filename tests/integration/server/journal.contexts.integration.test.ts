/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kunden-, Projekt- und Terminmutationen erscheinen ueber echte API-Mutationen in den erwarteten Parent-Detailjournalen.
 * - Projektgebundene Notiz-, Anhang- und Auftragspositionsmutationen landen auch im Kundenjournal.
 * - Termingebundene Notiz-, Anhang- und Mitarbeiterdelta-Mutationen landen auch im Projekt- und Kundenjournal.
 * - Journal-Haupteintrag und Kontextzeilen werden atomar gespeichert; ein Kontextfehler hinterlaesst keinen verwaisten Eintrag.
 *
 * Fehlerfaelle:
 * - Parent-Kontexte fehlen trotz erfolgreicher Fachmutation im Detailjournal.
 * - Generic Note-Update/Pin verliert den transitiven Projekt-/Kundenkontext.
 * - Ein fehlerhafter Kontext schreibt trotzdem einen nackten Journal-Eintrag.
 *
 * Ziel:
 * Die zentrale Journal-Kontextexpansion und atomare Speicherung end-to-end gegen echte Mutationspfade absichern.
 */
import { count, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";
import { db } from "../../../server/db";
import { insertJournalEntry } from "../../../server/repositories/journalRepository";
import { journalEntries } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { nextDeterministicToken } from "../../helpers/deterministic";
import { createProductFixture } from "../../helpers/testDataFactory";

type JournalApiItem = {
  tableName: string;
  triggerKey: string | null;
  messageText: string;
  contexts: Array<{
    contextTable: string;
    contextId: number | null;
    contextKey: string | null;
    relationRole: string | null;
  }>;
};

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createCustomer(agent: SuperAgentTest) {
  const token = nextDeterministicToken("journal-context-customer");
  const response = await agent
    .post("/api/customers")
    .send({
      customerNumber: `JRN-${token}`,
      firstName: "Journal",
      lastName: token,
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      country: null,
    })
    .expect(201);

  return response.body as {
    id: number;
    version: number;
    customerNumber: string;
  };
}

async function createProject(agent: SuperAgentTest, customerId: number) {
  const token = nextDeterministicToken("journal-context-project");
  const response = await agent
    .post("/api/projects")
    .send({
      name: `Projekt ${token}`,
      customerId,
      descriptionMd: null,
      orderNumber: `ORD-${token}`,
      amount: "0.00",
    })
    .expect(201);

  return response.body as {
    id: number;
    version: number;
    name: string;
    customerId: number;
    orderNumber: string;
  };
}

async function createAppointment(agent: SuperAgentTest, projectId: number, employeeIds: number[] = []) {
  const day = String((Number(nextDeterministicToken("journal-context-appointment").slice(-4)) % 20) + 10).padStart(2, "0");
  const response = await agent
    .post("/api/appointments")
    .send({
      projectId,
      startDate: `2099-08-${day}`,
      endDate: null,
      startTime: null,
      employeeIds,
    })
    .expect(201);

  const appointment = response.body as {
    id: number;
    version: number;
    projectId: number | null;
    customerId: number;
    startDate: string;
  };

  return {
    ...appointment,
    startDate: appointment.startDate.slice(0, 10),
  };
}

async function createEmployee(agent: SuperAgentTest, label: string) {
  const token = nextDeterministicToken(`journal-context-employee-${label}`);
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: "Journal",
      lastName: `${label}-${token}`,
      phone: null,
      email: null,
      exitDate: null,
    })
    .expect(201);

  return response.body as {
    id: number;
    version: number;
  };
}

async function getJournalItems(
  agent: SuperAgentTest,
  params: { contextTable: string; contextId?: number; contextKey?: string },
) {
  const search = new URLSearchParams({
    page: "1",
    pageSize: "100",
    contextTable: params.contextTable,
  });

  if (typeof params.contextId === "number") {
    search.set("contextId", String(params.contextId));
  }
  if (params.contextKey) {
    search.set("contextKey", params.contextKey);
  }

  const response = await agent
    .get(`/api/journal/messages?${search.toString()}`)
    .expect(200);

  return response.body.items as JournalApiItem[];
}

function expectJournalTrigger(
  items: JournalApiItem[],
  expected: {
    tableName: string;
    triggerKey: string;
    contextTable?: string;
    contextId?: number;
  },
) {
  const match = items.find((item) => {
    if (item.tableName !== expected.tableName || item.triggerKey !== expected.triggerKey) {
      return false;
    }
    if (!expected.contextTable) {
      return true;
    }

    return item.contexts.some((context) =>
      context.contextTable === expected.contextTable
      && (expected.contextId == null || context.contextId === expected.contextId));
  });

  expect(match).toBeTruthy();
}

describe("FT-Journal integration: journal context propagation", () => {
  it("propagates customer, project and appointment lifecycle mutations into parent detail journals", async () => {
    const admin = await loginAdminAgent(app);

    const customer = await createCustomer(admin);
    const project = await createProject(admin, customer.id);
    const appointment = await createAppointment(admin, project.id);

    const updatedCustomer = await admin
      .patch(`/api/customers/${customer.id}`)
      .send({
        version: customer.version,
        phone: "030-1000",
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    const updatedProject = await admin
      .patch(`/api/projects/${project.id}`)
      .send({
        version: project.version,
        name: `${project.name} aktualisiert`,
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    const updatedAppointment = await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: appointment.version,
        projectId: project.id,
        startDate: "2099-09-20",
        endDate: null,
        startTime: null,
        employeeIds: [],
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    await admin
      .delete(`/api/appointments/${appointment.id}`)
      .send({ version: updatedAppointment.version })
      .expect(204);

    const deletableProject = await createProject(admin, customer.id);
    await admin
      .delete(`/api/projects/${deletableProject.id}`)
      .send({ version: deletableProject.version })
      .expect(204);

    const customerJournal = await getJournalItems(admin, {
      contextTable: "customer",
      contextId: customer.id,
    });
    expectJournalTrigger(customerJournal, { tableName: "customer", triggerKey: "customer.create" });
    expectJournalTrigger(customerJournal, { tableName: "customer", triggerKey: "customer.update" });
    expectJournalTrigger(customerJournal, { tableName: "project", triggerKey: "project.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project", triggerKey: "project.update", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment", triggerKey: "appointment.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment", triggerKey: "appointment.update", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment", triggerKey: "appointment.delete", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project", triggerKey: "project.delete", contextTable: "customer", contextId: customer.id });

    const projectJournal = await getJournalItems(admin, {
      contextTable: "project",
      contextId: project.id,
    });
    expectJournalTrigger(projectJournal, { tableName: "project", triggerKey: "project.create" });
    expectJournalTrigger(projectJournal, { tableName: "project", triggerKey: "project.update" });
    expectJournalTrigger(projectJournal, { tableName: "appointment", triggerKey: "appointment.create", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment", triggerKey: "appointment.update", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment", triggerKey: "appointment.delete", contextTable: "project", contextId: project.id });

    const deletedProjectJournal = await getJournalItems(admin, {
      contextTable: "project",
      contextId: deletableProject.id,
    });
    expectJournalTrigger(deletedProjectJournal, { tableName: "project", triggerKey: "project.create" });
    expectJournalTrigger(deletedProjectJournal, { tableName: "project", triggerKey: "project.delete" });

    expect(updatedCustomer.version).toBeGreaterThan(customer.version);
    expect(updatedProject.version).toBeGreaterThan(project.version);
  });

  it("propagates project note, attachment and order-item mutations into the customer journal", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomer(admin);
    const project = await createProject(admin, customer.id);

    const projectNote = await admin
      .post(`/api/projects/${project.id}/notes`)
      .send({
        title: "Projektnotiz",
        body: "<p>Projektinhalt</p>",
      })
      .expect(201)
      .then((response) => response.body as { id: number; version: number });

    const updatedProjectNote = await admin
      .put(`/api/notes/${projectNote.id}`)
      .send({
        version: projectNote.version,
        title: "Projektnotiz aktualisiert",
        body: "<p>Projektinhalt aktualisiert</p>",
      })
      .expect(200)
      .then((response) => response.body as { id: number; version: number });

    await admin
      .patch(`/api/notes/${projectNote.id}/pin`)
      .send({
        version: updatedProjectNote.version,
        isPinned: true,
      })
      .expect(200);

    const projectAttachmentId = await admin
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("projekt-journal"), "projekt-journal.txt")
      .expect(201)
      .then((response) => Number(response.body.id));

    await admin
      .delete(`/api/project-attachments/${projectAttachmentId}`)
      .expect(200);

    const product = await createProductFixture({
      categoryName: "Journal",
      name: `Produkt ${nextDeterministicToken("journal-context-product")}`,
    });

    const orderItem = await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.orderNumber,
        productId: product.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201)
      .then((response) => response.body as { id: number; version: number });

    const updatedOrderItem = await admin
      .put(`/api/projects/${project.id}/order-items/${orderItem.id}`)
      .send({
        version: orderItem.version,
        projectId: project.id,
        orderNumber: project.orderNumber,
        productId: product.id,
        componentId: null,
        quantity: 2,
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    await admin
      .delete(`/api/projects/${project.id}/order-items/${orderItem.id}`)
      .send({ version: updatedOrderItem.version })
      .expect(204);

    const customerJournal = await getJournalItems(admin, {
      contextTable: "customer",
      contextId: customer.id,
    });

    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "project.note.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "note.update", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "note.pin", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project_attachment", triggerKey: "project.attachment.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project_attachment", triggerKey: "project.attachment.delete", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project_order_item", triggerKey: "project.order_item.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project_order_item", triggerKey: "project.order_item.update", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "project_order_item", triggerKey: "project.order_item.delete", contextTable: "customer", contextId: customer.id });
  });

  it("propagates appointment note, attachment and employee delta mutations into project and customer journals", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomer(admin);
    const project = await createProject(admin, customer.id);
    const employeeA = await createEmployee(admin, "A");
    const employeeB = await createEmployee(admin, "B");
    const appointment = await createAppointment(admin, project.id);

    const appointmentNote = await admin
      .post(`/api/appointments/${appointment.id}/notes`)
      .send({
        title: "Terminnotiz",
        body: "<p>Termininhalt</p>",
      })
      .expect(201)
      .then((response) => response.body as { id: number; version: number });

    const updatedAppointmentNote = await admin
      .put(`/api/notes/${appointmentNote.id}`)
      .send({
        version: appointmentNote.version,
        title: "Terminnotiz aktualisiert",
        body: "<p>Termininhalt aktualisiert</p>",
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    await admin
      .patch(`/api/notes/${appointmentNote.id}/pin`)
      .send({
        version: updatedAppointmentNote.version,
        isPinned: true,
      })
      .expect(200);

    const appointmentAttachmentId = await admin
      .post(`/api/appointments/${appointment.id}/attachments`)
      .attach("file", Buffer.from("termin-journal"), "termin-journal.txt")
      .expect(201)
      .then((response) => Number(response.body.id));

    await admin
      .delete(`/api/appointment-attachments/${appointmentAttachmentId}`)
      .expect(200);

    const appointmentAfterAdd = await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: appointment.version,
        projectId: project.id,
        startDate: appointment.startDate,
        endDate: null,
        startTime: null,
        employeeIds: [employeeA.id],
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: appointmentAfterAdd.version,
        projectId: project.id,
        startDate: appointment.startDate,
        endDate: null,
        startTime: null,
        employeeIds: [employeeB.id],
      })
      .expect(200);

    const customerJournal = await getJournalItems(admin, {
      contextTable: "customer",
      contextId: customer.id,
    });
    const projectJournal = await getJournalItems(admin, {
      contextTable: "project",
      contextId: project.id,
    });

    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "appointment.note.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "note.update", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "note", triggerKey: "note.pin", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment_attachment", triggerKey: "appointment.attachment.create", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment_attachment", triggerKey: "appointment.attachment.delete", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment_employee", triggerKey: "appointment.employee.add", contextTable: "customer", contextId: customer.id });
    expectJournalTrigger(customerJournal, { tableName: "appointment_employee", triggerKey: "appointment.employee.remove", contextTable: "customer", contextId: customer.id });

    expectJournalTrigger(projectJournal, { tableName: "note", triggerKey: "appointment.note.create", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "note", triggerKey: "note.update", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "note", triggerKey: "note.pin", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment_attachment", triggerKey: "appointment.attachment.create", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment_attachment", triggerKey: "appointment.attachment.delete", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment_employee", triggerKey: "appointment.employee.add", contextTable: "project", contextId: project.id });
    expectJournalTrigger(projectJournal, { tableName: "appointment_employee", triggerKey: "appointment.employee.remove", contextTable: "project", contextId: project.id });
  });

  it("rolls back the journal entry when context rows fail", async () => {
    const triggerKey = `journal.atomic.rollback.${nextDeterministicToken("journal-context-rollback")}`;

    await expect(insertJournalEntry({
      tableName: "customer",
      recordId: 1,
      op: "create",
      messageText: "Rollback pruefen",
      isRaw: false,
      triggerKey,
      contexts: [
        {
          contextTable: "x".repeat(128),
          contextId: 1,
          relationRole: "owner",
        },
      ],
    })).rejects.toThrow();

    const [row] = await db
      .select({ value: count() })
      .from(journalEntries)
      .where(eq(journalEntries.triggerKey, triggerKey));

    expect(Number(row?.value ?? 0)).toBe(0);
  });
});
