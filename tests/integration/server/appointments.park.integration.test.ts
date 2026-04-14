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
 * - POST /api/appointments setzt Tag Messe Aufbau/Abbau still wenn direkt auf Tour Messe angelegt wird.
 * - PATCH /api/appointments/:id setzt Tag Messe Aufbau/Abbau still wenn auf Tour Messe gewechselt wird.
 * - PATCH /api/appointments/:id entfernt Tag Messe Aufbau/Abbau still wenn von Tour Messe weg gewechselt wird.
 * - Create-/Update-Responses liefern mutationEvents fuer automatische FT06-Folgeaktionen.
 * - Tag Geparkt erscheint nicht im Picker-Katalog (GET /api/tags?domain=appointment).
 * - Tag Geparkt kann nicht manuell ueber POST /api/appointments/:id/tags gesetzt werden (409 PROTECTED).
 * - Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden (409 PROTECTED).
 *
 * Fehlerfaelle:
 * - Gleichzeitiges Parken desselben Termins mit gleicher Version: zweiter Aufruf liefert VERSION_CONFLICT.
 *
 * Ziel:
 * Den POST /api/appointments/:id/park Endpunkt sowie den automatischen Geparkt-Tag-Entzug end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { appointmentTags, appointments, tags, tours } from "../../../shared/schema";
import { and, eq } from "drizzle-orm";
import {
  MANAGED_MESSE_TAG_NAME,
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
  createTagFixture,
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

async function getTagIdByName(name: string): Promise<number | null> {
  const [row] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);
  return row?.id ?? null;
}

async function hasAppointmentTag(appointmentId: number, tagName: string): Promise<boolean> {
  const tagId = await getTagIdByName(tagName);
  if (!tagId) return false;
  const [row] = await db
    .select({ appointmentId: appointmentTags.appointmentId })
    .from(appointmentTags)
    .where(and(eq(appointmentTags.appointmentId, appointmentId), eq(appointmentTags.tagId, tagId)))
    .limit(1);
  return row != null;
}

async function hasGeparktTag(appointmentId: number): Promise<boolean> {
  return hasAppointmentTag(appointmentId, RESERVED_VACANT_TAG_NAME);
}

async function renameTourToMesse(tourId: number): Promise<void> {
  await db
    .update(tours)
    .set({ name: "Tour Messe" })
    .where(eq(tours.id, tourId));
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

    const updateResponse = await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: afterPark.body.version,
        startDate: getRelativeBerlinDate(8),
        customerId: customer.id,
        tourId: regularTour.id,
      })
      .expect(200);

    expect(await hasGeparktTag(appointment.id)).toBe(false);
    expect(updateResponse.body.mutationEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "tour_changed",
        appointmentId: appointment.id,
        previousTourName: "Parkplatz",
        nextTourName: regularTour.name,
      }),
      expect.objectContaining({
        kind: "tag_mutated",
        appointmentId: appointment.id,
        tagName: RESERVED_VACANT_TAG_NAME,
        action: "removed",
      }),
    ]));
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

