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
import { customerNotes, noteTemplates, notes, projectNotes } from "@shared/schema";

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

async function createCustomer(agent: SuperAgentTest, marker: string): Promise<number> {
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
  return Number(res.body.id);
}

async function createProject(agent: SuperAgentTest, customerId: number, marker: string): Promise<number> {
  const res = await agent
    .post("/api/projects")
    .send({
      name: nextId(`PRJ-${marker}`),
      customerId,
      orderNumber: null,
      descriptionMd: null,
      version: 1,
    })
    .expect(201);
  return Number(res.body.id);
}

async function createTemplate(agent: SuperAgentTest, input: { marker: string; isActive: boolean; color: string }) {
  const res = await agent
    .post("/api/note-templates")
    .send({
      title: nextId(`TPL-${input.marker}`),
      body: `<p>Template ${input.marker}</p>`,
      color: input.color,
      sortOrder: 0,
      isActive: input.isActive,
    })
    .expect(201);
  return res.body as { id: number; version: number; isActive: boolean; color: string | null };
}

describe("FT09/FT13 integration: note joins and template integrity", () => {
  it("creates customer note from template and persists only customer_note join", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "JOIN-CUST");
    const template = await createTemplate(agent, { marker: "JOIN-CUST", isActive: true, color: "#22c55e" });

    const createRes = await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        title: "Kundennotiz",
        body: "<p>Body</p>",
        templateId: template.id,
      })
      .expect(201);

    const noteId = Number(createRes.body.id);
    expect(createRes.body.color).toBe("#22c55e");

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
    const template = await createTemplate(agent, { marker: "JOIN-PRJ", isActive: true, color: "#3b82f6" });

    const createRes = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({
        title: "Projektnotiz",
        body: "<p>Body</p>",
        templateId: template.id,
      })
      .expect(201);

    const noteId = Number(createRes.body.id);
    expect(createRes.body.color).toBe("#3b82f6");

    const projectJoin = await db
      .select()
      .from(projectNotes)
      .where(and(eq(projectNotes.projectId, projectId), eq(projectNotes.noteId, noteId)));
    const customerJoin = await db.select().from(customerNotes).where(eq(customerNotes.noteId, noteId));

    expect(projectJoin).toHaveLength(1);
    expect(customerJoin).toHaveLength(0);
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
    const active = await createTemplate(agent, { marker: "TPL-ACTIVE", isActive: true, color: "#0ea5e9" });
    const inactive = await createTemplate(agent, { marker: "TPL-INACTIVE", isActive: false, color: "#64748b" });

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

  it("deletes note rows and both joins when note is actually deleted", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent, "DEL-JOIN");

    const note = await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({ title: "delete-me", body: "delete-me" })
      .expect(201);
    const noteId = Number(note.body.id);
    const version = Number(note.body.version);

    await agent
      .delete(`/api/customers/${customerId}/notes/${noteId}`)
      .send({ version })
      .expect(204);

    const noteRow = await db.select().from(notes).where(eq(notes.id, noteId));
    const customerJoin = await db.select().from(customerNotes).where(eq(customerNotes.noteId, noteId));
    const projectJoin = await db.select().from(projectNotes).where(eq(projectNotes.noteId, noteId));

    expect(noteRow).toHaveLength(0);
    expect(customerJoin).toHaveLength(0);
    expect(projectJoin).toHaveLength(0);
  });

  it("persists template creation in note_template table with versioning defaults", async () => {
    const agent = await loginAdminAgent();
    const template = await createTemplate(agent, { marker: "TPL-DB", isActive: true, color: "#f97316" });

    const rows = await db.select().from(noteTemplates).where(eq(noteTemplates.id, template.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].isActive).toBe(true);
    expect(rows[0].version).toBeGreaterThanOrEqual(1);
  });
});
