type SetupStatusResponse = {
  needsAdminSetup: boolean;
  isTwoFactorEnabled: boolean;
};

type AuthenticatedPayload = {
  status: "authenticated";
  userId: number;
  username: string;
  roleCode: "READER" | "DISPATCHER" | "ADMIN";
};

type LoginPayload =
  | AuthenticatedPayload
  | {
      status: "2fa_setup_required";
      username: string;
      manualEntryKey: string;
      qrCodeDataUrl: string;
    }
  | {
      status: "2fa_required";
      username: string;
    };

type QuickLoginRoleCode = "READER" | "DISPATCHER" | "ADMIN";

export type ClientRoleCode = QuickLoginRoleCode;

type QuickLoginTargetsResponse = {
  roles: Array<{
    roleCode: QuickLoginRoleCode;
    available: boolean;
    username?: string;
  }>;
};

const AUTH_ROLE_STORAGE_KEY = "userRole";
const AUTH_USER_ID_STORAGE_KEY = "userId";

export async function getSetupStatus(): Promise<SetupStatusResponse> {
  const response = await fetch("/api/auth/setup-status", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Setup status failed: ${response.status}`);
  }

  return (await response.json()) as SetupStatusResponse;
}

function persistRole(payload: AuthenticatedPayload): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_ROLE_STORAGE_KEY, payload.roleCode);
  window.localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, String(payload.userId));
}

function clearPersistedAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_ROLE_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY);
}

export function getStoredUserId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(AUTH_USER_ID_STORAGE_KEY);
  const parsed = Number(stored);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeClientRole(value: string | null | undefined): ClientRoleCode | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "DISPATCHER" || normalized === "READER") {
    return normalized;
  }
  return null;
}

export function resolveClientRole(value: string | null | undefined): ClientRoleCode {
  return normalizeClientRole(value) ?? "DISPATCHER";
}

export function getStoredUserRole(): ClientRoleCode {
  if (typeof window === "undefined") {
    return resolveClientRole(null);
  }
  return resolveClientRole(window.localStorage.getItem("userRole"));
}

export function isReaderRole(value: string | null | undefined): boolean {
  return resolveClientRole(value) === "READER";
}

export function canAccessReports(value: string | null | undefined): boolean {
  const role = resolveClientRole(value);
  return role === "ADMIN" || role === "DISPATCHER" || role === "READER";
}

export function canAccessJournal(value: string | null | undefined): boolean {
  const role = resolveClientRole(value);
  return role === "ADMIN" || role === "DISPATCHER";
}

export function canAccessMonitoring(value: string | null | undefined): boolean {
  const role = resolveClientRole(value);
  return role === "ADMIN" || role === "DISPATCHER";
}

export function canAccessTourPostalPlan(value: string | null | undefined): boolean {
  return !isReaderRole(value);
}

export async function getSessionStatus(): Promise<AuthenticatedPayload> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearPersistedAuth();
    }
    throw new Error(`Session status failed: ${response.status}`);
  }

  const payload = (await response.json()) as AuthenticatedPayload;
  persistRole(payload);
  return payload;
}

export async function login(username: string, password: string): Promise<LoginPayload> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = typeof payload?.code === "string" ? payload.code : "LOGIN_FAILED";
    throw new Error(code);
  }
  const payload = (await response.json()) as LoginPayload;
  if (payload.status === "authenticated") {
    persistRole(payload);
  }
  return payload;
}

export async function verifyTwoFactorSetup(code: string): Promise<AuthenticatedPayload> {
  const response = await fetch("/api/auth/2fa/setup/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const codeValue = typeof payload?.code === "string" ? payload.code : "TWO_FACTOR_SETUP_FAILED";
    throw new Error(codeValue);
  }

  const payload = (await response.json()) as AuthenticatedPayload;
  persistRole(payload);
  return payload;
}

export async function verifyTwoFactorLogin(code: string): Promise<AuthenticatedPayload> {
  const response = await fetch("/api/auth/2fa/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const codeValue = typeof payload?.code === "string" ? payload.code : "TWO_FACTOR_VERIFY_FAILED";
    throw new Error(codeValue);
  }

  const payload = (await response.json()) as AuthenticatedPayload;
  persistRole(payload);
  return payload;
}

export async function getQuickLoginTargets(): Promise<QuickLoginTargetsResponse> {
  const response = await fetch("/api/auth/quick-login-targets", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = typeof payload?.code === "string" ? payload.code : "QUICK_LOGIN_TARGETS_FAILED";
    throw new Error(code);
  }

  return (await response.json()) as QuickLoginTargetsResponse;
}

export async function quickLogin(roleCode: QuickLoginRoleCode): Promise<AuthenticatedPayload> {
  const response = await fetch("/api/auth/quick-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleCode }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = typeof payload?.code === "string" ? payload.code : "QUICK_LOGIN_FAILED";
    throw new Error(code);
  }

  const payload = (await response.json()) as AuthenticatedPayload;
  persistRole(payload);
  return payload;
}

export async function setupAdmin(username: string, password: string): Promise<AuthenticatedPayload> {
  const response = await fetch("/api/auth/setup-admin", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = typeof payload?.code === "string" ? payload.code : "SETUP_FAILED";
    throw new Error(code);
  }
  const payload = (await response.json()) as AuthenticatedPayload;
  persistRole(payload);
  return payload;
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.status}`);
  }
  clearPersistedAuth();
}
