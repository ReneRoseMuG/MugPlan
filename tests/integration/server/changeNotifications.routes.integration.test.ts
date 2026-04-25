/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der SSE-Stream ist nur für authentifizierte Sessions verfügbar.
 * - Auch READER dürfen den technischen Änderungsstream öffnen.
 * - Last-Event-ID liefert nur verpasste Journal-basierte Änderungsereignisse nach.
 *
 * Fehlerfälle:
 * - Unauthentifizierte Zugriffe erhalten trotzdem einen offenen Stream.
 * - Replay ignoriert den Cursor und liefert bereits bekannte Ereignisse erneut.
 *
 * Ziel:
 * Den neuen FT-32-Stream auf Authentifizierung und Replay-Semantik absichern.
 */
import type express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import request, { type SuperAgentTest } from "supertest";
import { createApiTestApp } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { insertJournalEntry } from "../../../server/repositories/journalRepository";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "READER" | "DISPATCHER"): Promise<SuperAgentTest> {
  const username = `change-stream-${roleCode.toLowerCase()}`;
  const password = `${username}-password`;
  const passwordHash = await hashPassword(password);

  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Change",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function readSseUntil(params: {
  agent: SuperAgentTest;
  path: string;
  headers?: Record<string, string>;
  stopWhen: (text: string) => boolean;
}): Promise<{ text: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    let text = "";
    let settled = false;

    const req = params.agent.get(params.path);
    for (const [key, value] of Object.entries(params.headers ?? {})) {
      req.set(key, value);
    }

    req
      .buffer(false)
      .parse((res, callback) => {
        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          text += chunk;
          if (!params.stopWhen(text) || settled) {
            return;
          }

          settled = true;
          callback(null, text);
          res.destroy();
        });

        res.on("end", () => {
          if (settled) {
            return;
          }

          settled = true;
          callback(null, text);
        });

        res.on("error", (error) => {
          if (settled) {
            return;
          }

          settled = true;
          callback(error);
        });
      })
      .end((error, res) => {
        if (error && !settled) {
          reject(error);
          return;
        }

        resolve({
          text,
          headers: (res?.headers ?? {}) as Record<string, string>,
        });
      });
  });
}

describe("FT-32 integration: change notification stream", () => {
  it("rejects unauthenticated requests", async () => {
    await request(app)
      .get("/api/change-notifications/stream")
      .expect(401)
      .expect((res) => {
        expect(res.body.code).toBe("UNAUTHORIZED");
      });
  });

  it("allows READER to open the authenticated stream and sends the SSE handshake", async () => {
    const reader = await createRoleAgent("READER");

    const response = await readSseUntil({
      agent: reader,
      path: "/api/change-notifications/stream",
      stopWhen: (text) => text.includes(": connected"),
    });

    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("retry: 5000");
    expect(response.text).toContain(": connected");
  });

  it("replays only events newer than Last-Event-ID", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");

    const firstId = await insertJournalEntry({
      tableName: "customer",
      recordId: 1001,
      op: "update",
      actorUserId: 11,
      actorName: "Replay One",
      triggerKey: "customer.update",
      messageText: "first change",
      isRaw: false,
      contexts: [{ contextTable: "customer", contextId: 1001, relationRole: "self" }],
    });

    const secondId = await insertJournalEntry({
      tableName: "project",
      recordId: 2002,
      op: "update",
      actorUserId: 12,
      actorName: "Replay Two",
      triggerKey: "project.update",
      messageText: "second change",
      isRaw: false,
      contexts: [{ contextTable: "project", contextId: 2002, relationRole: "self" }],
    });

    const response = await readSseUntil({
      agent: dispatcher,
      path: "/api/change-notifications/stream",
      headers: {
        "Last-Event-ID": String(firstId),
      },
      stopWhen: (text) => text.includes(`id: ${secondId}`),
    });

    expect(response.text).toContain(`id: ${secondId}`);
    expect(response.text).toContain(`"id":${secondId}`);
    expect(response.text).not.toContain(`id: ${firstId}`);
    expect(response.text).not.toContain(`"id":${firstId}`);
  });
});
