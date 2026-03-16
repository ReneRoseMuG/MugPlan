/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FT31 liefert Disponent/Admin frische Monitoring-Treffer nur fuer zukuenftige Termine im Horizont.
 * - FT31-Admin-Konfiguration ist exklusiv fuer Admin les- und schreibbar.
 * - Monitoring wird live aus Terminmutationen berechnet, nicht aus dem Auth-Flow.
 *
 * Fehlerfaelle:
 * - Reader kann Monitoring lesen oder konfigurieren.
 * - Vergangene bzw. ausserhalb des Horizonts liegende Termine erscheinen in der Trefferliste.
 * - Terminmutationen spiegeln sich nicht im anschliessenden Monitoring wider.
 *
 * Ziel:
 * FT31 end-to-end ueber API-, Persistenz- und Mutationspfad absichern.
 */

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { appointments } from "../../../shared/schema";
import { createApiTestApp, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

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
  enabled: boolean;
  horizonDays: number;
  minimumEmployees: number;
}) {
  await agent.put("/api/admin/monitoring/config").send({
    tr01: payload,
  }).expect(200);
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
      enabled: true,
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
      enabled: false,
      horizonDays: 14,
      minimumEmployees: 1,
    });

    const getResponse = await admin.agent.get("/api/admin/monitoring/config").expect(200);
    expect(getResponse.body).toEqual({
      tr01: {
        enabled: false,
        horizonDays: 14,
        minimumEmployees: 1,
      },
    });

    await admin.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        enabled: true,
        horizonDays: 5,
        minimumEmployees: 3,
      },
    }).expect(200).expect(({ body }) => {
      expect(body.tr01).toEqual({
        enabled: true,
        horizonDays: 5,
        minimumEmployees: 3,
      });
    });

    await admin.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        enabled: true,
        horizonDays: 0,
        minimumEmployees: 0,
      },
    }).expect(422);

    await dispatcher.agent.get("/api/admin/monitoring/config").expect(403);
    await dispatcher.agent.put("/api/admin/monitoring/config").send({
      tr01: {
        enabled: true,
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
      enabled: true,
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
});
