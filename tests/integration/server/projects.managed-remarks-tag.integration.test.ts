import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";
import type { SuperAgentTest } from "supertest";

import * as customersService from "../../../server/services/customersService";
import * as tagRelationsService from "../../../server/services/tagRelationsService";
import { MANAGED_REMARKS_TAG_NAME } from "../../../shared/appointmentCancellation";
import { createApiTestApp, loginAdminAgent as loginAdminAgentBase } from "../../helpers/apiTestHarness";
import { applyTestSystemSeed } from "../../helpers/resetDatabase";

let app: express.Express;
let seq = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAdminAgentBase(app);
}

async function createCustomer(prefix: string) {
  const token = `${prefix}-${Date.now()}-${seq++}`;
  return customersService.createCustomer({
    customerNumber: token,
    firstName: "FT24",
    lastName: token,
    fullName: `${token}, FT24`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
}

function extractTagNames(body: unknown): string[] {
  return (body as Array<{ tag: { name: string } }>).map((item) => item.tag.name);
}

describe("Projects integration: managed remarks tag workflow", () => {
  it("sets Anmerkungen automatically when a new project is created with visible description", async () => {
    const admin = await loginAdminAgent();
    await applyTestSystemSeed();
    const customer = await createCustomer("PRJ-REMARKS-CREATE");

    const created = await admin
      .post("/api/projects")
      .send({
        customerId: customer.id,
        name: "PRJ-REMARKS-CREATE",
        orderNumber: "ORD-PRJ-REMARKS-CREATE",
        descriptionMd: "<p>Sichtbare Projektbeschreibung</p>",
      })
      .expect(201);

    await admin.get(`/api/projects/${created.body.id}/tags`).expect(200).expect(({ body }) => {
      expect(extractTagNames(body)).toContain(MANAGED_REMARKS_TAG_NAME);
    });
  });

  it("sets Anmerkungen automatically when an existing project receives visible description content", async () => {
    const admin = await loginAdminAgent();
    await applyTestSystemSeed();
    const customer = await createCustomer("PRJ-REMARKS-UPDATE");

    const created = await admin
      .post("/api/projects")
      .send({
        customerId: customer.id,
        name: "PRJ-REMARKS-UPDATE",
        orderNumber: "ORD-PRJ-REMARKS-UPDATE",
        descriptionMd: null,
      })
      .expect(201);

    await admin
      .patch(`/api/projects/${created.body.id}`)
      .send({
        version: created.body.version,
        descriptionMd: "<p>Nachträglich gepflegte Beschreibung</p>",
      })
      .expect(200);

    await admin.get(`/api/projects/${created.body.id}/tags`).expect(200).expect(({ body }) => {
      expect(extractTagNames(body)).toContain(MANAGED_REMARKS_TAG_NAME);
    });
  });

  it("keeps the generic project tag endpoint protected for the managed Anmerkungen tag", async () => {
    const admin = await loginAdminAgent();
    await applyTestSystemSeed();
    const customer = await createCustomer("PRJ-REMARKS-PROTECT");
    const remarksTag = await tagRelationsService.getTagByName(MANAGED_REMARKS_TAG_NAME);
    expect(remarksTag?.id).toBeTruthy();

    const created = await admin
      .post("/api/projects")
      .send({
        customerId: customer.id,
        name: "PRJ-REMARKS-PROTECT",
        orderNumber: "ORD-PRJ-REMARKS-PROTECT",
        descriptionMd: null,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${created.body.id}/tags`)
      .send({ tagId: remarksTag!.id })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("WORKFLOW_TAG_PROTECTED");
      });
  });
});
