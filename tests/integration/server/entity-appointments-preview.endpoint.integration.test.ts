/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - /api/customers/:id/appointments?scope=all liefert alle Termine des Kunden unabhaengig vom Datum.
 * - /api/employees/:id/appointments?scope=all liefert alle Termine des Mitarbeiters unabhaengig vom Datum.
 * - /api/projects/:projectId/appointments?fromDate=1900-01-01 liefert alle Termine des Projekts.
 * - scope=upcoming filtert vergangene Termine weiterhin heraus (Regressionssicherung).
 * - Fremdtermine anderer Entities erscheinen nicht im Response.
 * - Kein Termin vorhanden: leeres Array.
 * - Nicht-numerische IDs liefern 400.
 * - Ungueltige fromDate-Formate liefern 400.
 *
 * Fehlerfaelle:
 * - scope=all schliesst vergangene Termine aus (waere Regression der neuen Sichtbarkeitsregel).
 * - Fremdtermine tauchen im Response auf (Isolation verletzt).
 * - upcoming-Scope zeigt vergangene Termine (Regression des scope-Mechanismus).
 *
 * Ziel:
 * Die drei Datenquellen der EntityAppointmentsHoverPreview-Komponente auf die neue
 * "alle Termine"-Semantik und korrekte Scope-Filterung absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

describe("customer appointments preview endpoint", () => {
  it("liefert vergangene Termine bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-PAST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-CUST-PAST-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );

    const res = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
  });

  it("liefert zuekuenftige Termine bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-FUT" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-CUST-FUT-PROJ",
      customerId: customer.id,
    });
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
    });

    const res = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert gemischte Termine (vergangen + zukuenftig) bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-MIX" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-CUST-MIX-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-2)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
    });

    const res = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("schliesst Termine eines anderen Kunden aus", async () => {
    const admin = await loginAdminAgent(app);
    const customerA = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-ISO-A" });
    const customerB = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-ISO-B" });
    const projectB = await createProjectFixtureWithOverrides({
      prefix: "PREV-CUST-ISO-B-PROJ",
      customerId: customerB.id,
    });
    const appointmentB = await createAppointmentFixture({
      projectId: projectB.id,
      startDate: getRelativeBerlinDate(1),
    });

    const res = await admin
      .get(`/api/customers/${customerA.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(appointmentB.id);
  });

  it("liefert leeres Array wenn kein Termin vorhanden", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-EMPTY" });

    const res = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=all`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it("schliesst vergangene Termine bei scope=upcoming aus (Regressionssicherung)", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-SCOPE" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-CUST-SCOPE-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
    });

    const today = getRelativeBerlinDate(0);
    const res = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=upcoming&fromDate=${today}`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert 400 fuer nicht-numerische Kunden-ID", async () => {
    const admin = await loginAdminAgent(app);
    await admin.get("/api/customers/abc/appointments?scope=all").expect(400);
  });

  it("liefert 400 fuer ungueltigem fromDate-Format bei scope=upcoming", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-CUST-BADDATE" });
    await admin
      .get(`/api/customers/${customer.id}/appointments?scope=upcoming&fromDate=31-12-2025`)
      .expect(400);
  });
});

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

describe("employee appointments preview endpoint", () => {
  it("liefert vergangene Termine bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-PAST" });
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-EMP-PAST-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-EMP-PAST-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [employee.id],
    );

    const res = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
  });

  it("liefert zukuenftige Termine bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-FUT" });
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-EMP-FUT-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-EMP-FUT-PROJ",
      customerId: customer.id,
    });
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employee.id],
    });

    const res = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert gemischte Termine (vergangen + zukuenftig) bei scope=all", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-MIX" });
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-EMP-MIX-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-EMP-MIX-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-2)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [employee.id],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      employeeIds: [employee.id],
    });

    const res = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("schliesst Termine eines anderen Mitarbeiters aus", async () => {
    const admin = await loginAdminAgent(app);
    const employeeA = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-ISO-A" });
    const employeeB = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-ISO-B" });
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-EMP-ISO-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-EMP-ISO-PROJ",
      customerId: customer.id,
    });
    const appointmentB = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [employeeB.id],
    });

    const res = await admin
      .get(`/api/employees/${employeeA.id}/appointments?scope=all`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(appointmentB.id);
  });

  it("liefert leeres Array wenn kein Termin vorhanden", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-EMPTY" });

    const res = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it("schliesst vergangene Termine bei scope=upcoming aus (Regressionssicherung)", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixtureWithOverrides({ prefix: "PREV-EMP-SCOPE" });
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-EMP-SCOPE-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-EMP-SCOPE-PROJ",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [employee.id],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employee.id],
    });

    const today = getRelativeBerlinDate(0);
    const res = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=upcoming&fromDate=${today}`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert 400 fuer nicht-numerische Mitarbeiter-ID", async () => {
    const admin = await loginAdminAgent(app);
    await admin.get("/api/employees/abc/appointments?scope=all").expect(400);
  });
});

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

describe("project appointments preview endpoint", () => {
  it("liefert vergangene Termine bei fromDate=1900-01-01", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-PAST-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-PAST",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );

    const res = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
  });

  it("liefert zukuenftige Termine bei fromDate=1900-01-01", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-FUT-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-FUT",
      customerId: customer.id,
    });
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
    });

    const res = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert gemischte Termine (vergangen + zukuenftig) bei fromDate=1900-01-01", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-MIX-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-MIX",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-2)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
    });

    const res = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("schliesst Termine eines anderen Projekts aus", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-ISO-CUST" });
    const projectA = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-ISO-A",
      customerId: customer.id,
    });
    const projectB = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-ISO-B",
      customerId: customer.id,
    });
    const appointmentB = await createAppointmentFixture({
      projectId: projectB.id,
      startDate: getRelativeBerlinDate(1),
    });

    const res = await admin
      .get(`/api/projects/${projectA.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(appointmentB.id);
  });

  it("liefert leeres Array wenn kein Termin vorhanden", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-EMPTY-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-EMPTY",
      customerId: customer.id,
    });

    const res = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it("schliesst vergangene Termine bei fromDate=heute aus (Regressionssicherung)", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-SCOPE-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-SCOPE",
      customerId: customer.id,
    });
    const pastAppointment = await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: customer.id,
        tourId: null,
        title: "past appointment",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );
    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
    });

    const today = getRelativeBerlinDate(0);
    const res = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=${today}`)
      .expect(200);

    const ids = (res.body as Array<{ id: number }>).map((a) => a.id);
    expect(ids).not.toContain(pastAppointment.id);
    expect(ids).toContain(futureAppointment.id);
  });

  it("liefert 400 fuer nicht-numerische Projekt-ID", async () => {
    const admin = await loginAdminAgent(app);
    await admin.get("/api/projects/abc/appointments?fromDate=1900-01-01").expect(400);
  });

  it("liefert 400 fuer ungueltigem fromDate-Format", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixtureWithOverrides({ prefix: "PREV-PROJ-BADDATE-CUST" });
    const project = await createProjectFixtureWithOverrides({
      prefix: "PREV-PROJ-BADDATE",
      customerId: customer.id,
    });
    await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=31-12-2025`)
      .expect(400);
  });
});
