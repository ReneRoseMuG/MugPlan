/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FT31 liefert Disponent/Admin frische Monitoring-Treffer fuer TR-01 und TR-02 aus echten Termindaten.
 * - FT31-Admin-Konfiguration ist exklusiv fuer Admin les- und schreibbar.
 * - Ein Termin mit beiden Triggern erscheint genau einmal mit kombinierter Triggeranzeige.
 * - Stornierte und historische Termine werden fuer beide Trigger ignoriert.
 * - FT04-Wochenplan-Entfernungen machen unterbesetzte Tour-Termine unmittelbar im Monitoring sichtbar.
 *
 * Fehlerfaelle:
 * - Leser verliert den freigegebenen Monitoring-Lesezugriff oder erhält fälschlich Admin-Konfigrechte.
 * - Geparkte Termine fehlen trotz System-Tag im Monitoring.
 * - Stornierte oder historische Treffer bleiben sichtbar.
 * - TR-01-Konfiguration beeinflusst faelschlich den Geparkt-Trigger.
 *
 * Ziel:
 * FT31 end-to-end ueber API-, Persistenz- und Mutationspfad fuer beide Trigger absichern.
 */

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { appointments, tags, tourWeekEmployees } from "../../../shared/schema";
import {
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { createApiTestApp, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createExactTagFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { applySystemSeed } from "../../../server/services/systemSeedService";

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

async function parkAppointment(agent: Awaited<ReturnType<typeof createRoleAgent>>["agent"], appointmentId: number, version: number) {
  await applySystemSeed();
  await agent.post(`/api/appointments/${appointmentId}/park`).send({ version }).expect(204);
}

describe("FT31 integration: monitoring", () => {
  it("returns TR-01 only for under-staffed appointments and allows readers to read", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");
    const customer = await createCustomerFixture("FT31-CUST");
    const project = await createProjectFixture({
      prefix: "FT31-PROJ",
      customerId: customer.id,
      name: "FT31 Monitoring Projekt",
    });
    const tour = await createTourFixture("#0055aa");
    const employeeA = await createEmployeeFixture("FT31-EMP");
    const employeeB = await createEmployeeFixture("FT31-EMP");

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 3,
      minimumEmployees: 2,
    });

    const underStaffed = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });
    const directCustomerUnderStaffed = await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: getRelativeBerlinDate(2),
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

    const dispatcherResponse = await dispatcher.agent.get("/api/monitoring").expect(200);
    expect(dispatcherResponse.body).toEqual([
      expect.objectContaining({
        appointmentId: underStaffed.id,
        startDate: getRelativeBerlinDate(1),
        tourId: tour.id,
        tourName: tour.name,
        orderNumber: project.orderNumber ?? null,
        projectTitle: project.name,
        customerNumber: customer.customerNumber,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        employeeCount: 0,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      }),
      expect.objectContaining({
        appointmentId: directCustomerUnderStaffed.id,
        startDate: getRelativeBerlinDate(2),
        tourId: tour.id,
        tourName: tour.name,
        orderNumber: null,
        projectTitle: null,
        customerNumber: customer.customerNumber,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        employeeCount: 0,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      }),
    ]);

    const adminResponse = await admin.agent.get("/api/monitoring").expect(200);
    expect(adminResponse.body).toHaveLength(2);

    await reader.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toHaveLength(2);
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          appointmentId: underStaffed.id,
          triggerCode: "TR-01",
        }),
        expect.objectContaining({
          appointmentId: directCustomerUnderStaffed.id,
          triggerCode: "TR-01",
        }),
      ]));
    });
  });

  it("returns one row per parked appointment and combines both triggers on under-staffed parked appointments", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-PARK-CUST");
    const employeeA = await createEmployeeFixture("FT31-PARK-A");
    const employeeB = await createEmployeeFixture("FT31-PARK-B");
    const employeeC = await createEmployeeFixture("FT31-PARK-C");

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 10,
      minimumEmployees: 2,
    });

    const parkedOnly = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employeeA.id, employeeB.id],
    });
    const parkedAndUnderStaffed = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
      employeeIds: [employeeA.id],
    });

    await parkAppointment(admin.agent, parkedOnly.id, parkedOnly.version);
    const parkedOnlyDetail = await admin.agent.get(`/api/appointments/${parkedOnly.id}`).expect(200);
    await admin.agent
      .patch(`/api/appointments/${parkedOnly.id}`)
      .send({
        version: parkedOnlyDetail.body.version,
        projectId: parkedOnlyDetail.body.projectId,
        customerId: parkedOnlyDetail.body.customerId,
        tourId: parkedOnlyDetail.body.tourId,
        startDate: parkedOnlyDetail.body.startDate,
        endDate: parkedOnlyDetail.body.endDate,
        startTime: parkedOnlyDetail.body.startTime,
        employeeIds: [employeeB.id, employeeC.id],
      })
      .expect(200);
    const parkedUnderStaffedDetail = await admin.agent.get(`/api/appointments/${parkedAndUnderStaffed.id}`).expect(200);
    await parkAppointment(admin.agent, parkedAndUnderStaffed.id, parkedUnderStaffedDetail.body.version);

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          appointmentId: parkedOnly.id,
          triggerCode: "TR-02",
          triggerCodes: ["TR-02"],
          triggerName: "Geparkt",
        }),
        expect.objectContaining({
          appointmentId: parkedAndUnderStaffed.id,
          triggerCode: "TR-01",
          triggerCodes: ["TR-01", "TR-02"],
          triggerName: "Mindestzahl Mitarbeiter + Geparkt",
        }),
      ]));
      expect((body as Array<{ appointmentId: number; triggerCode: string }>).filter((item) => item.appointmentId === parkedOnly.id)).toHaveLength(1);
      expect((body as Array<{ appointmentId: number }>).filter((item) => item.appointmentId === parkedAndUnderStaffed.id)).toHaveLength(1);
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

  it("recomputes monitoring live after a relevant appointment update and honors allAppointments for far-future hits", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-UPDATE-CUST");

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
      expect(body).toEqual([
        expect.objectContaining({
          appointmentId: appointment.id,
          startDate: getRelativeBerlinDate(1),
          triggerCode: "TR-01",
          triggerCodes: ["TR-01"],
          triggerName: "Mindestzahl Mitarbeiter",
        }),
      ]);
    });

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
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          appointmentId: farFutureAppointment.id,
          startDate: getRelativeBerlinDate(40),
          triggerCode: "TR-01",
          triggerCodes: ["TR-01"],
        }),
      ]));
    });
  });

  it("ignores cancelled and historical parked appointments", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-CANCEL-CUST");
    await ensureReservedCancellationTag();
    await applySystemSeed();

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 10,
      minimumEmployees: 1,
    });

    const cancelled = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });
    const historical = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [],
    });

    await parkAppointment(admin.agent, cancelled.id, cancelled.version);
    const cancelledDetail = await admin.agent.get(`/api/appointments/${cancelled.id}`).expect(200);
    await admin.agent.post(`/api/appointments/${cancelled.id}/cancel`).send({ version: cancelledDetail.body.version }).expect(204);

    await parkAppointment(admin.agent, historical.id, historical.version);
    await db
      .update(appointments)
      .set({ startDate: getRelativeBerlinDate(-1) })
      .where(eq(appointments.id, historical.id));

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });
  });

  it("keeps TR-02 stable while TR-01 reacts to config changes", async () => {
    const admin = await createRoleAgent("ADMIN");
    const customer = await createCustomerFixture("FT31-CONFIG-CUST");
    const employeeA = await createEmployeeFixture("FT31-CONFIG-A");
    const employeeB = await createEmployeeFixture("FT31-CONFIG-B");
    const employeeC = await createEmployeeFixture("FT31-CONFIG-C");

    const underStaffed = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employeeA.id],
    });
    const parkedOnly = await createAppointmentFixture({
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
      employeeIds: [employeeB.id, employeeC.id],
    });

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 10,
      minimumEmployees: 2,
    });
    await parkAppointment(admin.agent, parkedOnly.id, parkedOnly.version);
    const parkedOnlyDetail = await admin.agent.get(`/api/appointments/${parkedOnly.id}`).expect(200);
    await admin.agent
      .patch(`/api/appointments/${parkedOnly.id}`)
      .send({
        version: parkedOnlyDetail.body.version,
        projectId: parkedOnlyDetail.body.projectId,
        customerId: parkedOnlyDetail.body.customerId,
        tourId: parkedOnlyDetail.body.tourId,
        startDate: parkedOnlyDetail.body.startDate,
        endDate: parkedOnlyDetail.body.endDate,
        startTime: parkedOnlyDetail.body.startTime,
        employeeIds: [employeeB.id, employeeC.id],
      })
      .expect(200);

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({ appointmentId: underStaffed.id, triggerCode: "TR-01", triggerCodes: ["TR-01"] }),
        expect.objectContaining({ appointmentId: parkedOnly.id, triggerCode: "TR-02", triggerCodes: ["TR-02"] }),
      ]));
    });

    await configureMonitoring(admin.agent, {
      allAppointments: false,
      horizonDays: 10,
      minimumEmployees: 1,
    });

    await admin.agent.get("/api/monitoring").expect(200).expect(({ body }) => {
      expect(body).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ appointmentId: underStaffed.id, triggerCode: "TR-01" }),
      ]));
      expect(body).toEqual([
        expect.objectContaining({ appointmentId: parkedOnly.id, triggerCode: "TR-02", triggerCodes: ["TR-02"] }),
      ]);
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
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
        triggerName: "Mindestzahl Mitarbeiter",
      });
    });
  });
});
