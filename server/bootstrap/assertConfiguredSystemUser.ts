import { getUserWithRole } from "../repositories/usersRepository";

export async function assertConfiguredSystemUser(): Promise<void> {
  const rawUserId = process.env.SETTINGS_USER_ID;
  const configuredUserId = rawUserId ? Number(rawUserId) : Number.NaN;

  if (!Number.isFinite(configuredUserId) || configuredUserId <= 0) {
    throw new Error("Startup failed: SETTINGS_USER_ID must be set to a positive integer");
  }

  const userWithRole = await getUserWithRole(configuredUserId);
  if (!userWithRole) {
    throw new Error(`Startup failed: configured user ${configuredUserId} was not found`);
  }

  if (!userWithRole.isActive) {
    throw new Error(`Startup failed: configured user ${configuredUserId} is inactive`);
  }

  if (userWithRole.roleCode !== "ADMIN") {
    throw new Error(
      `Startup failed: configured user ${configuredUserId} must have ADMIN role, got ${userWithRole.roleCode ?? "null"}`,
    );
  }
}
