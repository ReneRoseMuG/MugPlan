/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der reservierte Termin-Storno-Tag bleibt im Public-Tagkatalog verborgen.
 * - Der systemverwaltete Vorlauflisten-Tag "Reklamation" wird im Public-Tagkatalog automatisch angelegt und bleibt sichtbar.
 * - Die Admin-Tagverwaltung normalisiert geschuetzte System-Tags auf isDefault=true und blockiert Update/Delete.
 * - Der Einweg-Storno setzt den reservierten Tag idempotent und macht den Termin readonly.
 * - Das Entfernen des reservierten Tags ueber den generischen Termin-Tag-Pfad ist blockiert.
 *
 * Fehlerfaelle:
 * - "Storniert" erscheint in normalen Tag-Listen.
 * - Der reservierte Tag kann in den Stammdaten umbenannt oder geloescht werden.
 * - Ein stornierter Termin bleibt ueber normale Mutationspfade veraenderbar.
 *
 * Ziel:
 * Den reservierten Einweg-Storno ueber bestehende Tag-Infrastruktur end-to-end absichern.
 */
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { appointmentTags, tags } from "../../../shared/schema";
import {
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createExactTagFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function ensureReservedCancellationTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  const created = await createExactTagFixture(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
  return {
    id: created.id,
    name: created.name,
    version: 1,
  };
}

describe("FT01/FT28 integration: appointment cancellation workflow", () => {
  it("hides the reserved cancellation tag, auto-creates Reklamation in /api/tags, and keeps both protected in admin master data", async () => {
    const admin = await loginAdminAgent(app);
    const reservedTag = await ensureReservedCancellationTag();

    await admin.get("/api/tags").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string; color: string }>)).toContainEqual(
        expect.objectContaining({
          name: MANAGED_REPORT_EXCLUSION_TAG_NAME,
          color: "#f97316",
        }),
      );
    });

    let managedReportTag: { id: number; name: string; version: number; isDefault: boolean } | undefined;
    let normalizedCancellationTag: { id: number; name: string; version: number; isDefault: boolean } | undefined;
    await admin.get("/api/admin/master-data/tags").expect(200).expect(({ body }) => {
      normalizedCancellationTag = (body as Array<{ id: number; name: string; version: number; isDefault: boolean }>).find(
        (tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
      );
      managedReportTag = (body as Array<{ id: number; name: string; version: number; isDefault: boolean }>).find(
        (tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME,
      );
    });
    expect(normalizedCancellationTag).toBeDefined();
    expect(normalizedCancellationTag?.isDefault).toBe(true);
    expect(managedReportTag).toBeDefined();
    expect(managedReportTag?.isDefault).toBe(true);

    await admin
      .put(`/api/admin/master-data/tags/${reservedTag.id}`)
      .send({ name: "Storno-Tag-Edit", version: reservedTag.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .delete(`/api/admin/master-data/tags/${reservedTag.id}`)
      .send({ version: reservedTag.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .put(`/api/admin/master-data/tags/${managedReportTag!.id}`)
      .send({ name: "Reklamation Neu", version: managedReportTag!.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .delete(`/api/admin/master-data/tags/${managedReportTag!.id}`)
      .send({ version: managedReportTag!.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("cancels an appointment idempotently and blocks generic removal or update afterwards", async () => {
    const admin = await loginAdminAgent(app);
    const reservedTag = await ensureReservedCancellationTag();
    const customer = await createCustomerFixture("FT28-CANCEL");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [],
    });

    await admin.post(`/api/appointments/${appointment.id}/cancel`).expect(204);
    await admin.post(`/api/appointments/${appointment.id}/cancel`).expect(204);

    const detailResponse = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    expect(detailResponse.body.isCancelled).toBe(true);
    expect(
      (detailResponse.body.appointmentTags as Array<{ name: string }>).some(
        (tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
      ),
    ).toBe(false);

    const [relation] = await db
      .select({
        version: appointmentTags.version,
      })
      .from(appointmentTags)
      .where(and(
        eq(appointmentTags.appointmentId, appointment.id),
        eq(appointmentTags.tagId, reservedTag.id),
      ))
      .limit(1);

    expect(relation?.version).toBe(1);
    if (!relation) {
      throw new Error("Expected reserved cancellation tag relation for cancelled appointment.");
    }

    await admin
      .delete(`/api/appointments/${appointment.id}/tags/${reservedTag.id}`)
      .send({ version: relation.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLATION_TAG_PROTECTED");
      });

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: detailResponse.body.version,
        projectId: detailResponse.body.projectId,
        customerId: detailResponse.body.customerId,
        tourId: detailResponse.body.tourId,
        startDate: getRelativeBerlinDate(3),
        endDate: detailResponse.body.endDate,
        startTime: detailResponse.body.startTime,
        employeeIds: detailResponse.body.employees.map((employee: { id: number }) => employee.id),
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLED_APPOINTMENT_READONLY");
      });
  });
});
