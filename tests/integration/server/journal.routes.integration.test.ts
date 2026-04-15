/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - GET /api/journal/messages liefert fuer ADMIN paginierte Journaleintraege in absteigender Reihenfolge.
 * - Kontext-, Akteur-, Freitext- und Trigger-Filter greifen gemeinsam auf den Journal-Read-Endpoint.
 * - DISPATCHER duerfen das Journal lesen.
 * - READER erhalten auf den Journal-Read-Endpoint ein FORBIDDEN.
 *
 * Fehlerfaelle:
 * - Nicht berechtigte Rollen erhalten dennoch Journaldaten.
 * - Filter ignorieren Kontext oder Textbedingungen.
 *
 * Ziel:
 * Den neuen Journal-Read-Endpoint end-to-end ueber echte Session-Auth und Test-DB absichern.
 */
import type express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import request, { type SuperAgentTest } from "supertest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { insertJournalEntry } from "../../../server/repositories/journalRepository";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const username = `journal-${roleCode.toLowerCase()}`;
  const password = `${username}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Journal",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

describe("FT-Journal integration: journal routes", () => {
  it("returns journal items for admin in descending order and applies combined filters", async () => {
    const admin = await loginAdminAgent(app);

    const customerId = 501;
    await insertJournalEntry({
      tableName: "customer",
      recordId: customerId,
      op: "update",
      field: "phone",
      oldValue: "111",
      newValue: "222",
      actorUserId: 1,
      actorName: "Anna Admin",
      triggerKey: "customer.update",
      messageText: "Kunde wurde aktualisiert",
      isRaw: false,
      contexts: [
        { contextTable: "customer", contextId: customerId, relationRole: "self" },
      ],
    });

    await insertJournalEntry({
      tableName: "project",
      recordId: 601,
      op: "update",
      field: "name",
      oldValue: "Alt",
      newValue: "Neu",
      actorUserId: 2,
      actorName: "Dieter Disponent",
      triggerKey: "project.update",
      messageText: "Projekt wurde fuer den Kunden aktualisiert",
      isRaw: false,
      contexts: [
        { contextTable: "project", contextId: 601, relationRole: "self" },
        { contextTable: "customer", contextId: customerId, relationRole: "customer" },
      ],
    });

    await admin
      .get("/api/journal/messages?page=1&pageSize=10")
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(2);
        expect(res.body.items).toHaveLength(2);
        expect(res.body.items[0].messageText).toContain("Projekt wurde fuer den Kunden aktualisiert");
        expect(res.body.items[1].messageText).toContain("Kunde wurde aktualisiert");
      });

    await admin
      .get(`/api/journal/messages?page=1&pageSize=10&contextTable=customer&contextId=${customerId}&actor=Dieter&q=Projekt&triggerKey=project.update`)
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0]).toMatchObject({
          tableName: "project",
          actorName: "Dieter Disponent",
          triggerKey: "project.update",
        });
        expect(res.body.items[0].contexts).toEqual(expect.arrayContaining([
          expect.objectContaining({ contextTable: "customer", contextId: customerId }),
          expect.objectContaining({ contextTable: "project", contextId: 601 }),
        ]));
      });
  });

  it("allows DISPATCHER to read the journal", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");

    await insertJournalEntry({
      tableName: "customer",
      recordId: 777,
      op: "create",
      actorUserId: 1,
      actorName: "Anna Admin",
      triggerKey: "customer.create",
      messageText: "Kunde wurde angelegt",
      isRaw: false,
      contexts: [
        { contextTable: "customer", contextId: 777, relationRole: "self" },
      ],
    });

    await dispatcher
      .get("/api/journal/messages?page=1&pageSize=5")
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
      });
  });

  it("rejects READER with FORBIDDEN", async () => {
    const reader = await createRoleAgent("READER");

    await reader
      .get("/api/journal/messages?page=1&pageSize=5")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
