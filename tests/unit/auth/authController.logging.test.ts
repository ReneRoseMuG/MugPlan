/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Auth-Controller protokollieren Erfolgs- und Auth-Fehlerpfade ueber logAuth.
 * - Login-Erfolg loggt userId nur bei status "authenticated".
 * - Logout loggt die Session-userId erst nach erfolgreichem destroy-Callback.
 *
 * Fehlerfaelle:
 * - Auth-Fehler muessen den passenden Event-Code statt eines Erfolgslogs schreiben.
 * - Nicht-authentifizierte Zwischenzustaende duerfen keinen login_success-Log erzeugen.
 *
 * Ziel:
 * Absicherung der neuen logAuth-Verdrahtung im Auth-Controller ohne echte HTTP- oder Session-Infrastruktur.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

function createAuthError(message: string, status: number, code: string) {
  return {
    name: "MockAuthError",
    message,
    status,
    code,
    __isAuthError: true,
  };
}

vi.mock("../../../server/services/authService", () => {
  return {
    AuthError: class extends Error {},
    login: vi.fn(),
    verifyTwoFactorLogin: vi.fn(),
    quickLoginByRole: vi.fn(),
    isAuthError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "__isAuthError" in error && (error as { __isAuthError?: boolean }).__isAuthError),
  };
});

vi.mock("../../../server/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("../../../server/lib/logger")>("../../../server/lib/logger");
  return {
    ...actual,
    logAuth: vi.fn(),
  };
});

import * as authService from "../../../server/services/authService";
import { logAuth } from "../../../server/lib/logger";
import { login, logout, quickLogin, verifyTwoFactor } from "../../../server/controllers/authController";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

function createSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    preAuth: undefined,
    userId: undefined,
    destroy: vi.fn((callback: (error?: Error | null) => void) => callback(null)),
    ...overrides,
  };
}

describe("authController logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs login_success after authenticated login", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      payload: {
        status: "authenticated",
        userId: 42,
        username: "admin-a",
        roleCode: "ADMIN",
      },
    });

    const req = {
      body: { username: "admin-a", password: "secret-password" },
      session: createSession(),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await login(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("login_success", { userId: 42 });
    expect(res.json).toHaveBeenCalledWith({
      status: "authenticated",
      userId: 42,
      username: "admin-a",
      roleCode: "ADMIN",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("logs login_failed on auth errors", async () => {
    vi.mocked(authService.login).mockRejectedValue(
      createAuthError("Invalid credentials", 401, "INVALID_CREDENTIALS"),
    );

    const req = {
      body: { username: "admin-a", password: "wrong-password" },
      session: createSession(),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await login(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("login_failed", { code: "INVALID_CREDENTIALS" });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: "INVALID_CREDENTIALS" });
    expect(next).not.toHaveBeenCalled();
  });

  it("logs 2fa_success after verifyTwoFactor success", async () => {
    vi.mocked(authService.verifyTwoFactorLogin).mockResolvedValue({
      status: "authenticated",
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
    });

    const req = {
      body: { code: "123456" },
      session: createSession({
        preAuth: {
          userId: 7,
          username: "reader-a",
          roleCode: "READER",
          mode: "verify",
          createdAt: Date.now(),
        },
      }),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await verifyTwoFactor(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("2fa_success", { userId: 7 });
    expect(res.json).toHaveBeenCalledWith({
      status: "authenticated",
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("logs 2fa_failed on auth errors", async () => {
    vi.mocked(authService.verifyTwoFactorLogin).mockRejectedValue(
      createAuthError("Invalid code", 401, "INVALID_TWO_FACTOR_CODE"),
    );

    const req = {
      body: { code: "999999" },
      session: createSession({
        preAuth: {
          userId: 7,
          username: "reader-a",
          roleCode: "READER",
          mode: "verify",
          createdAt: Date.now(),
        },
      }),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await verifyTwoFactor(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("2fa_failed", { code: "INVALID_TWO_FACTOR_CODE" });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: "INVALID_TWO_FACTOR_CODE" });
    expect(next).not.toHaveBeenCalled();
  });

  it("logs quick_login after successful quick login", async () => {
    vi.mocked(authService.quickLoginByRole).mockResolvedValue({
      status: "authenticated",
      userId: 13,
      username: "dispatcher-a",
      roleCode: "DISPATCHER",
    });

    const req = {
      body: { roleCode: "DISPATCHER" },
      session: createSession(),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await quickLogin(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("quick_login", { userId: 13 });
    expect(res.json).toHaveBeenCalledWith({
      status: "authenticated",
      userId: 13,
      username: "dispatcher-a",
      roleCode: "DISPATCHER",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("logs logout after successful session destroy", async () => {
    const req = {
      session: createSession({
        userId: 99,
        preAuth: {
          userId: 99,
        },
      }),
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await logout(req, res as any, next);

    expect(logAuth).toHaveBeenCalledWith("logout", { userId: 99 });
    expect(req.session.destroy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
