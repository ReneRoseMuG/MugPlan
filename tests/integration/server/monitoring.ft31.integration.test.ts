/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FT31 liefert Disponent/Admin frische Monitoring-Treffer nur fuer zukuenftige Termine im Horizont.
 * - FT31-Admin-Konfiguration ist exklusiv fuer Admin les- und schreibbar.
 * - Monitoring wird live aus Terminmutationen berechnet, nicht aus dem Auth-Flow.
 * - Stornierte Termine werden im Monitoring ignoriert.
 * - FT04-Wochenplan-Entfernungen machen unterbesetzte Tour-Termine unmittelbar im Monitoring sichtbar.
 *
 * Fehlerfaelle:
 * - Reader kann Monitoring lesen oder konfigurieren.
 * - Vergangene bzw. ausserhalb des Horizonts liegende Termine erscheinen in der Trefferliste.
 * - Terminmutationen spiegeln sich nicht im anschliessenden Monitoring wider.
 * - Stornierte Termine bleiben trotz Storno als Treffer sichtbar.
 * - Unterbesetzungen aus der Wochenplanung bleiben fuer FT31 unsichtbar.
 *
 * Ziel:
 * FT31 end-to-end ueber API-, Persistenz- und Mutationspfad absichern.
 */

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { appointments, tags, tourWeekEmployees } from "../../../shared/schema";
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME } from "../../../shared/appointmentCancellation";
import { createApiTestApp, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createExactTagFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let userCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  userCounter = 1;
});