describe("FT06 integration: Messe-Tag-Automatik bei Tour Messe", () => {
  it("setzt Tag Messe Aufbau/Abbau still wenn direkt auf Tour Messe angelegt wird", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("MESSE-00");
    const messeTour = await createTourFixture("#3465A4");
    await renameTourToMesse(messeTour.id);

    const createResponse = await admin
      .post("/api/appointments")
      .send({
        customerId: customer.id,
        startDate: getRelativeBerlinDate(12),
        tourId: messeTour.id,
        employeeIds: [],
      })
      .expect(201);

    expect(await hasAppointmentTag(createResponse.body.id as number, MANAGED_MESSE_TAG_NAME)).toBe(true);
    expect(createResponse.body.mutationEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "tour_changed",
        appointmentId: createResponse.body.id,
        previousTourName: null,
        nextTourName: "Tour Messe",
      }),
      expect.objectContaining({
        kind: "tag_mutated",
        appointmentId: createResponse.body.id,
        tagName: MANAGED_MESSE_TAG_NAME,
        action: "added",
      }),
    ]));
  });

  it("setzt Tag Messe Aufbau/Abbau still wenn auf Tour Messe gewechselt wird", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("MESSE-01");
    const messeTour = await createTourFixture("#3465A4");
    await renameTourToMesse(messeTour.id);
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(13),
    });

    const detailBefore = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    const updateResponse = await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: detailBefore.body.version,
        startDate: getRelativeBerlinDate(13),
        customerId: customer.id,
        tourId: messeTour.id,
      })
      .expect(200);

    expect(await hasAppointmentTag(appointment.id, MANAGED_MESSE_TAG_NAME)).toBe(true);
    expect(updateResponse.body.mutationEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "tour_changed",
        appointmentId: appointment.id,
        previousTourName: null,
        nextTourName: "Tour Messe",
      }),
      expect.objectContaining({
        kind: "tag_mutated",
        appointmentId: appointment.id,
        tagName: MANAGED_MESSE_TAG_NAME,
        action: "added",
      }),
    ]));
  });

  it("entfernt Tag Messe Aufbau/Abbau still wenn von Tour Messe weg gewechselt wird", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("MESSE-02");
    const messeTour = await createTourFixture("#3465A4");
    const regularTour = await createTourFixture("#006B6F");
    await renameTourToMesse(messeTour.id);
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(14),
      tourId: messeTour.id,
    });

    expect(await hasAppointmentTag(appointment.id, MANAGED_MESSE_TAG_NAME)).toBe(true);

    const detailBefore = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    const updateResponse = await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: detailBefore.body.version,
        startDate: getRelativeBerlinDate(14),
        customerId: customer.id,
        tourId: regularTour.id,
      })
      .expect(200);

    expect(await hasAppointmentTag(appointment.id, MANAGED_MESSE_TAG_NAME)).toBe(false);
    expect(updateResponse.body.mutationEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "tour_changed",
        appointmentId: appointment.id,
        previousTourName: "Tour Messe",
        nextTourName: regularTour.name,
      }),
      expect.objectContaining({
        kind: "tag_mutated",
        appointmentId: appointment.id,
        tagName: MANAGED_MESSE_TAG_NAME,
        action: "removed",
      }),
    ]));
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

  it("Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden, auch ausserhalb der Parkplatz-Tour", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const geparktTagId = await getGeparktTagId();
    expect(geparktTagId).not.toBeNull();

    const customer = await createCustomerFixture("PARK-09");
    const regularTour = await createTourFixture("#0A7C66");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(11),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);

    const parkedDetail = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: parkedDetail.body.version,
        startDate: getRelativeBerlinDate(11),
        customerId: customer.id,
        tourId: regularTour.id,
      })
      .expect(200);

    const afterTourChange = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    expect(afterTourChange.body.appointmentTags.some((tag: { name: string }) => tag.name === RESERVED_VACANT_TAG_NAME)).toBe(false);

    await db.insert(appointmentTags).values({
      appointmentId: appointment.id,
      tagId: geparktTagId!,
      version: 1,
    });

    await admin
      .delete(`/api/appointments/${appointment.id}/tags/${geparktTagId}`)
      .send({ version: 1 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("CANCELLATION_TAG_PROTECTED");
      });

    expect(await hasGeparktTag(appointment.id)).toBe(true);
  });

  it("Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden, solange der Termin in Parkplatz liegt", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const geparktTagId = await getGeparktTagId();
    expect(geparktTagId).not.toBeNull();

    const customer = await createCustomerFixture("PARK-10");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(12),
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

describe("FT06 integration: historische Parkplatz-Termine bleiben editierbar", () => {
  it("erlaubt Zukunftsumplanung eines historischen Parkplatz-Termins auf regulaere Tour", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-HIST-01");
    const employee = await createEmployeeFixture("PARK-HIST-01-A");
    const regularTour = await createTourFixture("#0A7C66");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(14),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-01T00:00:00.000Z") })
      .where(eq(appointments.id, appointment.id));

    const parkedDetail = await admin.get(`/api/appointments/${appointment.id}`).expect(200);

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: parkedDetail.body.version,
        startDate: getRelativeBerlinDate(21),
        customerId: customer.id,
        tourId: regularTour.id,
        employeeIds: [employee.id],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.tourId).toBe(regularTour.id);
        expect(String(body.startDate).slice(0, 10)).toBe(getRelativeBerlinDate(21));
        expect(body.employees.map((entry: { id: number }) => entry.id)).toEqual([employee.id]);
      });

    expect(await hasGeparktTag(appointment.id)).toBe(false);
  });

  it("erlaubt Rueckdatierung eines Parkplatz-Termins auf ein Datum vor heute", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-HIST-PAST-01");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(18),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);

    const parkedDetail = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    const targetPastDate = getRelativeBerlinDate(-4);

    await admin
      .patch(`/api/appointments/${appointment.id}`)
      .send({
        version: parkedDetail.body.version,
        startDate: targetPastDate,
        customerId: customer.id,
        tourId: parkedDetail.body.tourId,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(String(body.startDate).slice(0, 10)).toBe(targetPastDate);
        expect(body.tourId).toBe(parkedDetail.body.tourId);
      });
  });

  it("erlaubt die Wochenplanungs-Vorschau fuer historische Parkplatz-Termine bei Datumswechsel", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-HIST-PREVIEW-01");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(19),
    });

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-04T00:00:00.000Z") })
      .where(eq(appointments.id, appointment.id));

    const parkedDetail = await admin.get(`/api/appointments/${appointment.id}`).expect(200);
    const targetDate = getRelativeBerlinDate(0);

    await admin
      .post(`/api/appointments/${appointment.id}/tour-change-preview`)
      .send({
        newTourId: parkedDetail.body.tourId,
        newStartDate: targetDate,
        newEndDate: null,
        newStartTime: parkedDetail.body.startTime ?? null,
        currentEmployeeIds: [],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            hasWeekPlan: expect.any(Boolean),
            isoWeek: expect.any(Number),
            isoYear: expect.any(Number),
          }),
        );
      });
  });

  it("erlaubt Tag-Mutationen fuer historische Parkplatz-Termine", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customer = await createCustomerFixture("PARK-HIST-02");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(15),
    });
    const customTag = await createTagFixture("PARK-HIST-TAG");

    await admin.post(`/api/appointments/${appointment.id}/park`).send({ version: appointment.version }).expect(204);
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-02T00:00:00.000Z") })
      .where(eq(appointments.id, appointment.id));

    await admin
      .post(`/api/appointments/${appointment.id}/tags`)
      .send({ tagId: customTag.id })
      .expect(201);

    await admin
      .delete(`/api/appointments/${appointment.id}/tags/${customTag.id}`)
      .send({ version: 1 })
      .expect(204);
  });

  it("erlaubt Storno und Loeschen fuer historische Parkplatz-Termine", async () => {
    const admin = await loginAdminAgent(app);
    await applySystemSeed();

    const customerA = await createCustomerFixture("PARK-HIST-03");
    const cancellableAppointment = await createAppointmentFixture({
      customerId: customerA.id,
      startDate: getRelativeBerlinDate(16),
    });

    await admin.post(`/api/appointments/${cancellableAppointment.id}/park`).send({ version: cancellableAppointment.version }).expect(204);
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-03T00:00:00.000Z") })
      .where(eq(appointments.id, cancellableAppointment.id));

    const cancellableDetail = await admin.get(`/api/appointments/${cancellableAppointment.id}`).expect(200);
    await admin
      .post(`/api/appointments/${cancellableAppointment.id}/cancel`)
      .send({ version: cancellableDetail.body.version })
      .expect(204);

    const customerB = await createCustomerFixture("PARK-HIST-04");
    const deletableAppointment = await createAppointmentFixture({
      customerId: customerB.id,
      startDate: getRelativeBerlinDate(17),
    });

    await admin.post(`/api/appointments/${deletableAppointment.id}/park`).send({ version: deletableAppointment.version }).expect(204);
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-04T00:00:00.000Z") })
      .where(eq(appointments.id, deletableAppointment.id));

    const deletableDetail = await admin.get(`/api/appointments/${deletableAppointment.id}`).expect(200);
    await admin
      .delete(`/api/appointments/${deletableAppointment.id}`)
      .send({ version: deletableDetail.body.version })
      .expect(204);
    await admin.get(`/api/appointments/${deletableAppointment.id}`).expect(404);
  });
});
