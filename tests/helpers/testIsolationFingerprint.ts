import fs from "fs/promises";
import path from "path";
import { count, eq } from "drizzle-orm";

import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_MESSE_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_PLANNING_BLOCKED_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
} from "../../shared/appointmentCancellation";
import {
  appointmentAttachments,
  appointmentEmployees,
  appointmentNotes,
  appointmentTags,
  appointments,
  calendarWeekNotes,
  customerNotes,
  customers,
  employeeAttachments,
  employeeNotes,
  employeeTags,
  noteTemplates,
  productCategories,
  projectAttachments,
  projectNotes,
  projects,
  projectTags,
  roles,
  tags,
  tours,
  users,
} from "../../shared/schema";
import { db } from "../../server/db";

export type DatabaseBaselineProfile = "core" | "seeded";
export type StorageFingerprintProfile = "none" | "uploads" | "backups" | "both";

type FingerprintIssue = {
  scope: "database" | "storage";
  subject: string;
  message: string;
};

type FingerprintResult = {
  ok: boolean;
  issues: FingerprintIssue[];
};

const CORE_ROLE_CODES = ["ADMIN", "DISPATCHER", "READER"] as const;
const SEEDED_TOUR_NAMES = [
  "Parkplatz",
  "Schröder Halle",
  "Tour 1",
  "Tour 2",
  "Tour 3",
  "Tour 4",
] as const;
const SEEDED_TAG_NAMES = [
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  MANAGED_MESSE_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
  RESERVED_PLANNING_BLOCKED_TAG_NAME,
] as const;
const SEEDED_NOTE_TEMPLATE_TITLES = [
  "Reklamation",
  "Messe Aufbau/Abbau",
  "Info zum Termin",
] as const;

