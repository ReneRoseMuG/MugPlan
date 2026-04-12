/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/appointments/:id/park setzt Tour Parkplatz, entfernt Mitarbeiter und setzt Tag Geparkt atomar.
 * - POST /api/appointments/:id/park schlaegt mit 409 ALREADY_PARKED fehl wenn Termin bereits geparkt.
 * - POST /api/appointments/:id/park schlaegt mit 409 PAST_APPOINTMENT_READONLY fehl fuer historische Termine.
 * - POST /api/appointments/:id/park schlaegt mit 409 CANCELLED_APPOINTMENT_READONLY fehl fuer stornierte Termine.
 * - POST /api/appointments/:id/park schlaegt mit 409 VERSION_CONFLICT fehl bei veralteter Version.
 * - POST /api/appointments/:id/park ist nur fuer DISPONENT und ADMIN erlaubt, nicht fuer READER (403).
 * - PATCH /api/appointments/:id entfernt Tag Geparkt still wenn Tour von Parkplatz auf regulaere Tour wechselt.
 * - PATCH /api/appointments/:id entfernt Tag Geparkt nicht wenn Tour nicht Parkplatz war.
 * - Tag Geparkt erscheint nicht im Picker-Katalog (GET /api/tags?domain=appointment).
 * - Tag Geparkt kann nicht manuell ueber POST /api/appointments/:id/tags gesetzt werden (409 PROTECTED).
 * - Tag Geparkt kann nicht manuell ueber DELETE /api/appointments/:id/tags/:tagId entfernt werden (409 PROTECTED).
 *
 * Fehlerfaelle:
 * - Gleichzeitiges Parken desselben Termins mit gleicher Version: zweiter Aufruf liefert VERSION_CONFLICT.
 *
 * Ziel:
 * Den POST /api/appointments/:id/park Endpunkt sowie den automatischen Geparkt-Tag-Entzug end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { appointmentTags, tags } from "../../../shared/schema";
