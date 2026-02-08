import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../server/db";
import {
  appointments,
  projectAttachments,
  projects,
  seedRunEntities,
  seedRuns,
} from "../shared/schema";
import { createSeedRun, purgeSeedRun } from "../server/services/demoSeedService";

type EntityType = "project" | "appointment_mount" | "appointment_rekl" | "project_attachment";

function daysBetween(dateA: Date, dateB: Date) {
  const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
  const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

async function main() {
  console.log("[verify-demo-seed] start");
  const config = {
    employees: 12,
    customers: 8,
    projects: 8,
    appointmentsPerProject: 1,
    generateAttachments: true,
    randomSeed: 424242,
    seedWindowDaysMin: 60,
    seedWindowDaysMax: 90,
    reklDelayDaysMin: 14,
    reklDelayDaysMax: 42,
    reklShare: 0.5,
    locale: "de",
  };

  console.log("[verify-demo-seed] createSeedRun begin");
  const summary = await createSeedRun(config);
  const seedRunId = summary.seedRunId;
  console.log("[verify-demo-seed] created", {
    seedRunId,
    created: summary.created,
    reductions: summary.reductions,
    warnings: summary.warnings.length,
  });

  try {
    const entities = await db
      .select({
        entityType: seedRunEntities.entityType,
        entityId: seedRunEntities.entityId,
      })
      .from(seedRunEntities)
      .where(eq(seedRunEntities.seedRunId, seedRunId));

    const idsByType = new Map<EntityType, number[]>();
    for (const entity of entities) {
      const key = entity.entityType as EntityType;
      if (!idsByType.has(key)) idsByType.set(key, []);
      idsByType.get(key)!.push(Number(entity.entityId));
    }

    const projectIds = idsByType.get("project") ?? [];
    const mountIds = idsByType.get("appointment_mount") ?? [];
    const reklIds = idsByType.get("appointment_rekl") ?? [];
    const attachmentIds = idsByType.get("project_attachment") ?? [];

    assert.ok(projectIds.length > 0, "no seeded projects tracked");
    assert.equal(
      mountIds.length,
      projectIds.length,
      "each seeded project must have exactly one mount appointment",
    );

    const mountRows =
      mountIds.length === 0
        ? []
        : await db
            .select({
              id: appointments.id,
              projectId: appointments.projectId,
              title: appointments.title,
              startDate: appointments.startDate,
            })
            .from(appointments)
            .where(inArray(appointments.id, mountIds));

    const mountByProject = new Map<number, (typeof mountRows)[number]>();
    for (const mount of mountRows) {
      const projectId = Number(mount.projectId);
      assert.ok(
        !mountByProject.has(projectId),
        `project ${projectId} has more than one mount appointment`,
      );
      mountByProject.set(projectId, mount);
    }
    for (const projectId of projectIds) {
      assert.ok(mountByProject.has(projectId), `project ${projectId} has no mount appointment`);
    }

    const reklRows =
      reklIds.length === 0
        ? []
        : await db
            .select({
              id: appointments.id,
              projectId: appointments.projectId,
              title: appointments.title,
              startDate: appointments.startDate,
            })
            .from(appointments)
            .where(inArray(appointments.id, reklIds));

    const projectRows = await db
      .select({
        id: projects.id,
        descriptionMd: projects.descriptionMd,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    const projectById = new Map(projectRows.map((row) => [Number(row.id), row]));

    for (const rekl of reklRows) {
      const projectId = Number(rekl.projectId);
      assert.ok(projectById.has(projectId), "rekl must be project-bound to seeded project");
      assert.ok(rekl.title.startsWith("Rekl."), `rekl title prefix invalid: ${rekl.title}`);

      const mount = mountByProject.get(projectId);
      assert.ok(mount, `missing mount for rekl project ${projectId}`);
      const diff = daysBetween(mount!.startDate as Date, rekl.startDate as Date);
      assert.ok(diff >= config.reklDelayDaysMin, `rekl delay below min for project ${projectId}`);
      assert.ok(diff <= config.reklDelayDaysMax, `rekl delay above max for project ${projectId}`);

      const ovenName = rekl.title.replace(/^Rekl\.\s*/i, "").trim();
      if (ovenName.length > 0) {
        const description = projectById.get(projectId)?.descriptionMd ?? "";
        assert.ok(
          description.includes(ovenName),
          `project ${projectId} description does not contain rekl oven '${ovenName}'`,
        );
      }
    }

    const attachmentRows =
      attachmentIds.length === 0
        ? []
        : await db
            .select({
              id: projectAttachments.id,
              storagePath: projectAttachments.storagePath,
            })
            .from(projectAttachments)
            .where(inArray(projectAttachments.id, attachmentIds));

    const attachmentPaths = attachmentRows.map((row) => path.resolve(row.storagePath));
    for (const p of attachmentPaths) {
      assert.ok(fs.existsSync(p), `attachment file missing before purge: ${p}`);
    }

    const purge1 = await purgeSeedRun(seedRunId);
    assert.equal(purge1.noOp, false, "first purge should not be noOp");

    const [runAfterPurge] = await db
      .select({ id: seedRuns.id })
      .from(seedRuns)
      .where(eq(seedRuns.id, seedRunId));
    assert.equal(runAfterPurge, undefined, "seed_run row still exists after purge");

    const mappingAfterPurge = await db
      .select({ seedRunId: seedRunEntities.seedRunId })
      .from(seedRunEntities)
      .where(eq(seedRunEntities.seedRunId, seedRunId));
    assert.equal(mappingAfterPurge.length, 0, "seed_run_entity rows still exist after purge");

    if (attachmentIds.length > 0) {
      const attachmentRowsAfter = await db
        .select({ id: projectAttachments.id })
        .from(projectAttachments)
        .where(inArray(projectAttachments.id, attachmentIds));
      assert.equal(attachmentRowsAfter.length, 0, "project attachment rows still exist after purge");
    }
    for (const p of attachmentPaths) {
      assert.equal(fs.existsSync(p), false, `attachment file still exists after purge: ${p}`);
    }

    const purge2 = await purgeSeedRun(seedRunId);
    assert.equal(purge2.noOp, true, "second purge must be idempotent noOp");

    console.log("[verify-demo-seed] all assertions passed");
  } catch (error) {
    try {
      await purgeSeedRun(seedRunId);
    } catch {
      // Ignore cleanup errors to keep original assertion visible.
    }
    throw error;
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[verify-demo-seed] failed", error);
    process.exit(1);
  });
