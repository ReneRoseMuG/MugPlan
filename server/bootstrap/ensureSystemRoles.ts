import { eq } from "drizzle-orm";
import { db } from "../db";
import { roles } from "@shared/schema";

type RequiredRole = {
  code: "ADMIN" | "READER" | "DISPATCHER";
  name: string;
  description: string;
};

const requiredRoles: readonly RequiredRole[] = [
  {
    code: "ADMIN",
    name: "Admin",
    description: "Vollzugriff. Systemadministration und Stammdaten.",
  },
  {
    code: "READER",
    name: "Leser",
    description: "Lesezugriff nur. Keine Bearbeitungsrechte.",
  },
  {
    code: "DISPATCHER",
    name: "Disponent",
    description: "Fachliche Bearbeitung von Projekten, Terminen und Kunden.",
  },
] as const;

function isDuplicateRoleCodeError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
}

export async function ensureSystemRoles(): Promise<void> {
  for (const role of requiredRoles) {
    const [existingRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, role.code)).limit(1);
    if (existingRole) {
      continue;
    }

    try {
      await db.insert(roles).values({
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      });
    } catch (error) {
      if (isDuplicateRoleCodeError(error)) {
        continue;
      }
      throw error;
    }
  }
}
