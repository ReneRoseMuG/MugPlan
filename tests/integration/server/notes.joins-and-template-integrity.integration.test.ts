/**
 * Test Scope:
 *
 * Feature: FT09/FT13 - Notizen und Notizvorlagen in Kunden-/Projektkontext
 * Use Case: UC Notizen erzeugen, per Vorlage einfärben, korrekt zuordnen und scoped verwalten
 *
 * Abgedeckte Regeln:
 * - Kundennotiz-Create erzeugt genau eine customer_note-Relation (keine project_note-Relation).
 * - Projektnotiz-Create erzeugt genau eine project_note-Relation (keine customer_note-Relation).
 * - Vorlagenfarbe wird beim Notiz-Create in die Note übernommen.
 * - Notizlisten sind je Parent isoliert (kein Übersprechen zwischen Kunden/Projekten).
 * - Notizvorlagen-Listing liefert standardmäßig nur aktive Vorlagen und mit active=false alle.
 * - Scoped Delete darf keine fremde Parent-Notiz löschen (Parent-Mismatch-Schutz).
 *
 * Fehlerfaelle:
 * - Join-Eintrag landet in falscher Relationstabelle.
 * - Template-Farbe wird nicht übernommen.
 * - Notiz erscheint im falschen Parent-Listing.
 * - Delete über falschen Parent-Pfad löscht dennoch eine fremde Notiz.
 *
 * Ziel:
 * Integrative Absicherung der Join-Integrität über Kunden/Projekte inkl. Regression gegen Parent-Wechsel
 * bzw. Parent-Mismatch-Löschung.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { customerNotes, customers, noteTemplates, notes, projectNotes, projects } from "@shared/schema";

let app: express.Express;
let sequence = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextId(prefix: string): string {
  const id = `${prefix}-${Date.now()}-${sequence}`;
  sequence += 1;
  return id;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function loginReaderAgent(): Promise<SuperAgentTest> {
  const username = nextId("NOTE-READER");
  const password = "note-reader-password";
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Note",
    lastName: "Reader",
    passwordHash: await hashPassword(password),
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  return agent;
}

async function createCustomer(agent: SuperAgentTest, marker: string): Promise<number> {
  const created = await createCustomerEntity(agent, marker);
  return created.id;
}

async function createCustomerEntity(
  agent: SuperAgentTest,
  marker: string,
): Promise<{ id: number; version: number }> {
  const res = await agent
    .post("/api/customers")
    .send({
      customerNumber: nextId(`CUST-${marker}`),
      firstName: marker,
      lastName: "Note",
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      version: 1,
    })
    .expect(201);
  return { id: Number(res.body.id), version: Number(res.body.version) };
}

async function createProject(agent: SuperAgentTest, customerId: number, marker: string): Promise<number> {
  const created = await createProjectEntity(agent, customerId, marker);
  return created.id;
}

async function createProjectEntity(
  agent: SuperAgentTest,
  customerId: number,
  marker: string,
): Promise<{ id: number; version: number }> {
  const res = await agent
    .post("/api/projects")
    .send({
      name: nextId(`PRJ-${marker}`),
      customerId,
      orderNumber: nextId(`ORD-${marker}`),
      descriptionMd: null,
      version: 1,
    })
    .expect(201);
  return { id: Number(res.body.id), version: Number(res.body.version) };
}

async function createTemplate(
  agent: SuperAgentTest,
  input: { marker: string; isActive: boolean; cardColor: string; print?: boolean },
) {
  const res = await agent
    .post("/api/note-templates")
    .send({
      title: nextId(`TPL-${input.marker}`),
      body: `<p>Template ${input.marker}</p>`,
      cardColor: input.cardColor,
      print: input.print ?? true,
      sortOrder: 0,
      isActive: input.isActive,
    })
    .expect(201);
  return res.body as { id: number; version: number; isActive: boolean; cardColor: string | null; print: boolean };
}

describe("FT09/FT13 integration: note joins and template integrity", () => {
  it("creates customer note from template and persists only customer_note join", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "JOIN-CUST");
    const template = await createTemplate(agent, { marker: "JOIN-CUST", isActive: true, cardColor: "#22c55e", print: false });

    const createRes = await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        title: "Kundennotiz",
        body: "<p>Body</p>",
        templateId: template.id,
      })
      .expect(201);

    const noteId = Number(createRes.body.id);
    expect(createRes.body.cardColor).toBe("#22c55e");
    expect(createRes.body.print).toBe(true);
    expect(createRes.body.cardColorLocked).toBe(true);

    const customerJoin = await db
      .select()
      .from(customerNotes)
      .where(and(eq(customerNotes.customerId, customerId), eq(customerNotes.noteId, noteId)));
    const projectJoin = await db.select().from(projectNotes).where(eq(projectNotes.noteId, noteId));

    expect(customerJoin).toHaveLength(1);
    expect(projectJoin).toHaveLength(0);
  });

  it("creates project note from template and persists only project_note join", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "JOIN-PRJ");
    const projectId = await createProject(agent, customerId, "JOIN-PRJ");
    const template = await createTemplate(agent, { marker: "JOIN-PRJ", isActive: true, cardColor: "#3b82f6" });

    const createRes = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({
        title: "Projektnotiz",
        body: "<p>Body</p>",
        templateId: template.id,
      })
      .expect(201);

    const noteId = Number(createRes.body.id);
    expect(createRes.body.cardColor).toBe("#3b82f6");
    expect(createRes.body.print).toBe(true);
    expect(createRes.body.cardColorLocked).toBe(true);

    const projectJoin = await db
      .select()
      .from(projectNotes)
      .where(and(eq(projectNotes.projectId, projectId), eq(projectNotes.noteId, noteId)));
    const customerJoin = await db.select().from(customerNotes).where(eq(customerNotes.noteId, noteId));

    expect(projectJoin).toHaveLength(1);
    expect(customerJoin).toHaveLength(0);
  });

  it("updates note title/body and exposes the changed values via readback", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "UPDATE-READBACK");
    const projectId = await createProject(agent, customerId, "UPDATE-READBACK");

    const created = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Vorher", body: "<p>Vorher</p>", cardColor: "#f59e0b", print: false })
      .expect(201);

    const noteId = Number(created.body.id);
    const version = Number(created.body.version);

    await agent
      .put(`/api/notes/${noteId}`)
      .send({ title: "Nachher", body: "<p>Nachher</p>", cardColor: "#0ea5e9", print: true, version })
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe("Nachher");
        expect(res.body.body).toBe("<p>Nachher</p>");
        expect(res.body.cardColor).toBe("#0ea5e9");
        expect(res.body.print).toBe(true);
      });

    const list = await agent.get(`/api/projects/${projectId}/notes`).expect(200);
    const updated = (list.body as Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>).find(
      (entry) => Number(entry.id) === noteId,
    );
    expect(updated?.title).toBe("Nachher");
    expect(updated?.body).toBe("<p>Nachher</p>");
    expect(updated?.cardColor).toBe("#0ea5e9");
    expect(updated?.print).toBe(true);
  });

  it("blocks reader role from customer/project note mutations and generic note edits", async () => {
    const admin = await loginAdminAgent();
    const reader = await loginReaderAgent();
    const customerId = await createCustomer(admin, "ROLE-BLOCK");
    const projectId = await createProject(admin, customerId, "ROLE-BLOCK");

    const customerNote = await admin
      .post(`/api/customers/${customerId}/notes`)
      .send({ title: "Kundennotiz Rolle", body: "<p>Kunde</p>" })
      .expect(201);
    const projectNote = await admin
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Projektnotiz Rolle", body: "<p>Projekt</p>" })
      .expect(201);

    await reader
      .post(`/api/customers/${customerId}/notes`)
      .send({ title: "Nicht erlaubt", body: "<p>Nein</p>" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
    await reader
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Nicht erlaubt", body: "<p>Nein</p>" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
    await reader
      .put(`/api/notes/${projectNote.body.id}`)
      .send({ title: "Nicht erlaubt", body: "<p>Nein</p>", version: projectNote.body.version })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
    await reader
      .patch(`/api/notes/${projectNote.body.id}/pin`)
      .send({ isPinned: true, version: projectNote.body.version })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
    await reader
      .delete(`/api/customers/${customerId}/notes/${customerNote.body.id}`)
      .send({ version: customerNote.body.version })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
    await reader
      .delete(`/api/projects/${projectId}/notes/${projectNote.body.id}`)
      .send({ version: projectNote.body.version })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("FORBIDDEN"));
  });

  it("persists free customer and project note cardColor/print on create", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "FREE-CREATE");
    const projectId = await createProject(agent, customerId, "FREE-CREATE");

    await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({ title: "Freie Kundennotiz", body: "<p>Kunde</p>", cardColor: "#f97316", print: false })
      .expect(201)
      .expect((res) => {
        expect(res.body.cardColor).toBe("#f97316");
        expect(res.body.print).toBe(false);
        expect(res.body.cardColorLocked).toBe(false);
      });

    await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Freie Projektnotiz", body: "<p>Projekt</p>", cardColor: "#22c55e", print: true })
      .expect(201)
      .expect((res) => {
        expect(res.body.cardColor).toBe("#22c55e");
        expect(res.body.print).toBe(true);
        expect(res.body.cardColorLocked).toBe(false);
      });
  });

  it("keeps template-derived cardColor immutable while allowing print updates", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "LOCK-COLOR");
    const projectId = await createProject(agent, customerId, "LOCK-COLOR");
    const template = await createTemplate(agent, { marker: "LOCK-COLOR", isActive: true, cardColor: "#7c3aed", print: true });

    const created = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Locked", body: "<p>Locked</p>", templateId: template.id })
      .expect(201);

    const noteId = Number(created.body.id);
    const version = Number(created.body.version);

    await agent
      .put(`/api/notes/${noteId}`)
      .send({ cardColor: "#ef4444", print: false, version })
      .expect(200)
      .expect((res) => {
        expect(res.body.cardColor).toBe("#7c3aed");
        expect(res.body.print).toBe(false);
        expect(res.body.cardColorLocked).toBe(true);
      });
  });

  it("returns VERSION_CONFLICT on stale note update", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "UPDATE-CONFLICT");
    const projectId = await createProject(agent, customerId, "UPDATE-CONFLICT");

    const created = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Initial", body: "<p>Initial</p>", print: true })
      .expect(201);

    const noteId = Number(created.body.id);
    const staleVersion = Number(created.body.version);

    await agent
      .put(`/api/notes/${noteId}`)
      .send({ title: "Erstes Update", body: "<p>Eins</p>", print: false, version: staleVersion })
      .expect(200);

    await agent
      .put(`/api/notes/${noteId}`)
      .send({ title: "Stale", body: "<p>Zwei</p>", print: true, version: staleVersion })
      .expect(409)
      .expect((res) => {
        expect(res.body).toEqual({ code: "VERSION_CONFLICT" });
      });
  });

  it("rejects duplicate project_note relation for the same project and note", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "DUP-PROJECT-NOTE");
    const projectId = await createProject(agent, customerId, "DUP-PROJECT-NOTE");

    const created = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({ title: "Duplikat", body: "<p>Duplikat</p>" })
      .expect(201);

    const noteId = Number(created.body.id);

    await expect(
      db.insert(projectNotes).values({ projectId, noteId, version: 1 }),
    ).rejects.toThrow();
  });

  it("isolates customer notes by parent customer", async () => {
    const agent = await loginAdminAgent();
    const customerA = await createCustomer(agent, "ISO-CUST-A");
    const customerB = await createCustomer(agent, "ISO-CUST-B");

    const noteA = await agent
      .post(`/api/customers/${customerA}/notes`)
      .send({ title: "A", body: "A" })
      .expect(201);
    const noteB = await agent
      .post(`/api/customers/${customerB}/notes`)
      .send({ title: "B", body: "B" })
      .expect(201);

    const listA = await agent.get(`/api/customers/${customerA}/notes`).expect(200);
    const listB = await agent.get(`/api/customers/${customerB}/notes`).expect(200);

    const idsA = listA.body.map((entry: { id: number }) => Number(entry.id));
    const idsB = listB.body.map((entry: { id: number }) => Number(entry.id));
    expect(idsA).toContain(Number(noteA.body.id));
    expect(idsA).not.toContain(Number(noteB.body.id));
    expect(idsB).toContain(Number(noteB.body.id));
    expect(idsB).not.toContain(Number(noteA.body.id));
  });

  it("isolates project notes by parent project", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "ISO-PRJ");
    const projectA = await createProject(agent, customerId, "ISO-PRJ-A");
    const projectB = await createProject(agent, customerId, "ISO-PRJ-B");

    const noteA = await agent
      .post(`/api/projects/${projectA}/notes`)
      .send({ title: "A", body: "A" })
      .expect(201);
    const noteB = await agent
      .post(`/api/projects/${projectB}/notes`)
      .send({ title: "B", body: "B" })
      .expect(201);

    const listA = await agent.get(`/api/projects/${projectA}/notes`).expect(200);
    const listB = await agent.get(`/api/projects/${projectB}/notes`).expect(200);

    const idsA = listA.body.map((entry: { id: number }) => Number(entry.id));
    const idsB = listB.body.map((entry: { id: number }) => Number(entry.id));
    expect(idsA).toContain(Number(noteA.body.id));
    expect(idsA).not.toContain(Number(noteB.body.id));
    expect(idsB).toContain(Number(noteB.body.id));
    expect(idsB).not.toContain(Number(noteA.body.id));
  });

  it("returns only active templates by default and returns active+inactive with active=false", async () => {
    const agent = await loginAdminAgent();
    const active = await createTemplate(agent, { marker: "TPL-ACTIVE", isActive: true, cardColor: "#0ea5e9" });
    const inactive = await createTemplate(agent, { marker: "TPL-INACTIVE", isActive: false, cardColor: "#64748b" });

    const defaultList = await agent.get("/api/note-templates").expect(200);
    const allList = await agent.get("/api/note-templates?active=false").expect(200);

    const defaultIds = defaultList.body.map((entry: { id: number }) => Number(entry.id));
    const allIds = allList.body.map((entry: { id: number }) => Number(entry.id));

    expect(defaultIds).toContain(active.id);
    expect(defaultIds).not.toContain(inactive.id);
    expect(allIds).toContain(active.id);
    expect(allIds).toContain(inactive.id);
  });

  it("must not delete foreign customer note via parent-mismatch path", async () => {
    const agent = await loginAdminAgent();
    const customerA = await createCustomer(agent, "DEL-CUST-A");
    const customerB = await createCustomer(agent, "DEL-CUST-B");

    const noteB = await agent
      .post(`/api/customers/${customerB}/notes`)
      .send({ title: "foreign", body: "foreign" })
      .expect(201);

    const noteId = Number(noteB.body.id);
    const version = Number(noteB.body.version);

    await agent
      .delete(`/api/customers/${customerA}/notes/${noteId}`)
      .send({ version })
      .expect(404);

    const listB = await agent.get(`/api/customers/${customerB}/notes`).expect(200);
    const idsB = listB.body.map((entry: { id: number }) => Number(entry.id));
    expect(idsB).toContain(noteId);
  });

  it("must not delete foreign project note via parent-mismatch path", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "DEL-PRJ");
    const projectA = await createProject(agent, customerId, "DEL-PRJ-A");
    const projectB = await createProject(agent, customerId, "DEL-PRJ-B");

    const noteB = await agent
      .post(`/api/projects/${projectB}/notes`)
      .send({ title: "foreign", body: "foreign" })
      .expect(201);

    const noteId = Number(noteB.body.id);
    const version = Number(noteB.body.version);

    await agent
      .delete(`/api/projects/${projectA}/notes/${noteId}`)
      .send({ version })
      .expect(404);

    const listB = await agent.get(`/api/projects/${projectB}/notes`).expect(200);
    const idsB = listB.body.map((entry: { id: number }) => Number(entry.id));
    expect(idsB).toContain(noteId);
  });

  it("deletes note rows and both joins when note is actually deleted while parent entities remain", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerEntity(agent, "DEL-JOIN");
    const project = await createProjectEntity(agent, customer.id, "DEL-JOIN");

    const note = await agent
      .post(`/api/customers/${customer.id}/notes`)
      .send({ title: "delete-me", body: "delete-me" })
      .expect(201);
    const noteId = Number(note.body.id);
    const version = Number(note.body.version);
    await db.insert(projectNotes).values({ projectId: project.id, noteId, version: 1 });

    await agent
      .delete(`/api/customers/${customer.id}/notes/${noteId}`)
      .send({ version })
      .expect(204);

    const noteRow = await db.select().from(notes).where(eq(notes.id, noteId));
    const customerJoin = await db.select().from(customerNotes).where(eq(customerNotes.noteId, noteId));
    const projectJoin = await db.select().from(projectNotes).where(eq(projectNotes.noteId, noteId));
    const customerRow = await db.select().from(customers).where(eq(customers.id, customer.id));
    const projectRow = await db.select().from(projects).where(eq(projects.id, project.id));

    expect(noteRow).toHaveLength(0);
    expect(customerJoin).toHaveLength(0);
    expect(projectJoin).toHaveLength(0);
    expect(customerRow).toHaveLength(1);
    expect(projectRow).toHaveLength(1);
  });

  it("deletes orphan project notes when deleting a project", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "DEL-PROJECT-ORPHAN");
    const project = await createProjectEntity(agent, customerId, "DEL-PROJECT-ORPHAN");

    const note = await agent
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "orphan", body: "<p>orphan</p>" })
      .expect(201);
    const noteId = Number(note.body.id);

    await agent
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(204);

    const noteRow = await db.select().from(notes).where(eq(notes.id, noteId));
    const projectJoin = await db.select().from(projectNotes).where(eq(projectNotes.noteId, noteId));
    expect(projectJoin).toHaveLength(0);
    expect(noteRow).toHaveLength(0);
  });

  it("keeps note when deleting project if note is still linked to customer", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "DEL-PROJECT-SHARED");
    const project = await createProjectEntity(agent, customerId, "DEL-PROJECT-SHARED");

    const note = await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({ title: "shared", body: "<p>shared</p>" })
      .expect(201);
    const noteId = Number(note.body.id);

    await db.insert(projectNotes).values({ projectId: project.id, noteId, version: 1 });

    await agent
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(204);

    const noteRow = await db.select().from(notes).where(eq(notes.id, noteId));
    const projectJoin = await db
      .select()
      .from(projectNotes)
      .where(and(eq(projectNotes.projectId, project.id), eq(projectNotes.noteId, noteId)));
    const customerJoin = await db
      .select()
      .from(customerNotes)
      .where(and(eq(customerNotes.customerId, customerId), eq(customerNotes.noteId, noteId)));

    expect(projectJoin).toHaveLength(0);
    expect(customerJoin).toHaveLength(1);
    expect(noteRow).toHaveLength(1);
  });

  it("keeps customer_note relation when customer is archived", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerEntity(agent, "ARCHIVE-CUSTOMER");

    const note = await agent
      .post(`/api/customers/${customer.id}/notes`)
      .send({ title: "archive", body: "<p>archive</p>" })
      .expect(201);
    const noteId = Number(note.body.id);

    const archived = await agent
      .patch(`/api/customers/${customer.id}`)
      .send({ isActive: false, version: customer.version })
      .expect(200);

    expect(archived.body.isActive).toBe(false);

    const relation = await db
      .select()
      .from(customerNotes)
      .where(and(eq(customerNotes.customerId, customer.id), eq(customerNotes.noteId, noteId)));
    expect(relation).toHaveLength(1);

    const list = await agent.get(`/api/customers/${customer.id}/notes`).expect(200);
    const ids = list.body.map((entry: { id: number }) => Number(entry.id));
    expect(ids).toContain(noteId);
  });

  it("persists template creation in note_template table with versioning defaults", async () => {
    const agent = await loginAdminAgent();
    const template = await createTemplate(agent, { marker: "TPL-DB", isActive: true, cardColor: "#f97316", print: false });

    const rows = await db.select().from(noteTemplates).where(eq(noteTemplates.id, template.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].isActive).toBe(true);
    expect(rows[0].cardColor).toBe("#f97316");
    expect(rows[0].print).toBe(false);
    expect(rows[0].version).toBeGreaterThanOrEqual(1);
  });
});
