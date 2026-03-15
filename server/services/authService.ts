import * as usersRepository from "../repositories/usersRepository";
import { getBootstrapState } from "../bootstrap/getBootstrapState";
import { hashPassword, verifyPassword } from "../security/passwordHash";
import type { DbRoleCode } from "../settings/registry";
import { logError } from "../lib/logger";
import * as userSettingsService from "./userSettingsService";
import * as monitoringService from "./monitoringService";
import type { AuthLoginPayload, AuthPreSessionState, AuthenticatedPayload } from "./authTypes";
import {
  buildTwoFactorSetup,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  isTwoFactorChallengeExpired,
  verifyTwoFactorCode,
} from "./twoFactorService";

type RoleCode = "READER" | "DISPATCHER" | "ADMIN";

export class AuthError extends Error {
  status: number;
  code:
    | "SETUP_ALREADY_COMPLETED"
    | "INVALID_CREDENTIALS"
    | "USER_INACTIVE"
    | "VALIDATION_ERROR"
    | "SETUP_REQUIRED"
    | "QUICK_LOGIN_DISABLED"
    | "USER_NOT_FOUND_FOR_ROLE"
    | "INVALID_TWO_FACTOR_CODE"
    | "TWO_FACTOR_CHALLENGE_MISSING"
    | "TWO_FACTOR_REQUIRED";

