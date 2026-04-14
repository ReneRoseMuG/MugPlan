/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projektkarten des Produkt-Reports bilden die kanonische DB-Referenz fuer kartentaugliche Projekte im Zeitraum korrekt ab.
 * - Karten erscheinen nur fuer Projekte mit Sondermaß und/oder Anmerkungen.
 * - Reklamation und jeder Storno-Bezug schliessen Projekte aus dem zweiten Report vollstaendig aus.
 * - Termine ohne Projekt und Termine ausserhalb des Fensters erzeugen keine Projektzeilen.
 *
 * Fehlerfaelle:
 * - Der Report erfindet, verliert oder fehlfiltert Projekte in `projectRows`.
 * - Projekte ohne Karten-Grund erscheinen faelschlich in der Kartenliste.
 * - Storno- oder Reklamationsprojekte bleiben trotz strenger Produkt-Report-Regel sichtbar.
 *
 * Ziel:
 * Die strenge Projektlisten-Semantik des Produkt-Reports gegen eine DB-basierte Referenz absichern.
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createProductFixture,
  createTourFixture,
} from "../../helpers/testDataFactory";
import {
  MANAGED_MIRRORED_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  isManagedMirroredTagName,
  isManagedRemarksTagName,
  isManagedComplaintTagName,
  isManagedSpecialMeasureTagName,
  isReservedAppointmentCancellationTagName,
} from "../../../shared/appointmentCancellation";
import { appointments, appointmentTags, projectTags, tags } from "../../../shared/schema";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function ensureExactTag(name: string, color: string) {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(name, color);
}

async function createStrictProjectFixture(params: {
  prefix: string;
  appointmentDates: string[];
  tourId?: number | null;
  projectTagIds?: number[];
  appointmentTagIdsByIndex?: number[][];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    fullName: `${params.prefix} Kunde`,
  });
  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });
  const product = await createProductFixture({ categoryName: "Fass Saunen", name: `${params.prefix} Produkt` });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `ORD-${params.prefix}`,
    productId: product.id,
    quantity: 1,
  });

  const createdAppointments = [];
  for (const date of params.appointmentDates) {
    createdAppointments.push(await createAppointmentFixture({ projectId: project.id, startDate: date, tourId: params.tourId ?? null }));
  }

  for (const tagId of params.projectTagIds ?? []) {
    await attachProjectTagFixture(project.id, tagId);
  }

  for (const [index, tagIds] of (params.appointmentTagIdsByIndex ?? []).entries()) {
    const appointment = createdAppointments[index];
    if (!appointment) continue;
    for (const tagId of tagIds) {
      await attachAppointmentTagFixture(appointment.id, tagId);
    }
  }

  return { customer, project, appointments: createdAppointments };
}