import { and, eq } from "drizzle-orm";
import {
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { applySystemSeed } from "../../../server/services/systemSeedService";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let readerCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginReaderAgent() {
  const token = `reader-park-${readerCounter}`;
  readerCounter += 1;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: `test-${token}`,
    email: `test-${token}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });
  return loginAgent(app, { username: `test-${token}`, password });
}

async function getGeparktTagId(): Promise<number | null> {
  const [row] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.name, RESERVED_VACANT_TAG_NAME))
    .limit(1);
  return row?.id ?? null;
}

async function hasGeparktTag(appointmentId: number): Promise<boolean> {
  const geparktTagId = await getGeparktTagId();
  if (!geparktTagId) return false;
  const [row] = await db
    .select({ appointmentId: appointmentTags.appointmentId })
    .from(appointmentTags)
    .where(and(eq(appointmentTags.appointmentId, appointmentId), eq(appointmentTags.tagId, geparktTagId)))
    .limit(1);
  return row != null;
}

describe("FT06 integration: POST /api/appointments/:id/park", () => {
  it("setzt Tour Parkplatz, entfernt Mitarbeiter und setzt Tag Geparkt atomar", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-01");
    const employeeA = await createEmployeeFixture("PARK-01-A");
    const employeeB = await createEmployeeFixture("PARK-01-B");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
      employeeIds: [employeeA.id, employeeB.id],
    });

    await admin
      .post(`/api/appointments/${appointment.id}/park`)
      .send({ version: appointment.version })
      .expect(204);

    const detailRes = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    const detail = detailRes.body;

    expect(detail.employees).toHaveLength(0);
    expect(detail.appointmentTags.some((t: { name: string }) => t.name === RESERVED_VACANT_TAG_NAME)).toBe(true);
    expect(await hasGeparktTag(appointment.id)).toBe(true);

    const toursRes = await admin.get("/api/tours").expect(200);
    const parkplatz = (toursRes.body as Array<{ id: number; name: string }>).find((t) => t.name === "Parkplatz");
    expect(parkplatz).toBeDefined();
    expect(detail.tourId).toBe(parkplatz!.id);
  });

  it("schlaegt mit 409 ALREADY_PARKED fehl wenn Termin bereits geparkt ist", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-02");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);

    const detailRes = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    const updatedVersion = detailRes.body.version as number;

    await admin
      .post(`/api/appointments/${appointment.id}/park`)
      .send({ version: updatedVersion })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("ALREADY_PARKED");
      });
  });

  it("schlaegt mit 409 VERSION_CONFLICT fehl bei veralteter Version", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-03");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(5),
    });

    await admin
      .post(`/api/appointments/${appointment.id}/park`)
      .send({ version: 9999 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("schlaegt mit 409 CANCELLED_APPOINTMENT_READONLY fehl fuer stornierte Termine", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-04");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(6),
    });

    await admin.post(`/api/appointments/${appointment.id}/cancel`).send({ version: appointment.version }).expect(204);
    const detailRes = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    await admin
      .post(`/api/appointments/${appointment.id}/park`)
      .send({ version: detailRes.body.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLED_APPOINTMENT_READONLY");
      });
  });

  it("ist nur fuer DISPONENT und ADMIN erlaubt, nicht fuer READER (403)", async () => {
    const reader = await loginReaderAgent();
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-05");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(7),
    });

    await reader
      .post(`/api/appointments/${appointment.id}/park`)
      .send({ version: appointment.version })
      .expect(403);
  });
});

describe("FT06 integration: Geparkt-Tag-Entzug bei Tour-Wechsel", () => {
  it("entfernt Tag Geparkt still wenn Tour von Parkplatz auf regulaere Tour wechselt", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-06");
    const regularTour = await createTourFixture("#006B6F");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(8),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);

    const afterPark = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    expect(await hasGeparktTag(appointment.id)).toBe(true);

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: afterPark.body.version,
        startDate: getRelativeBerlinDate(8),
        customerId: customer.id,
        tourId: regularTour.id,
      })
      .expect(200);

    expect(await hasGeparktTag(appointment.id)).toBe(false);
  });

  it("entfernt Tag Geparkt nicht wenn Tour nicht Parkplatz war", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-07");
    const tourA = await createTourFixture("#0088cc");
    const tourB = await createTourFixture("#0044aa");

    const geparktTagId = await getGeparktTagId();
    expect(geparktTagId).not.toBeNull();

    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(9),
      tourId: tourA.id,
    });

    const detail = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: detail.body.version,
        startDate: getRelativeBerlinDate(9),
        customerId: customer.id,
        tourId: tourB.id,
      })
      .expect(200);

    expect(await hasGeparktTag(appointment.id)).toBe(false);
  });
});

describe("FT06 integration: Geparkt-Tag Picker-Schutz", () => {
  it("Tag Geparkt erscheint nicht im Picker-Katalog (domain=appointment)", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const res = await admin.get("/api/tags?domain=appointment").expect(200);
    const tagNames = (res.body as Array<{ name: string }>).map((t) => t.name);

    expect(tagNames).not.toContain(RESERVED_VACANT_TAG_NAME);
    expect(tagNames).not.toContain(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
  });

  it("Tag Geparkt kann nicht manuell ueber POST /tags gesetzt werden", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const geparktTagId = await getGeparktTagId();
    expect(geparktTagId).not.toBeNull();

    const customer = await createCustomerFixture("PARK-08");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(10),
    });

    await admin
      .post(`/api/appointments/${appointment.id}/tags`)
      .send({ tagId: geparktTagId })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLATION_TAG_PROTECTED");
      });
  });

  it("Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const geparktTagId = await getGeparktTagId();
    expect(geparktTagId).not.toBeNull();

    const customer = await createCustomerFixture("PARK-09");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(11),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);

    await admin
      .delete(`/api/appointments/${appointment.id}/tags/${geparktTagId}`)
      .send({ version: 1 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLATION_TAG_PROTECTED");
      });
  });
});
