import fs from "fs/promises";
import os from "os";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import { db } from "../../../server/db";
import { projects } from "../../../shared/schema";
import { applyCorrectionWorkflow, previewCorrectionWorkflow } from "../../../script/correction-workflows/engine";
import { normalizeDatabaseValue } from "../../../script/correction-workflows/json";
import type { CorrectionWorkflowDefinition, WorkflowExecutionContext } from "../../../script/correction-workflows/types";
import { nextDeterministicToken, resetDeterministicTokens } from "../../helpers/deterministic";

const tempRoot = path.join(os.tmpdir(), "mugplan-correction-workflow-tests");

async function createProjectFixture(initialName: string) {
  const token = nextDeterministicToken("correction-workflow");
  const customer = await customersService.createCustomer({
    customerNumber: `CW-${token}`,
    firstName: "Test",
    lastName: `Correction-${token}`,
    fullName: `Correction-${token}, Test`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  return projectsService.createProject({
    name: initialName,
    customerId: customer.id,
    orderNumber: `CW-ORD-${token}`,
    descriptionMd: null,
    version: 1,
  });
}

async function loadProjectRow(projectId: number) {
  const result = await db.execute(sql`
    select
      id,
      name,
      version,
      updated_at,
      description_md
    from project
    where id = ${projectId}
    limit 1
  `);
  const rows =
    ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? null)
    ?? ((result as unknown as Array<Record<string, unknown>> | [Array<Record<string, unknown>>])[0] as Array<Record<string, unknown>> | undefined)
    ?? [];
  const row = rows[0];
  if (!row) {
    throw new Error(`Project ${projectId} not found.`);
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    version: Number(row.version),
    updated_at: normalizeDatabaseValue(row.updated_at),
    description_md: normalizeDatabaseValue(row.description_md),
  };
}

function createRenameWorkflow(
  projectId: number,
  targetName: string,
  allowedChangedFields: string[],
  extraSet: Record<string, string | number | boolean | null> = {},
): CorrectionWorkflowDefinition {
  return {
    id: "test-project-name-correction",
    title: "Test Projektnamen-Korrektur",
    allowedRuntimeModes: ["test"],
    async discoverCandidates(_ctx: WorkflowExecutionContext) {
      const row = await loadProjectRow(projectId);
      if (row.name === targetName) {
        return [
          {
            candidateId: `project-${projectId}`,
            status: "already_ok",
            label: `Projekt ${projectId}`,
            message: "Projektname ist bereits korrekt.",
          },
        ];
      }

      return [
        {
          candidateId: `project-${projectId}`,
          status: "actionable",
          label: `Projekt ${projectId} | ${row.name} -> ${targetName}`,
          snapshotRows: [
            {
              table: "project",
              key: { id: projectId },
              data: {
                name: row.name,
                version: row.version,
                updated_at: row.updated_at,
              },
            },
          ],
          mutationPlans: [
            {
              table: "project",
              key: { id: projectId },
              set: {
                name: targetName,
                ...extraSet,
              },
              allowedChangedFields,
            },
          ],
        },
      ];
    },
  };
}

async function makeOutputDir(testName: string): Promise<string> {
  const dir = path.join(tempRoot, testName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase());
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

describe("correction workflow engine integration", () => {
  beforeEach(() => {
    resetDeterministicTokens("correction-workflow");
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("creates preview artifacts and applies exactly the expected mutation", async () => {
    const project = await createProjectFixture("Alter Name");
    const outputDir = await makeOutputDir("apply-success");
    const workflow = createRenameWorkflow(project.id, "Neuer Name", ["name", "updated_at"]);

    const preview = await previewCorrectionWorkflow(workflow, { outputDir });
    expect(preview.manifest.summary.actionable).toBe(1);
    expect(preview.paths.manifestPath).toContain("_manifest.json");
    expect(preview.paths.previewReportPath).toContain("_preview.md");

    const applyResult = await applyCorrectionWorkflow(workflow, preview.paths.manifestPath, { outputDir });
    expect(applyResult.summary.applied).toBe(1);
    expect(applyResult.verificationPassed).toBe(true);

    const refreshedProject = await loadProjectRow(project.id);
    expect(refreshedProject.name).toBe("Neuer Name");
  });

  it("skips apply when the frozen candidate drifted after preview", async () => {
    const project = await createProjectFixture("Ausgangsname");
    const outputDir = await makeOutputDir("apply-drift");
    const workflow = createRenameWorkflow(project.id, "Zielname", ["name", "updated_at"]);

    const preview = await previewCorrectionWorkflow(workflow, { outputDir });

    await db
      .update(projects)
      .set({ name: "Zwischenname" })
      .where(eq(projects.id, project.id));

    const applyResult = await applyCorrectionWorkflow(workflow, preview.paths.manifestPath, { outputDir });
    expect(applyResult.summary.skippedDueToDrift).toBe(1);
    expect(applyResult.summary.applied).toBe(0);

    const refreshedProject = await loadProjectRow(project.id);
    expect(refreshedProject.name).toBe("Zwischenname");
  });

  it("rolls back when verification detects a non-allowed technical field change", async () => {
    const project = await createProjectFixture("Rollback Name");
    const outputDir = await makeOutputDir("verification-rollback");
    const workflow = createRenameWorkflow(project.id, "Soll Nicht Bleiben", ["name"]);

    const preview = await previewCorrectionWorkflow(workflow, { outputDir });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const applyResult = await applyCorrectionWorkflow(workflow, preview.paths.manifestPath, { outputDir });

    expect(applyResult.summary.failedVerification).toBe(1);
    expect(applyResult.verificationPassed).toBe(false);

    const refreshedProject = await loadProjectRow(project.id);
    expect(refreshedProject.name).toBe("Rollback Name");
  });
});
