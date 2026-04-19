import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";

import { RESERVED_VACANT_TAG_NAME } from "../../shared/appointmentCancellation";
import { noteTemplates, tags, tours } from "../../shared/schema";
import { db } from "../../server/db";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "./testDataFactory";

export type DatabaseCanaryProfile =
  | "project-list-confusion"
  | "week-plan-confusion"
  | "seed-shadow";

export type StorageCanaryProfile =
  | "attachment-confusion"
  | "backup-confusion";

export type DatabaseCanaryResult = {
  profile: DatabaseCanaryProfile;
  token: string;
  created: Array<{
    entity: string;
    id?: number;
    label: string;
  }>;
};

export type StorageCanaryResult = {
  profile: StorageCanaryProfile;
  token: string;
  createdFiles: string[];
};

function normalizeToken(token: string): string {
  return token.trim().replace(/\s+/g, "-");
}

export function describeDatabaseCanaryExpectation(profile: DatabaseCanaryProfile): string {
  switch (profile) {
    case "project-list-confusion":
      return "Erzeugt ähnlich benannte Projekte und Termine, damit Listen-, Filter- und Paging-Assertions schärfer werden müssen.";
    case "week-plan-confusion":
      return "Erzeugt konkurrierende Tour-, Mitarbeiter- und Wochenplandaten im selben Zeitraum, damit Scope-Leaks sichtbar werden.";
    case "seed-shadow":
      return "Erzeugt Seed-nahe Tags, Touren und Notizvorlagen, damit Tests System-Seed nicht mit eigener Wirkung verwechseln.";
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

export function describeStorageCanaryExpectation(profile: StorageCanaryProfile): string {
  switch (profile) {
    case "attachment-confusion":
      return "Erzeugt Altdateien im Upload-Pfad, damit Attachment-Tests sichtbaren Restbestand erkennen.";
    case "backup-confusion":
      return "Erzeugt Altdateien im Backup-Pfad, damit Backup- und Dump-Listen nicht zufällig grün bleiben.";
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

export async function injectDatabaseCanaries(
  profile: DatabaseCanaryProfile,
  token: string,
): Promise<DatabaseCanaryResult> {
  const safeToken = normalizeToken(token);
  const shortToken = safeToken.slice(0, 14);

  if (profile === "project-list-confusion") {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: `${safeToken}-CUST`,
      firstName: "Canary",
      lastName: `${safeToken} Kunde`,
      fullName: `Canary ${safeToken} Kunde`,
      company: `Canary ${safeToken} GmbH`,
    });
    const projectA = await createProjectFixtureWithOverrides({
      prefix: `${safeToken}-PROJ-A`,
      customerId: customer.id,
      name: `Canary ${safeToken} Alpha`,
      orderNumber: `CAN-${shortToken}-A`,
    });
    const projectB = await createProjectFixtureWithOverrides({
      prefix: `${safeToken}-PROJ-B`,
      customerId: customer.id,
      name: `Canary ${safeToken} Alpha Altbestand`,
      orderNumber: `CAN-${shortToken}-B`,
    });
    const appointmentA = await createAppointmentFixture({
      projectId: projectA.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
    });
    const appointmentB = await createAppointmentFixture({
      projectId: projectB.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });

    return {
      profile,
      token: safeToken,
      created: [
        { entity: "customer", id: customer.id, label: customer.fullName },
        { entity: "project", id: projectA.id, label: projectA.name },
        { entity: "project", id: projectB.id, label: projectB.name },
        { entity: "appointment", id: appointmentA.id, label: `appointment-${appointmentA.id}` },
        { entity: "appointment", id: appointmentB.id, label: `appointment-${appointmentB.id}` },
      ],
    };
  }

  if (profile === "week-plan-confusion") {
    const employeeA = await createEmployeeFixtureWithOverrides({
      prefix: `${safeToken}-EMP-A`,
      firstName: "Canary",
      lastName: `${safeToken} Alpha`,
    });
    const employeeB = await createEmployeeFixtureWithOverrides({
      prefix: `${safeToken}-EMP-B`,
      firstName: "Canary",
      lastName: `${safeToken} Beta`,
    });
    const tourInsert = await db.insert(tours).values([
      { name: `Canary ${safeToken} Tour A`, color: "#225588", version: 1 },
      { name: `Canary ${safeToken} Tour B`, color: "#884422", version: 1 },
    ]);
    const tourAId = Number((tourInsert as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
      ?? (tourInsert as { insertId?: number }).insertId ?? 0);
    const [tourA] = await db.select().from(tours).where(eq(tours.id, tourAId));
    const [tourB] = await db.select().from(tours).where(eq(tours.name, `Canary ${safeToken} Tour B`));

    const customer = await createCustomerFixtureWithOverrides({
      prefix: `${safeToken}-WEEK-CUST`,
      firstName: "Canary",
      lastName: `${safeToken} Woche`,
      fullName: `Canary ${safeToken} Woche`,
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: `${safeToken}-WEEK-PROJ`,
      customerId: customer.id,
      name: `Canary ${safeToken} Wochenplan`,
    });
    const appointmentA = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(8),
      tourId: tourA?.id ?? null,
      employeeIds: [employeeA.id],
    });
    const appointmentB = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(8),
      tourId: tourB?.id ?? null,
      employeeIds: [employeeB.id],
    });

    return {
      profile,
      token: safeToken,
      created: [
        { entity: "employee", id: employeeA.id, label: employeeA.fullName },
        { entity: "employee", id: employeeB.id, label: employeeB.fullName },
        { entity: "tour", id: tourA?.id, label: tourA?.name ?? "missing-tour-a" },
        { entity: "tour", id: tourB?.id, label: tourB?.name ?? "missing-tour-b" },
        { entity: "appointment", id: appointmentA.id, label: `appointment-${appointmentA.id}` },
        { entity: "appointment", id: appointmentB.id, label: `appointment-${appointmentB.id}` },
      ],
    };
  }

  const tag = await createExactTagFixture(`${RESERVED_VACANT_TAG_NAME} ${safeToken}`, "#d4537e");
  const tourInsert = await db.insert(tours).values({
    name: `Parkplatz ${safeToken}`,
    color: "#D4537E",
    version: 1,
  });
  const tourId = Number((tourInsert as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (tourInsert as { insertId?: number }).insertId ?? 0);
  const templateInsert = await db.insert(noteTemplates).values({
    title: `Reklamation ${safeToken}`,
    body: "",
    cardColor: "#FF011B",
    print: true,
    sortOrder: 910,
    isActive: true,
    version: 1,
  });
  const templateId = Number((templateInsert as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (templateInsert as { insertId?: number }).insertId ?? 0);

  return {
    profile,
    token: safeToken,
    created: [
      { entity: "tag", id: tag.id, label: tag.name },
      { entity: "tour", id: tourId, label: `Parkplatz ${safeToken}` },
      { entity: "noteTemplate", id: templateId, label: `Reklamation ${safeToken}` },
    ],
  };
}

export async function injectStorageCanaries(
  profile: StorageCanaryProfile,
  token: string,
): Promise<StorageCanaryResult> {
  const safeToken = normalizeToken(token);
  const basePath = profile === "attachment-confusion"
    ? process.env.ATTACHMENT_STORAGE_PATH
    : process.env.BACKUP_BASE_PATH;

  if (typeof basePath !== "string" || basePath.trim().length === 0) {
    throw new Error(`Missing storage path for profile ${profile}.`);
  }

  const directory = profile === "attachment-confusion"
    ? path.join(basePath, "canary")
    : path.join(basePath, "canary");
  await fs.mkdir(directory, { recursive: true });

  const extension = profile === "attachment-confusion" ? "txt" : "zip";
  const filePath = path.join(directory, `${safeToken}.${extension}`);
  await fs.writeFile(filePath, `canary:${profile}:${safeToken}`, "utf8");

  return {
    profile,
    token: safeToken,
    createdFiles: [filePath],
  };
}
