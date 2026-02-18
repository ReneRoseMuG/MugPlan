type SetupStatusResponse = {
  needsAdminSetup: boolean;
};

type AuthPayload = {
  userId: number;
  username: string;
  roleCode: "READER" | "DISPATCHER" | "ADMIN";
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

export async function login(username: string, password: string): Promise<void> {
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
  const payload = (await response.json()) as AuthPayload;
  window.localStorage.setItem("userRole", payload.roleCode);
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

  const payload = (await response.json()) as AuthPayload;
  window.localStorage.setItem("userRole", payload.roleCode);
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
  const payload = (await response.json()) as AuthPayload;
  window.localStorage.setItem("userRole", payload.roleCode);
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
