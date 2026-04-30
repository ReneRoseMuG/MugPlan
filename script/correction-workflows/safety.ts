import path from "path";
import mysql from "mysql2/promise";
import {
  getRuntimeConfig,
  getRuntimeMode,
  initializeRuntimeEnv,
} from "../../server/config/runtimeEnv";
import {
  assertSafeDatabaseTargetForMode,
  assertSafeDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
} from "../../server/security/dbSafetyGuards";
import type { CorrectionWorkflowDefinition, WorkflowExecutionContext, WorkflowRunOptions } from "./types";
import { assertWorkflowDefinitionValid } from "./validation";

function buildRunId(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

export async function openWorkflowExecutionContext(
  workflow: CorrectionWorkflowDefinition,
  options?: WorkflowRunOptions,
): Promise<WorkflowExecutionContext> {
  assertWorkflowDefinitionValid(workflow);
  const now = options?.now ?? new Date();
  const runtimeConfig = initializeRuntimeEnv();
  const runtimeMode = getRuntimeMode();

  if (runtimeMode === "production") {
    throw new Error("Correction workflows are blocked in production.");
  }
  if (!workflow.allowedRuntimeModes.includes(runtimeMode)) {
    throw new Error(
      `Workflow '${workflow.id}' is not allowed in runtime mode '${runtimeMode}'. Allowed: ${workflow.allowedRuntimeModes.join(", ")}.`,
    );
  }

  const target = runtimeMode === "test"
    ? assertSafeDestructiveOperationTarget({
        mode: runtimeMode,
        databaseUrl: runtimeConfig.mysqlDatabaseUrl,
        allowedDatabases: runtimeConfig.allowedDatabases,
        allowedHosts: runtimeConfig.allowedHosts,
      })
    : assertSafeDatabaseTargetForMode(
        runtimeConfig.mysqlDatabaseUrl,
        runtimeMode,
        runtimeConfig.allowedDatabases,
        runtimeConfig.allowedHosts,
      );

  const connection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  try {
    await assertSqlDatabaseIdentity(connection, target.dbName);
  } catch (error) {
    await connection.end();
    throw error;
  }

  return {
    connection,
    runtimeMode,
    runtimeConfig: getRuntimeConfig(),
    target,
    outputDir: path.resolve(options?.outputDir ?? path.join(process.cwd(), "logs")),
    runId: options?.runId?.trim() || buildRunId(now),
    startedAt: now.toISOString(),
  };
}

