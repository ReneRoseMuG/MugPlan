import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CorrectionWorkflowDefinition } from "../../../script/correction-workflows/types";

function createWorkflow(allowedRuntimeModes: CorrectionWorkflowDefinition["allowedRuntimeModes"]): CorrectionWorkflowDefinition {
  return {
    id: "test-workflow",
    title: "Test Workflow",
    allowedRuntimeModes,
    discoverCandidates: async () => [],
  };
}

describe("correction workflow safety unit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows production only through an explicitly allowed workflow runtime mode", async () => {
    const connection = {
      end: vi.fn(),
    };
    const createConnection = vi.fn(async () => connection);
    const assertSafeDatabaseTargetForMode = vi.fn(() => ({
      dbName: "mysql_rvtagh",
      host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
      port: 3306,
    }));
    const assertSafeDestructiveOperationTarget = vi.fn();
    const assertSqlDatabaseIdentity = vi.fn(async () => undefined);

    vi.doMock("mysql2/promise", () => ({
      default: { createConnection },
      createConnection,
    }));
    vi.doMock("../../../server/config/runtimeEnv", () => ({
      initializeRuntimeEnv: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeDatabaseTargetForMode,
      assertSafeDestructiveOperationTarget,
      assertSqlDatabaseIdentity,
    }));

    const { openWorkflowExecutionContext } = await import("../../../script/correction-workflows/safety");

    const context = await openWorkflowExecutionContext(
      createWorkflow(["development", "test", "production"]),
      { runId: "unit-run", now: new Date("2026-05-04T10:00:00.000Z") },
    );

    expect(context.runtimeMode).toBe("production");
    expect(context.runId).toBe("unit-run");
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(assertSafeDatabaseTargetForMode).toHaveBeenCalledTimes(1);
    expect(assertSafeDestructiveOperationTarget).not.toHaveBeenCalled();
    expect(assertSqlDatabaseIdentity).toHaveBeenCalledWith(connection, "mysql_rvtagh");
  });

  it("blocks production before opening a connection when the workflow does not allow production", async () => {
    const createConnection = vi.fn();

    vi.doMock("mysql2/promise", () => ({
      default: { createConnection },
      createConnection,
    }));
    vi.doMock("../../../server/config/runtimeEnv", () => ({
      initializeRuntimeEnv: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeDatabaseTargetForMode: vi.fn(),
      assertSafeDestructiveOperationTarget: vi.fn(),
      assertSqlDatabaseIdentity: vi.fn(),
    }));

    const { openWorkflowExecutionContext } = await import("../../../script/correction-workflows/safety");

    await expect(openWorkflowExecutionContext(createWorkflow(["development", "test"]))).rejects.toThrow(
      "is not allowed in runtime mode 'production'",
    );
    expect(createConnection).not.toHaveBeenCalled();
  });
});
