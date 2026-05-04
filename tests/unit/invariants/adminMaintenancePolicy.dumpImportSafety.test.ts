/**
 * Test Scope:
 *
 * Feature: PKG-02 - Admin Maintenance Policy
 *
 * Abgedeckte Regeln:
 * - Der Produktionspfad fuer `POST /admin/dumps/import/apply` nutzt die normale DB-/Host-Allowlist statt des globalen Production-Blocks fuer destruktive Admin-Aktionen.
 * - Andere Admin-Write-Endpunkte laufen weiterhin ohne den destruktiven Production-Block durch die Middleware.
 * - Unsichere Produktionsziele werden auch fuer den Dump-Import weiter abgelehnt.
 *
 * Fehlerfaelle:
 * - Produktions-Import wird trotz sicherem Ziel durch den falschen Guard blockiert.
 * - Normale Admin-Write-Endpunkte werden faelschlich wie destruktive Operationen geblockt.
 * - Produktions-Import laeuft gegen ein nicht allowlist-konformes Ziel.
 *
 * Ziel:
 * Die Sonderfreigabe fuer den produktiven Dump-Import absichern, ohne die uebrigen Production-Guards aufzuweichen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type ResponseMock = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createResponse(): ResponseMock {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } satisfies ResponseMock;
  response.status.mockReturnValue(response);
  return response;
}

describe("PKG-02 Invariant: admin maintenance policy dump import safety", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows production dump import apply when the target matches the production allowlist", async () => {
    const assertSafeAdminDestructiveOperationTarget = vi.fn();
    const assertSafeDatabaseTargetForMode = vi.fn(() => ({
      dbName: "mysql_rvtagh",
      host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
      port: 3306,
    }));

    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeAdminDestructiveOperationTarget,
      assertSafeDatabaseTargetForMode,
      parseDatabaseLogInfo: vi.fn(() => ({
        dbName: "mysql_rvtagh",
        host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
        port: 3306,
      })),
    }));
    vi.doMock("../../../server/lib/logger", () => ({
      logWarn: vi.fn(),
    }));

    const { enforceAdminMaintenancePolicy } = await import("../../../server/middleware/adminMaintenancePolicy");
    const req = {
      method: "POST",
      path: "/admin/dumps/import/apply",
      userContext: { roleKey: "ADMIN" },
    };
    const res = createResponse();
    const next = vi.fn();

    enforceAdminMaintenancePolicy(req as never, res as never, next);

    expect(assertSafeDatabaseTargetForMode).toHaveBeenCalledTimes(1);
    expect(assertSafeAdminDestructiveOperationTarget).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows production correction workflow apply when the target matches the production allowlist", async () => {
    const assertSafeAdminDestructiveOperationTarget = vi.fn();
    const assertSafeDatabaseTargetForMode = vi.fn(() => ({
      dbName: "mysql_rvtagh",
      host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
      port: 3306,
    }));

    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeAdminDestructiveOperationTarget,
      assertSafeDatabaseTargetForMode,
      parseDatabaseLogInfo: vi.fn(() => ({
        dbName: "mysql_rvtagh",
        host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
        port: 3306,
      })),
    }));
    vi.doMock("../../../server/lib/logger", () => ({
      logWarn: vi.fn(),
    }));

    const { enforceAdminMaintenancePolicy } = await import("../../../server/middleware/adminMaintenancePolicy");
    const req = {
      method: "POST",
      path: "/admin/correction-workflows/sauna-project-title/apply",
      userContext: { roleKey: "ADMIN" },
    };
    const res = createResponse();
    const next = vi.fn();

    enforceAdminMaintenancePolicy(req as never, res as never, next);

    expect(assertSafeDatabaseTargetForMode).toHaveBeenCalledTimes(1);
    expect(assertSafeAdminDestructiveOperationTarget).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows other admin write endpoints to continue through the middleware in production", async () => {
    const assertSafeAdminDestructiveOperationTarget = vi.fn();
    const assertSafeDatabaseTargetForMode = vi.fn();

    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@mysql-rvtagh.pg-s-h7zc2s.db.project.host:3306/mysql_rvtagh",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeAdminDestructiveOperationTarget,
      assertSafeDatabaseTargetForMode,
      parseDatabaseLogInfo: vi.fn(() => ({
        dbName: "mysql_rvtagh",
        host: "mysql-rvtagh.pg-s-h7zc2s.db.project.host",
        port: 3306,
      })),
    }));
    vi.doMock("../../../server/lib/logger", () => ({
      logWarn: vi.fn(),
    }));

    const { enforceAdminMaintenancePolicy } = await import("../../../server/middleware/adminMaintenancePolicy");
    const req = {
      method: "POST",
      path: "/admin/dumps/create",
      userContext: { roleKey: "ADMIN" },
    };
    const res = createResponse();
    const next = vi.fn();

    enforceAdminMaintenancePolicy(req as never, res as never, next);

    expect(assertSafeAdminDestructiveOperationTarget).not.toHaveBeenCalled();
    expect(assertSafeDatabaseTargetForMode).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks production dump import apply when the target is not allowlist-safe", async () => {
    const assertSafeDatabaseTargetForMode = vi.fn(() => {
      throw new Error("Unsafe database target for mode 'production': db='other_db', host='db.example.com'.");
    });

    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@db.example.com:3306/other_db",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeAdminDestructiveOperationTarget: vi.fn(),
      assertSafeDatabaseTargetForMode,
      parseDatabaseLogInfo: vi.fn(() => ({
        dbName: "other_db",
        host: "db.example.com",
        port: 3306,
      })),
    }));
    vi.doMock("../../../server/lib/logger", () => ({
      logWarn: vi.fn(),
    }));

    const { enforceAdminMaintenancePolicy } = await import("../../../server/middleware/adminMaintenancePolicy");
    const req = {
      method: "POST",
      path: "/admin/dumps/import/apply",
      userContext: { roleKey: "ADMIN" },
    };
    const res = createResponse();
    const next = vi.fn();

    enforceAdminMaintenancePolicy(req as never, res as never, next);

    expect(assertSafeDatabaseTargetForMode).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: "UNSAFE_DATABASE_TARGET" });
  });

  it("blocks production correction workflow apply when the target is not allowlist-safe", async () => {
    const assertSafeDatabaseTargetForMode = vi.fn(() => {
      throw new Error("Unsafe database target for mode 'production': db='other_db', host='db.example.com'.");
    });

    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "production"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@db.example.com:3306/other_db",
        allowedDatabases: ["mysql_rvtagh"],
        allowedHosts: ["mysql-rvtagh.pg-s-h7zc2s.db.project.host"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeAdminDestructiveOperationTarget: vi.fn(),
      assertSafeDatabaseTargetForMode,
      parseDatabaseLogInfo: vi.fn(() => ({
        dbName: "other_db",
        host: "db.example.com",
        port: 3306,
      })),
    }));
    vi.doMock("../../../server/lib/logger", () => ({
      logWarn: vi.fn(),
    }));

    const { enforceAdminMaintenancePolicy } = await import("../../../server/middleware/adminMaintenancePolicy");
    const req = {
      method: "POST",
      path: "/admin/correction-workflows/sauna-project-title/apply",
      userContext: { roleKey: "ADMIN" },
    };
    const res = createResponse();
    const next = vi.fn();

    enforceAdminMaintenancePolicy(req as never, res as never, next);

    expect(assertSafeDatabaseTargetForMode).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: "UNSAFE_DATABASE_TARGET" });
  });
});
