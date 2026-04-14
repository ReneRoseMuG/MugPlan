/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kalendernahe Appointment-PATCH-Mutationen koennen einen Termin auf ein anderes Zukunftsdatum verschieben.
 * - Ein erfolgreicher D&D-naher Move kann optional auch die Tour-Zuordnung mit uebernehmen.
 * - Reine D&D-Datumsverschiebungen liefern ohne FT06-Folgeaktion keine mutationEvents.
 *
 * Fehlerfaelle:
 * - Erfolgreiche Terminverschiebungen bleiben trotz 200-Response auf dem Ursprungsdatum stehen.
 * - Tour-Wechsel ueber den Kalender-Move wird serverseitig nicht uebernommen.
 *
 * Ziel:
 * Den positiven PATCH-Grundpfad fuer Drag-and-drop-nahe Terminmutationen serverseitig absichern.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createTourFixture,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetTestDataFactoryState();
});

async function fetchAppointmentDetail(agent: Awaited<ReturnType<typeof loginAdminAgent>>, appointmentId: number) {
  const response = await agent.get(`/api/appointments/${appointmentId}`).expect(200);
  return response.body as {
    id: number;
    version: number;
    projectId: number | null;
    customerId: number;
    startDate: string;
    startTime: string | null;
    tourId: number | null;
    employees: Array<{ id: number }>;
  };
}

describe("calendar drag and drop positive appointment mutations", () => {
  it("moves a future appointment to another future date via the public appointment patch endpoint", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixture("DD-SUCCESS-CUST");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-10-01",
    });
    const before = await fetchAppointmentDetail(admin, appointment.id);

    const response = await admin.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: before.projectId,
      customerId: before.customerId,
      tourId: before.tourId,
      startDate: "2099-10-05",
      startTime: before.startTime,
      employeeIds: before.employees.map((employee) => employee.id),
    }).expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      customerId: customer.id,
      tourId: null,
    });
    expect(response.body.mutationEvents).toBeUndefined();
    expect(String(response.body.startDate)).toContain("2099-10-05");
    expect(response.body.version).toBe(before.version + 1);

    await admin.get(`/api/appointments/${appointment.id}`).expect(200).expect(({ body }) => {
      expect(body.startDate).toBe("2099-10-05");
      expect(body.customerId).toBe(customer.id);
      expect(body.tourId).toBeNull();
    });
  });

  it("moves a future appointment and applies a new tour in the same patch request", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixture("DD-SUCCESS-TOUR-CUST");
    const targetTour = await createTourFixture("#2563eb");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-11-03",
      tourId: null,
    });
    const before = await fetchAppointmentDetail(admin, appointment.id);

    const response = await admin.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: before.projectId,
      customerId: before.customerId,
      tourId: targetTour.id,
      startDate: "2099-11-06",
      startTime: before.startTime,
      employeeIds: before.employees.map((employee) => employee.id),
    }).expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      customerId: customer.id,
      tourId: targetTour.id,
    });
    expect(String(response.body.startDate)).toContain("2099-11-06");

    await admin.get(`/api/appointments/${appointment.id}`).expect(200).expect(({ body }) => {
      expect(body.startDate).toBe("2099-11-06");
      expect(body.tourId).toBe(targetTour.id);
    });
  });
});