describe("integration: produktionsplanung project rows consistency", () => {
  it("matches a DB reference with strict exclusion for Reklamation and Storno", async () => {
    const admin = await loginAdminAgent(app);
    const cancellationTag = await ensureExactTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#ef4444");
    const reportExclusionTag = await ensureExactTag(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
    const specialMeasureTag = await ensureExactTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#2563eb");
    const mirroredTag = await ensureExactTag(MANAGED_MIRRORED_TAG_NAME, "#0891b2");
    const tourA = await createTourFixture("#1d4ed8");
    const tourB = await createTourFixture("#0f766e");

    const visibleA = await createStrictProjectFixture({
      prefix: "FT32-CONS-A",
      appointmentDates: ["2030-06-03"],
      tourId: tourA.id,
      projectTagIds: [specialMeasureTag.id],
    });
    const visibleB = await createStrictProjectFixture({
      prefix: "FT32-CONS-B",
      appointmentDates: ["2030-06-07"],
      tourId: tourB.id,
      appointmentTagIdsByIndex: [[remarksTag.id]],
    });
    const visibleC = await createStrictProjectFixture({
      prefix: "FT32-CONS-C",
      appointmentDates: ["2030-06-06"],
      tourId: tourA.id,
      projectTagIds: [mirroredTag.id],
    });
    await createStrictProjectFixture({
      prefix: "FT32-CONS-NO-REASON",
      appointmentDates: ["2030-06-08"],
    });
    await createStrictProjectFixture({
      prefix: "FT32-CONS-CANCEL",
      appointmentDates: ["2030-06-09"],
      appointmentTagIdsByIndex: [[cancellationTag.id]],
    });
    await createStrictProjectFixture({
      prefix: "FT32-CONS-REKL",
      appointmentDates: ["2030-06-10"],
      projectTagIds: [reportExclusionTag.id],
    });
    await createStrictProjectFixture({
      prefix: "FT32-CONS-OUTSIDE",
      appointmentDates: ["2030-07-02"],
    });
    const looseCustomer = await createCustomerFixture("FT32-CONS-CUSTOMER");
    await createAppointmentFixture({
      customerId: looseCustomer.id,
      projectId: null,
      startDate: "2030-06-11",
    });

    const response = await admin
      .get("/api/reports/produktionsplanung?fromDate=2030-06-01&toDate=2030-06-30")
      .expect(200);

    const appointmentRows = await db
      .select({
        appointmentId: appointments.id,
        projectId: appointments.projectId,
      })
      .from(appointments)
      .where(and(
        gte(appointments.startDate, new Date("2030-06-01T00:00:00")),
        lte(appointments.startDate, new Date("2030-06-30T00:00:00")),
      ));
    const normalizedRows = appointmentRows.filter((row): row is { appointmentId: number; projectId: number } => typeof row.projectId === "number");
    const projectIds = Array.from(new Set(normalizedRows.map((row) => row.projectId)));
    const appointmentIds = normalizedRows.map((row) => row.appointmentId);

    const projectTagRows = projectIds.length > 0
      ? await db
        .select({
          projectId: projectTags.projectId,
          tagId: tags.id,
          tagName: tags.name,
        })
        .from(projectTags)
        .innerJoin(tags, eq(projectTags.tagId, tags.id))
        .where(inArray(projectTags.projectId, projectIds))
      : [];
    const appointmentTagRows = appointmentIds.length > 0
      ? await db
        .select({
          appointmentId: appointmentTags.appointmentId,
          tagId: tags.id,
          tagName: tags.name,
        })
        .from(appointmentTags)
        .innerJoin(tags, eq(appointmentTags.tagId, tags.id))
        .where(inArray(appointmentTags.appointmentId, appointmentIds))
      : [];

    const projectTagNamesByProjectId = new Map<number, string[]>();
    for (const row of projectTagRows) {
      const entries = projectTagNamesByProjectId.get(row.projectId) ?? [];
      entries.push(row.tagName);
      projectTagNamesByProjectId.set(row.projectId, entries);
    }

    const appointmentTagNamesByAppointmentId = new Map<number, string[]>();
    for (const row of appointmentTagRows) {
      const entries = appointmentTagNamesByAppointmentId.get(row.appointmentId) ?? [];
      entries.push(row.tagName);
      appointmentTagNamesByAppointmentId.set(row.appointmentId, entries);
    }

    const referenceProjectIds = Array.from(new Set(
      normalizedRows
        .filter((row) => {
          const projectTagNames = projectTagNamesByProjectId.get(row.projectId) ?? [];
          const appointmentTagNames = appointmentTagNamesByAppointmentId.get(row.appointmentId) ?? [];
          const combinedTagNames = [...projectTagNames, ...appointmentTagNames];
          const hasCardReason = combinedTagNames.some((tagName) =>
            isManagedSpecialMeasureTagName(tagName)
            || isManagedRemarksTagName(tagName)
            || isManagedMirroredTagName(tagName));

          return hasCardReason && !combinedTagNames.some((tagName) =>
            isManagedComplaintTagName(tagName) || isReservedAppointmentCancellationTagName(tagName));
        })
        .map((row) => row.projectId),
    )).sort((left, right) => left - right);

    expect(referenceProjectIds).toEqual([visibleA.project.id, visibleB.project.id, visibleC.project.id].sort((left, right) => left - right));
    expect(response.body.projectRows.map((row: { projectId: number }) => row.projectId).sort((left: number, right: number) => left - right))
      .toEqual(referenceProjectIds);
    expect(response.body.projectRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ projectId: visibleA.project.id, tourName: tourA.name }),
      expect.objectContaining({ projectId: visibleB.project.id, tourName: tourB.name }),
      expect.objectContaining({ projectId: visibleC.project.id, tourName: tourA.name }),
    ]));
  });
});
