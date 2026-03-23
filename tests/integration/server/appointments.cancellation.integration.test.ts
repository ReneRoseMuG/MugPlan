/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Public-Tagkatalog filtert geschuetzte System-Tags domänenspezifisch fuer Picker.
 * - Ohne Domain-Query entspricht `/api/tags` der restriktiven appointment-Sicht.
 * - Die Admin-Tagverwaltung normalisiert geschuetzte System-Tags auf isDefault=true und blockiert Update/Delete.
 * - Der Einweg-Storno setzt den reservierten Tag idempotent, zieht Mitarbeiter ab und setzt den Projektbetrag auf 0.
 * - Das Entfernen des reservierten Tags ueber den generischen Termin-Tag-Pfad ist blockiert.
 *
 * Fehlerfaelle:
 * - System-Tags erscheinen im falschen Picker-Kontext.
 * - Der reservierte Tag kann in den Stammdaten umbenannt oder geloescht werden.
 * - Projektgebundene Stornos behalten den bisherigen Projektbetrag.
 * - Ein stornierter Termin bleibt ueber normale Mutationspfade veraenderbar.
 *
 * Ziel:
 * Den reservierten Einweg-Storno ueber bestehende Tag-Infrastruktur end-to-end absichern.
 */
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { appointmentEmployees, appointmentTags, projectOrder, tags } from "../../../shared/schema";
import {
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import * as projectsService from "../../../server/services/projectsService";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("FT01/FT28 integration: appointment cancellation workflow", () => {
  it("filters protected system tags per picker domain, auto-creates them, and keeps them protected in admin master data", async () => {
    const admin = await loginAdminAgent(app);

    await admin.get("/api/tags").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME)).toBe(true);
    });

    await admin.get("/api/tags?domain=appointment").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME)).toBe(true);
    });

    await admin.get("/api/tags?domain=project").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string; color: string }>)).toContainEqual(
        expect.objectContaining({
          name: MANAGED_REPORT_EXCLUSION_TAG_NAME,
          color: "#f97316",
        }),
      );
      expect((body as Array<{ name: string; color: string }>)).toContainEqual(
        expect.objectContaining({
          name: MANAGED_SPECIAL_MEASURE_TAG_NAME,
          color: "#1e3a8a",
        }),
      );
    });

    await admin.get("/api/tags?domain=customer").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME)).toBe(false);
    });

    await admin.get("/api/tags?domain=employee").expect(200).expect(({ body }) => {
      expect(Array.isArray(body)).toBe(true);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toBe(false);
      expect((body as Array<{ name: string }>).some((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME)).toBe(false);
    });

    let managedReportTag: { id: number; name: string; version: number; isDefault: boolean } | undefined;
    let managedSpecialMeasureTag: { id: number; name: string; version: number; isDefault: boolean; color: string } | undefined;
    let normalizedCancellationTag: { id: number; name: string; version: number; isDefault: boolean; color: string } | undefined;
    await admin.get("/api/admin/master-data/tags").expect(200).expect(({ body }) => {
      normalizedCancellationTag = (body as Array<{ id: number; name: string; version: number; isDefault: boolean; color: string }>).find(
        (tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
      );
      managedReportTag = (body as Array<{ id: number; name: string; version: number; isDefault: boolean }>).find(
        (tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME,
      );
      managedSpecialMeasureTag = (body as Array<{ id: number; name: string; version: number; isDefault: boolean; color: string }>).find(
        (tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME,
      );
    });
    expect(normalizedCancellationTag).toBeDefined();
    expect(normalizedCancellationTag?.color).toBe(RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR);
    expect(normalizedCancellationTag?.isDefault).toBe(true);
    expect(managedReportTag).toBeDefined();
    expect(managedReportTag?.isDefault).toBe(true);
    expect(managedSpecialMeasureTag).toBeDefined();
    expect(managedSpecialMeasureTag?.color).toBe("#1e3a8a");
    expect(managedSpecialMeasureTag?.isDefault).toBe(true);

    await admin
      .put(`/api/admin/master-data/tags/${normalizedCancellationTag!.id}`)
      .send({ name: "Storno-Tag-Edit", version: normalizedCancellationTag!.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .delete(`/api/admin/master-data/tags/${normalizedCancellationTag!.id}`)
      .send({ version: normalizedCancellationTag!.version })
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

    await admin
      .put(`/api/admin/master-data/tags/${managedSpecialMeasureTag!.id}`)
      .send({ name: "Sondermaß Neu", version: managedSpecialMeasureTag!.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .delete(`/api/admin/master-data/tags/${managedSpecialMeasureTag!.id}`)
      .send({ version: managedSpecialMeasureTag!.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("cancels an appointment idempotently and blocks generic removal or update afterwards", async () => {
    const admin = await loginAdminAgent(app);
    const [existingCancellationTag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
      .limit(1);
    if (existingCancellationTag) {
      await db.delete(appointmentTags).where(eq(appointmentTags.tagId, existingCancellationTag.id));
      await db.delete(tags).where(eq(tags.id, existingCancellationTag.id));
    }
    const project = await createProjectFixture({ prefix: "FT28-CANCEL" });
    await projectsService.updateProject(project.id, {
      version: project.version,
      amount: "1234.50",
      projectOrder: {
        amount: "1234.50",
      },
    });
    const employeeA = await createEmployeeFixture("FT28-CANCEL-EMP");
    const employeeB = await createEmployeeFixture("FT28-CANCEL-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employeeA.id, employeeB.id],
    });

    await admin.post(`/api/appointments/${appointment.id}/cancel`).expect(204);
    await admin.post(`/api/appointments/${appointment.id}/cancel`).expect(204);

    const detailResponse = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    expect(detailResponse.body.isCancelled).toBe(true);
    expect(detailResponse.body.employees).toEqual([]);
    expect(
      (detailResponse.body.appointmentTags as Array<{ name: string }>).some(
        (tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
      ),
    ).toBe(true);
    const employeeRelationsAfterCancel = await db
      .select({ employeeId: appointmentEmployees.employeeId })
      .from(appointmentEmployees)
      .where(eq(appointmentEmployees.appointmentId, appointment.id));
    expect(employeeRelationsAfterCancel).toEqual([]);
    const [projectOrderAfterCancel] = await db
      .select({ amount: projectOrder.amount })
      .from(projectOrder)
      .where(eq(projectOrder.projectId, project.id))
      .limit(1);
    expect(projectOrderAfterCancel?.amount).toBe("0.00");

    const [reservedTag] = await db
      .select({
        id: tags.id,
        color: tags.color,
        isDefault: tags.isDefault,
      })
      .from(tags)
      .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
      .limit(1);
    expect(reservedTag).toMatchObject({
      color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
      isDefault: true,
    });
    if (!reservedTag) {
      throw new Error("Expected reserved cancellation tag to be auto-created.");
    }

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

  it("repairs pre-existing cancelled appointments by clearing lingering employee assignments", async () => {
    const admin = await loginAdminAgent(app);
    await admin.get("/api/admin/master-data/tags").expect(200);
    const customer = await createCustomerFixture("FT28-CANCEL-REPAIR");
    const employee = await createEmployeeFixture("FT28-CANCEL-REPAIR-EMP");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employee.id],
    });

    const [reservedTag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
      .limit(1);
    if (!reservedTag) {
      throw new Error("Expected reserved cancellation tag to exist.");
    }

    await db.insert(appointmentTags).values({
      appointmentId: appointment.id,
      tagId: reservedTag.id,
      version: 1,
    });

    await admin.post(`/api/appointments/${appointment.id}/cancel`).expect(204);

    const detailResponse = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    expect(detailResponse.body.isCancelled).toBe(true);
    expect(detailResponse.body.employees).toEqual([]);

    const employeeRelationsAfterRepair = await db
      .select({ employeeId: appointmentEmployees.employeeId })
      .from(appointmentEmployees)
      .where(eq(appointmentEmployees.appointmentId, appointment.id));
    expect(employeeRelationsAfterRepair).toEqual([]);
  });
});
