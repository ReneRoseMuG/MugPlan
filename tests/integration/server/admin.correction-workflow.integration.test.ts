/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Sauna-Projekttitel-Migration ist serverseitig ADMIN-only.
 * - Preview liefert Ausgangsmenge, Ergebnismenge und Kandidatendetails.
 * - Apply nutzt das Preview-Manifest und setzt nur den Projektnamen auf das Sauna-Modell.
 *
 * Fehlerfälle:
 * - Nicht-Admin darf Preview und Apply nicht direkt ausführen.
 * - Apply mit abweichendem Manifest-Hash wird blockiert.
 *
 * Ziel:
 * Den Admin-API-Vertrag der einmaligen Korrekturworkflow-Anbindung absichern.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { nextDeterministicToken, resetDeterministicTokens } from "../../helpers/deterministic";
import { hashPassword } from "../../../server/security/passwordHash";
import { createUser } from "../../../server/repositories/usersRepository";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as masterDataRepository from "../../../server/repositories/masterDataRepository";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let tempOutputDir: string;
let userCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(async () => {
  resetDeterministicTokens("admin-correction-workflow");
  tempOutputDir = path.join(os.tmpdir(), `mugplan-admin-correction-workflow-${process.pid}-${Date.now()}`);
  await fs.mkdir(tempOutputDir, { recursive: true });
  process.env.CORRECTION_WORKFLOW_OUTPUT_DIR = tempOutputDir;
});

afterEach(async () => {
  delete process.env.CORRECTION_WORKFLOW_OUTPUT_DIR;
  await fs.rm(tempOutputDir, { recursive: true, force: true });
});

async function createReaderAgent() {
  const suffix = `correction-workflow-reader-${userCounter++}`;
  const password = `${suffix}-password`;
  const passwordHash = await hashPassword(password);

  await createUser({
    username: suffix,
    email: `${suffix}@example.test`,
    firstName: "Reader",
    lastName: "CorrectionWorkflow",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: suffix, password }).expect(200);
  return agent;
}

async function createSaunaProjectFixture() {
  const token = nextDeterministicToken("admin-correction-workflow");
  const category = await masterDataRepository.createProductCategory({
    name: "Sauna Modell",
    isDefault: false,
    isActive: true,
    version: 1,
  });
  const product = await masterDataRepository.createProduct({
    name: `Sauna Ziel ${token}`,
    shortCode: null,
    categoryId: category.id,
    description: null,
    isActive: true,
    version: 1,
  });
  const customer = await customersService.createCustomer({
    customerNumber: `CW-${token}`,
    firstName: "Test",
    lastName: `Sauna-${token}`,
    fullName: `Sauna-${token}, Test`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  const orderNumber = `CW-ORD-${token}`;
  const project = await projectsService.createProject({
    name: `Alter Sauna Name ${token}`,
    customerId: customer.id,
    orderNumber,
    descriptionMd: null,
    version: 1,
  });
  await projectsService.createProjectOrderItem(project.id, {
    projectId: project.id,
    orderNumber,
    productId: product.id,
    componentId: null,
    quantity: 1,
    version: 1,
  });
  return { project, product, orderNumber };
}

describe("integration: admin correction workflow", () => {
  it("returns 403 for non-admin on preview and apply", async () => {
    const reader = await createReaderAgent();

    await reader
      .post("/api/admin/correction-workflows/sauna-project-title/preview")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });

    await reader
      .post("/api/admin/correction-workflows/sauna-project-title/apply")
      .send({ manifestPath: "logs/fake_manifest.json", manifestHash: "fake" })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("previews and applies the sauna project title migration", async () => {
    const { project, product, orderNumber } = await createSaunaProjectFixture();
    const admin = await loginAdminAgent(app);

    const preview = await admin
      .post("/api/admin/correction-workflows/sauna-project-title/preview")
      .expect(200);

    expect(preview.body.sourceCount).toBe(1);
    expect(preview.body.resultCount).toBe(1);
    expect(preview.body.summary).toMatchObject({ actionable: 1, already_ok: 0, ambiguous: 0, blocked: 0 });
    expect(preview.body.candidates).toEqual([
      expect.objectContaining({
        status: "actionable",
        projectId: project.id,
        orderNumber,
        currentName: project.name,
        targetName: product.name,
        saunaModel: product.name,
      }),
    ]);

    const apply = await admin
      .post("/api/admin/correction-workflows/sauna-project-title/apply")
      .send({
        manifestPath: preview.body.manifestPath,
        manifestHash: preview.body.manifestHash,
      })
      .expect(200);

    expect(apply.body.summary.applied).toBe(1);
    expect(apply.body.verificationPassed).toBe(true);
    expect(apply.body.candidateResults).toEqual([
      expect.objectContaining({ status: "applied" }),
    ]);

    const updatedProject = await projectsService.getProject(project.id);
    expect(updatedProject?.name).toBe(product.name);
  });

  it("blocks apply when the manifest hash differs from the preview", async () => {
    await createSaunaProjectFixture();
    const admin = await loginAdminAgent(app);
    const preview = await admin
      .post("/api/admin/correction-workflows/sauna-project-title/preview")
      .expect(200);

    await admin
      .post("/api/admin/correction-workflows/sauna-project-title/apply")
      .send({
        manifestPath: preview.body.manifestPath,
        manifestHash: "wrong-hash",
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("MANIFEST_HASH_MISMATCH");
      });
  });
});
