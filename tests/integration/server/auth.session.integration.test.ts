/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Session-Status liefert bei bestehender Session den aktuellen Auth-Kontext zurück.
 * - Ohne Session liefert der Session-Status kontrolliert 401.
 *
 * Fehlerfälle:
 * - Neue Tabs können den bestehenden Login-Kontext nicht wiederherstellen.
 * - Ungültige oder fehlende Session wird fälschlich als authentifiziert behandelt.
 *
 * Ziel:
 * Den serverseitigen Session-Status-Endpunkt als Grundlage für tabfähige Login-Übernahme absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("auth session status", () => {
  it("returns the authenticated user for an existing session", async () => {
    const agent = await loginAdminAgent(app);

    const response = await agent.get("/api/auth/session").expect(200);

    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body).toMatchObject({
      status: "authenticated",
      username: "test-admin",
      roleCode: "ADMIN",
    });
    expect(response.body.userId).toEqual(expect.any(Number));
  });

  it("returns 401 without an authenticated session", async () => {
    await request(app)
      .get("/api/auth/session")
      .expect(401, {
        code: "UNAUTHORIZED",
      })
      .expect((res) => {
        expect(res.headers["cache-control"]).toContain("no-store");
      });
  });
});
