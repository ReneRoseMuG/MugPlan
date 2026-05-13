/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kundenanlage ist serverseitig auf ADMIN und DISPONENT begrenzt.
 * - Kundendatenänderung ist serverseitig auf ADMIN und DISPONENT begrenzt.
 * - LESER darf auch per direktem API-Aufruf keinen Kunden anlegen.
 * - Ohne Session bleibt die Kundenanlage gesperrt.
 */
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let seq = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const suffix = `customer-create-${roleCode.toLowerCase()}-${Date.now()}-${seq++}`;
  const password = `${suffix}-password`;
  const passwordHash = await hashPassword(password);

  await createUser({
    username: suffix,
    email: `${suffix}@example.test`,
    firstName: roleCode,
    lastName: "CustomerCreate",
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: suffix, password }).expect(200);
  return agent;
}

function customerPayload(prefix: string) {
  return {
    customerNumber: `${prefix}-${Date.now()}-${seq++}`,
    company: `${prefix} Testkunde`,
  };
}

describe("integration: customer create role guard", () => {
  it("allows admin and dispatcher but rejects reader and anonymous requests", async () => {
    await request(app)
      .post("/api/customers")
      .send(customerPayload("ANON"))
      .expect(401);

    const admin = await loginAdminAgent(app);
    await admin
      .post("/api/customers")
      .send(customerPayload("ADMIN"))
      .expect(201)
      .expect(({ body }) => {
        expect(body.customerNumber).toContain("ADMIN");
      });

    const dispatcher = await loginRoleAgent("DISPATCHER");
    await dispatcher
      .post("/api/customers")
      .send(customerPayload("DISP"))
      .expect(201)
      .expect(({ body }) => {
        expect(body.customerNumber).toContain("DISP");
      });

    const customerForUpdate = await admin
      .post("/api/customers")
      .send(customerPayload("PATCH"))
      .expect(201)
      .then((response) => response.body);

    const patchedByDispatcher = await dispatcher
      .patch(`/api/customers/${customerForUpdate.id}`)
      .send({ firstName: "Ergänzt", version: customerForUpdate.version })
      .expect(200)
      .then((response) => response.body);
    expect(patchedByDispatcher.firstName).toBe("Ergänzt");

    const reader = await loginRoleAgent("READER");
    await reader
      .post("/api/customers")
      .send(customerPayload("READ"))
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });

    await reader
      .patch(`/api/customers/${customerForUpdate.id}`)
      .send({ lastName: "Nicht erlaubt", version: patchedByDispatcher.version })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });

    await request(app)
      .patch(`/api/customers/${customerForUpdate.id}`)
      .send({ lastName: "Anonym", version: patchedByDispatcher.version })
      .expect(401);
  });
});