  constructor(
    message: string,
    status: number,
    code:
      | "SETUP_ALREADY_COMPLETED"
      | "INVALID_CREDENTIALS"
      | "USER_INACTIVE"
      | "VALIDATION_ERROR"
      | "SETUP_REQUIRED"
      | "QUICK_LOGIN_DISABLED"
      | "USER_NOT_FOUND_FOR_ROLE"
      | "INVALID_TWO_FACTOR_CODE"
      | "TWO_FACTOR_CHALLENGE_MISSING"
      | "TWO_FACTOR_REQUIRED",
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type QuickLoginRoleTarget = {
  roleCode: RoleCode;
  available: boolean;
  username?: string;
};

type QuickLoginTargetsResponse = {
  roles: QuickLoginRoleTarget[];
};

type LoginResult = {
  payload: AuthLoginPayload;
  preAuth?: AuthPreSessionState;
};

function normalizeUsername(input: string): string {
  return input.trim();
}

function validatePassword(password: string): void {
  if (password.length < 10) {
    throw new AuthError("Password too short", 422, "VALIDATION_ERROR");
  }
}

function isDuplicateEntry(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
}

function isQuickLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_QUICK_LOGIN_ENABLED === "true";
}

async function isGlobalTwoFactorEnabled(): Promise<boolean> {
  const value = await userSettingsService.getGlobalSettingValue("auth_two_factor_enabled");
  return value === true;
}

function toAuthenticatedPayload(input: { userId: number; username: string; roleCode: DbRoleCode }): AuthenticatedPayload {
  return {
    status: "authenticated",
    userId: input.userId,
    username: input.username,
    roleCode: input.roleCode,
  };
}

async function attachMonitoringSummary(payload: AuthenticatedPayload): Promise<AuthenticatedPayload> {
  try {
    const monitoringSummary = await monitoringService.getMonitoringSummaryForRole(payload.roleCode);
    return monitoringSummary ? { ...payload, monitoringSummary } : payload;
  } catch (error) {
    logError("monitoring_summary_failed", {
      userId: payload.userId,
      roleCode: payload.roleCode,
      error,
    });
    return payload;
  }
}

export async function getSetupStatus() {
  const bootstrapState = await getBootstrapState();
  return {
    ...bootstrapState,
    isTwoFactorEnabled: await isGlobalTwoFactorEnabled(),
  };
}

export async function setupAdmin(input: { username: string; password: string }): Promise<AuthenticatedPayload> {
  const bootstrap = await getBootstrapState();
  if (!bootstrap.needsAdminSetup) {
    throw new AuthError("Setup already completed", 409, "SETUP_ALREADY_COMPLETED");
  }

  const username = normalizeUsername(input.username);
  if (!username) {
    throw new AuthError("Username required", 422, "VALIDATION_ERROR");
  }
  validatePassword(input.password);

  const passwordHash = await hashPassword(input.password);
  let created: { id: number; username: string; roleCode: "ADMIN" };
  try {
    created = await usersRepository.createAdminUser({
      username,
      passwordHash,
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new AuthError("Setup already completed", 409, "SETUP_ALREADY_COMPLETED");
    }
    throw error;
  }

  return attachMonitoringSummary(toAuthenticatedPayload({
    userId: created.id,
    username: created.username,
    roleCode: created.roleCode,
  }));
}

export async function login(input: { username: string; password: string }): Promise<LoginResult> {
  const bootstrap = await getBootstrapState();
  if (bootstrap.needsAdminSetup) {
    throw new AuthError("Setup required", 409, "SETUP_REQUIRED");
  }

  const identifier = normalizeUsername(input.username);
  if (!identifier) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const user = await usersRepository.getAuthUserByIdentifier(identifier);
  if (!user) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AuthError("User inactive", 403, "USER_INACTIVE");
  }
  if (!user.roleCode) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const twoFactorEnabled = await isGlobalTwoFactorEnabled();
  if (!twoFactorEnabled) {
    return {
      payload: await attachMonitoringSummary(toAuthenticatedPayload({
        userId: user.userId,
        username: user.username,
        roleCode: user.roleCode,
      })),
    };
  }

  if (!user.twoFactorSecretEncrypted) {
    const setup = await buildTwoFactorSetup(user.username);
    return {
      payload: {
        status: "2fa_setup_required",
        username: user.username,
        manualEntryKey: setup.manualEntryKey,
        qrCodeDataUrl: setup.qrCodeDataUrl,
      },
      preAuth: {
        userId: user.userId,
        username: user.username,
        roleCode: user.roleCode,
        mode: "setup",
        pendingSecret: setup.secret,
        createdAt: Date.now(),
      },
    };
  }

  return {
    payload: {
      status: "2fa_required",
      username: user.username,
    },
    preAuth: {
      userId: user.userId,
      username: user.username,
      roleCode: user.roleCode,
      mode: "verify",
      createdAt: Date.now(),
    },
  };
}

function assertValidPreAuth(preAuth: AuthPreSessionState | undefined, expectedMode: "setup" | "verify"): AuthPreSessionState {
  if (!preAuth || preAuth.mode !== expectedMode || isTwoFactorChallengeExpired(preAuth.createdAt)) {
    throw new AuthError("Two-factor challenge missing", 409, "TWO_FACTOR_CHALLENGE_MISSING");
  }
  return preAuth;
}

export async function verifyTwoFactorSetup(input: {
  code: string;
  preAuth: AuthPreSessionState | undefined;
}): Promise<AuthenticatedPayload> {
  const preAuth = assertValidPreAuth(input.preAuth, "setup");
  if (!preAuth.pendingSecret || !(await verifyTwoFactorCode(preAuth.pendingSecret, input.code))) {
    throw new AuthError("Invalid two-factor code", 401, "INVALID_TWO_FACTOR_CODE");
  }

  await usersRepository.storeUserTwoFactorSecret(
    preAuth.userId,
    encryptTwoFactorSecret(preAuth.pendingSecret),
  );

  return attachMonitoringSummary(toAuthenticatedPayload(preAuth));
}

export async function verifyTwoFactorLogin(input: {
  code: string;
  preAuth: AuthPreSessionState | undefined;
}): Promise<AuthenticatedPayload> {
  const preAuth = assertValidPreAuth(input.preAuth, "verify");
  const user = await usersRepository.getUserTwoFactorRecordById(preAuth.userId);
  if (!user || !user.isActive || !user.roleCode || !user.twoFactorSecretEncrypted) {
    throw new AuthError("Two-factor challenge missing", 409, "TWO_FACTOR_CHALLENGE_MISSING");
  }

  const decryptedSecret = decryptTwoFactorSecret(user.twoFactorSecretEncrypted);
  if (!(await verifyTwoFactorCode(decryptedSecret, input.code))) {
    throw new AuthError("Invalid two-factor code", 401, "INVALID_TWO_FACTOR_CODE");
  }

  return attachMonitoringSummary(toAuthenticatedPayload({
    userId: user.userId,
    username: user.username,
    roleCode: user.roleCode,
  }));
}

export async function listQuickLoginTargets(): Promise<QuickLoginTargetsResponse> {
  if (!isQuickLoginEnabled()) {
    throw new AuthError("Quick login disabled", 404, "QUICK_LOGIN_DISABLED");
  }

  const bootstrap = await getBootstrapState();
  if (bootstrap.needsAdminSetup) {
    throw new AuthError("Setup required", 409, "SETUP_REQUIRED");
  }

  const roleCodes: DbRoleCode[] = ["ADMIN", "DISPATCHER", "READER"];
  const roles = await Promise.all(
    roleCodes.map(async (roleCode) => {
      const user = await usersRepository.getFirstActiveUserByRoleCode(roleCode);
      if (!user) {
        return {
          roleCode,
          available: false,
        };
      }
      return {
        roleCode,
        available: true,
        username: user.username,
      };
    }),
  );

  return { roles };
}

export async function quickLoginByRole(input: { roleCode: RoleCode }): Promise<AuthenticatedPayload> {
  if (!isQuickLoginEnabled()) {
    throw new AuthError("Quick login disabled", 404, "QUICK_LOGIN_DISABLED");
  }

  const bootstrap = await getBootstrapState();
  if (bootstrap.needsAdminSetup) {
    throw new AuthError("Setup required", 409, "SETUP_REQUIRED");
  }
  if (await isGlobalTwoFactorEnabled()) {
    throw new AuthError("Two-factor required", 409, "TWO_FACTOR_REQUIRED");
  }

  const user = await usersRepository.getFirstActiveUserByRoleCode(input.roleCode);
  if (!user) {
    throw new AuthError("No active user for role", 404, "USER_NOT_FOUND_FOR_ROLE");
  }

  return attachMonitoringSummary(toAuthenticatedPayload({
    userId: user.userId,
    username: user.username,
    roleCode: user.roleCode,
  }));
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
