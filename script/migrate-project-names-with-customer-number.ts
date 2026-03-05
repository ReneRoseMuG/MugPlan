import { eq, sql } from "drizzle-orm";
import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { db } from "../server/db";
import { projects } from "../shared/schema";
import { decideProjectNameMigration, type Decision, type ProjectRow } from "./project-name-migration";

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const dryRunExplicit = argv.includes("--dry-run");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  return {
    apply,
    dryRun: !apply || dryRunExplicit,
    limit: Number.isInteger(limit) && (limit as number) > 0 ? (limit as number) : null,
  };
}

async function loadRows(limit: number | null): Promise<ProjectRow[]> {
  const limitSql = limit ? sql` limit ${limit}` : sql``;
  const result = await db.execute(sql`
    select
      p.id as projectId,
      p.name as currentName,
      c.customer_number as customerNumber
    from project p
    inner join customer c on c.id = p.customer_id
    order by p.id
    ${limitSql}
  `);
  return result as unknown as ProjectRow[];
}

async function applyUpdates(decisions: Decision[]): Promise<number> {
  let updated = 0;
  for (const decision of decisions) {
    if (decision.kind !== "update") continue;
    const result = await db
      .update(projects)
      .set({ name: decision.to })
      .where(eq(projects.id, decision.projectId));
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows > 0) {
      updated += 1;
    }
  }
  return updated;
}

async function main() {
  initializeRuntimeEnv();
  const args = parseArgs(process.argv.slice(2));
  const rows = await loadRows(args.limit);
  const decisions = rows.map(decideProjectNameMigration);
  const updates = decisions.filter((entry): entry is Extract<Decision, { kind: "update" }> => entry.kind === "update");
  const skips = decisions.filter((entry): entry is Extract<Decision, { kind: "skip" }> => entry.kind === "skip");

  const skipReasonCounts = skips.reduce<Record<string, number>>((acc, skip) => {
    acc[skip.reason] = (acc[skip.reason] ?? 0) + 1;
    return acc;
  }, {});

  let appliedUpdates = 0;
  if (args.apply) {
    appliedUpdates = await applyUpdates(decisions);
  }

  console.log("[migrate-project-names-with-customer-number] summary", {
    mode: args.apply ? "apply" : "dry-run",
    scanned: rows.length,
    matchedForUpdate: updates.length,
    appliedUpdates,
    skipped: skips.length,
    skipReasonCounts,
    suspicious: (skipReasonCounts.prefix_customer_number_mismatch ?? 0) + (skipReasonCounts.isolated_project_name_empty ?? 0),
    previewUpdates: updates.slice(0, 10),
    previewSkips: skips.slice(0, 10),
  });
}

main().catch((error) => {
  console.error("[migrate-project-names-with-customer-number] failed", error);
  process.exit(1);
});