async function createRoleCredentials(roleCode: "ADMIN" | "DISPATCHER" | "READER") {
  const username = `ft31-${roleCode.toLowerCase()}-${userCounter}`;
  userCounter += 1;
  const password = `ft31-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT31",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return { username, password };
}

async function createRoleAgent(roleCode: "ADMIN" | "DISPATCHER" | "READER") {
  const credentials = await createRoleCredentials(roleCode);
  const agent = await loginAgent(app, credentials);
  return { agent, ...credentials };
}

async function configureMonitoring(agent: Awaited<ReturnType<typeof createRoleAgent>>["agent"], payload: {
  allAppointments: boolean;
  horizonDays: number;
  minimumEmployees: number;
}) {
  await agent.put("/api/admin/monitoring/config").send({
    tr01: payload,
  }).expect(200);
}

async function ensureReservedCancellationTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

describe("FT31 integration: monitoring", () => {
  it("returns under-staffed future appointments within the configured horizon for dispatcher/admin and rejects readers", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");
    const customer = await createCustomerFixture("FT31-CUST");
    const tour = await createTourFixture("#0055aa");
    const employeeA = await createEmployeeFixture("FT31-EMP");
    const employeeB = await createEmployeeFixture("FT31-EMP");

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 3,
      minimumEmployees: 2,
    });

    await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });
    await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employeeA.id, employeeB.id],
    });
    const historicalAppointment = await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });
    await db
      .update(appointments)
      .set({ startDate: getRelativeBerlinDate(-1) })
      .where(eq(appointments.id, historicalAppointment.id));
    await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(5),
      employeeIds: [],
    });

    const dispatcherResponse = await dispatcher.agent.get("/api/monitoring").expect(200);
    expect(dispatcherResponse.body).toHaveLength(1);
    expect(dispatcherResponse.body[0]).toMatchObject({
      startDate: getRelativeBerlinDate(1),
      tourName: tour.name,
      employeeCount: 0,
      triggerName: "TR-01 Ressourcenunterschreitung",
    });

    const adminResponse = await admin.agent.get("/api/monitoring").expect(200);
    expect(adminResponse.body).toHaveLength(1);

    await reader.agent.get("/api/monitoring").expect(403).expect(({ body }) => {
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  it("allows only admin to read and write the monitoring config and validates invalid payloads", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 14,
      minimumEmployees: 1,
    });

    const getResponse = await admin.agent.get("/api/admin/monitoring/config").expect(200);
    expect(getResponse.body).toEqual({
      tr01: {
        allAppointments: false,
        horizonDays: 14,
        minimumEmployees: 1,
      },
    });

    await admin.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        allAppointments: true,
        horizonDays: 5,
        minimumEmployees: 3,
      },
    }).expect(200).expect(({ body }) => {
      expect(body.tr01).toEqual({
        allAppointments: true,
        horizonDays: 5,
        minimumEmployees: 3,
      });
    });

    await admin.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        allAppointments: true,
        horizonDays: 0,
        minimumEmployees: 0,
      },
    }).expect(422);

    await dispatcher.agent.get("/api/admin/monitoring/config").expect(403);
    await dispatcher.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        allAppointments: false,
        horizonDays: 3,
        minimumEmployees: 2,
      },
    }).expect(403);

    const dispatcherResolved = await dispatcher.agent.get("/api/user-settings/resolved").expect(200);
    expect((dispatcherResolved.body as Array<{ key: string }>).some((entry) => entry.key.startsWith("monitoring."))).toBe(false);
  });

  it("recomputes monitoring live after a relevant appointment update", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-2FA-CUST");

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 2,
      minimumEmployees: 1,
    });
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(5),
      employeeIds: [],
    });
    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });

    const detailResponse = await admin.agent.get(`/api/appointments/${appointment.id}`).expect(200);

    await admin.agent.patch(`/api/appointments/${appointment.id}`).send({
      version: detailResponse.body.version,
      projectId: detailResponse.body.projectId,
      customerId: detailResponse.body.customerId,
      tourId: detailResponse.body.tourId,
      startDate: getRelativeBerlinDate(1),
      endDate: detailResponse.body.endDate,
      startTime: detailResponse.body.startTime,
      employeeIds: [],
    }).expect(200);

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        appointmentId: appointment.id,
        startDate: getRelativeBerlinDate(1),
        triggerName: "TR-01 Ressourcenunterschreitung",
      });
    });
  });

  it("ignores the configured horizon when all appointments is enabled", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-ALL-CUST");

    await configureMonitoring(admin.agent, {
      allAppointments: true,
      horizonDays: 1,
      minimumEmployees: 1,
    });
    const farFutureAppointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(40),
      employeeIds: [],
    });

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        appointmentId: farFutureAppointment.id,
        startDate: getRelativeBerlinDate(40),
        triggerName: "TR-01 Ressourcenunterschreitung",
      });
    });
  });

  it("ignores cancelled appointments after the one-way cancellation workflow", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-CANCEL-CUST");
    await ensureReservedCancellationTag();

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 3,
      minimumEmployees: 1,
    });

    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0].appointmentId).toBe(appointment.id);
    });

    await admin.agent.post(`/api/appointments/${appointment.id}/cancel`).send({ version: appointment.version }).expect(204);

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });
  });

  it("surfaces under-staffing after a FT04 week-plan removal", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-WEEK-REMOVE-CUST");
    const tour = await createTourFixture("#227799");
    const weekEmployee = await createEmployeeFixture("FT31-WEEK-REMOVE");
    const sideEmployee = await createEmployeeFixture("FT31-WEEK-SIDE");
    const startDate = getRelativeBerlinDate(15);
    const parsedStartDate = parseISO(startDate);
    const isoYear = getISOWeekYear(parsedStartDate);
    const isoWeek = getISOWeek(parsedStartDate);

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 30,
      minimumEmployees: 2,
    });

    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate,
      employeeIds: [weekEmployee.id, sideEmployee.id],
    });

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear,
      isoWeek,
      employeeId: weekEmployee.id,
    });
    const assignmentId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId);

    await admin.agent
      .delete(`/api/tours/${tour.id}/week-employees/${assignmentId}`)
      .send({
        isoYear,
        isoWeek,
        selectedAppointmentIds: [appointment.id],
      })
      .expect(200);

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        appointmentId: appointment.id,
        startDate,
        tourName: tour.name,
        employeeCount: 1,
        triggerName: "TR-01 Ressourcenunterschreitung",
      });
    });
  });
});
