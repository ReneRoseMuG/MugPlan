type SetupStatusResponse = {
  needsAdminSetup: boolean;
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

type QuickLoginTargetsResponse = {
  roles: Array<{
    roleCode: QuickLoginRoleCode;
    available: boolean;
    username?: string;
  }>;
};

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
  window.localStorage.setItem("userRole", payload.roleCode);
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

export async function verifyTwoFactorSetup(code: string): Promise<void> {
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
}

export async function verifyTwoFactorLogin(code: string): Promise<void> {
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

export async function quickLogin(roleCode: QuickLoginRoleCode): Promise<void> {
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
}

export async function setupAdmin(username: string, password: string): Promise<void> {
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
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.status}`);
  }
  window.localStorage.removeItem("userRole");
}