async function listFilesRecursive(directoryPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath);
      }
      return [entryPath];
    }));
    return files.flat();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException | null;
    if (nodeError?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readCount(table: Parameters<typeof db.select>[0] extends never ? never : any, label: string) {
  const rows = await db.select({ value: count() }).from(table);
  return {
    label,
    value: Number(rows[0]?.value ?? 0),
  };
}

async function collectCoreCounts() {
  return Promise.all([
    readCount(customers, "customers"),
    readCount(projects, "projects"),
    readCount(appointments, "appointments"),
    readCount(customerNotes, "customerNotes"),
    readCount(projectNotes, "projectNotes"),
    readCount(appointmentNotes, "appointmentNotes"),
    readCount(employeeNotes, "employeeNotes"),
    readCount(projectAttachments, "projectAttachments"),
    readCount(employeeAttachments, "employeeAttachments"),
    readCount(appointmentAttachments, "appointmentAttachments"),
    readCount(projectTags, "projectTags"),
    readCount(employeeTags, "employeeTags"),
    readCount(appointmentTags, "appointmentTags"),
    readCount(appointmentEmployees, "appointmentEmployees"),
    readCount(calendarWeekNotes, "calendarWeekNotes"),
  ]);
}

function buildFingerprintError(result: FingerprintResult, label: string): Error {
  const lines = result.issues.map((issue) => `[${issue.scope}] ${issue.subject}: ${issue.message}`);
  return new Error(`${label} fingerprint mismatch:\n${lines.join("\n")}`);
}

export async function checkDatabaseFingerprint(profile: DatabaseBaselineProfile): Promise<FingerprintResult> {
  const issues: FingerprintIssue[] = [];

  const roleRows = await db
    .select({ code: roles.code })
    .from(roles);
  const roleCodes = roleRows.map((row) => row.code).sort();
  if (JSON.stringify(roleCodes) !== JSON.stringify([...CORE_ROLE_CODES])) {
    issues.push({
      scope: "database",
      subject: "roles",
      message: `expected ${CORE_ROLE_CODES.join(", ")}, got ${roleCodes.join(", ") || "<empty>"}`,
    });
  }

  const userRows = await db
    .select({ username: users.username })
    .from(users);
  const usernames = userRows.map((row) => row.username).sort();
  if (JSON.stringify(usernames) !== JSON.stringify(["test-admin"])) {
    issues.push({
      scope: "database",
      subject: "users",
      message: `expected only test-admin, got ${usernames.join(", ") || "<empty>"}`,
    });
  }

  const categoryRows = await db
    .select({ name: productCategories.name })
    .from(productCategories);
  const categoryNames = categoryRows.map((row) => row.name).sort();
  if (JSON.stringify(categoryNames) !== JSON.stringify(["Fass Saunen"])) {
    issues.push({
      scope: "database",
      subject: "productCategories",
      message: `expected only Fass Saunen, got ${categoryNames.join(", ") || "<empty>"}`,
    });
  }

  const coreCounts = await collectCoreCounts();
  for (const row of coreCounts) {
    if (row.value !== 0) {
      issues.push({
        scope: "database",
        subject: row.label,
        message: `expected 0 rows, got ${row.value}`,
      });
    }
  }

  const tagRows = await db
    .select({ name: tags.name })
    .from(tags);
  const tagNames = tagRows.map((row) => row.name).sort();

  const tourRows = await db
    .select({ name: tours.name })
    .from(tours);
  const tourNames = tourRows.map((row) => row.name).sort();

  const templateRows = await db
    .select({ title: noteTemplates.title })
    .from(noteTemplates);
  const templateTitles = templateRows.map((row) => row.title).sort();

  if (profile === "core") {
    if (tagNames.length > 0) {
      issues.push({
        scope: "database",
        subject: "tags",
        message: `expected no system seed tags, got ${tagNames.join(", ")}`,
      });
    }
    if (tourNames.length > 0) {
      issues.push({
        scope: "database",
        subject: "tours",
        message: `expected no system seed tours, got ${tourNames.join(", ")}`,
      });
    }
    if (templateTitles.length > 0) {
      issues.push({
        scope: "database",
        subject: "noteTemplates",
        message: `expected no system seed note templates, got ${templateTitles.join(", ")}`,
      });
    }
  }

  if (profile === "seeded") {
    if (JSON.stringify(tagNames) !== JSON.stringify([...SEEDED_TAG_NAMES].sort())) {
      issues.push({
        scope: "database",
        subject: "tags",
        message: `expected seeded tags ${SEEDED_TAG_NAMES.join(", ")}, got ${tagNames.join(", ") || "<empty>"}`,
      });
    }
    if (JSON.stringify(tourNames) !== JSON.stringify([...SEEDED_TOUR_NAMES].sort())) {
      issues.push({
        scope: "database",
        subject: "tours",
        message: `expected seeded tours ${SEEDED_TOUR_NAMES.join(", ")}, got ${tourNames.join(", ") || "<empty>"}`,
      });
    }
    if (JSON.stringify(templateTitles) !== JSON.stringify([...SEEDED_NOTE_TEMPLATE_TITLES].sort())) {
      issues.push({
        scope: "database",
        subject: "noteTemplates",
        message: `expected seeded note templates ${SEEDED_NOTE_TEMPLATE_TITLES.join(", ")}, got ${templateTitles.join(", ") || "<empty>"}`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export async function assertDatabaseFingerprint(profile: DatabaseBaselineProfile): Promise<void> {
  const result = await checkDatabaseFingerprint(profile);
  if (!result.ok) {
    throw buildFingerprintError(result, profile);
  }
}

export async function checkStorageFingerprint(profile: StorageFingerprintProfile): Promise<FingerprintResult> {
  const issues: FingerprintIssue[] = [];
  const uploadsPath = process.env.ATTACHMENT_STORAGE_PATH;
  const backupsPath = process.env.BACKUP_BASE_PATH;

  if (typeof uploadsPath !== "string" || uploadsPath.trim().length === 0) {
    issues.push({
      scope: "storage",
      subject: "ATTACHMENT_STORAGE_PATH",
      message: "env variable missing or empty",
    });
  }

  if (typeof backupsPath !== "string" || backupsPath.trim().length === 0) {
    issues.push({
      scope: "storage",
      subject: "BACKUP_BASE_PATH",
      message: "env variable missing or empty",
    });
  }

  if (issues.length === 0) {
    const uploadsFiles = await listFilesRecursive(uploadsPath!);
    const backupFiles = await listFilesRecursive(backupsPath!);

    if ((profile === "none" || profile === "uploads" || profile === "both") && uploadsFiles.length > 0) {
      issues.push({
        scope: "storage",
        subject: "uploads",
        message: `expected empty uploads path, found ${uploadsFiles.length} files`,
      });
    }

    if ((profile === "none" || profile === "backups" || profile === "both") && backupFiles.length > 0) {
      issues.push({
        scope: "storage",
        subject: "backups",
        message: `expected empty backups path, found ${backupFiles.length} files`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export async function assertStorageFingerprint(profile: StorageFingerprintProfile): Promise<void> {
  const result = await checkStorageFingerprint(profile);
  if (!result.ok) {
    throw buildFingerprintError(result, `${profile} storage`);
  }
}

export async function assertCombinedTestFingerprint(
  databaseProfile: DatabaseBaselineProfile,
  storageProfile: StorageFingerprintProfile,
): Promise<void> {
  await assertDatabaseFingerprint(databaseProfile);
  await assertStorageFingerprint(storageProfile);
}
