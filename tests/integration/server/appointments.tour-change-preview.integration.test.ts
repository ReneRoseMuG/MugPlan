/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der normale `tour-change-preview`-Endpoint liefert bei bestehender Ziel-Wochenplanung echte Vorschau-Daten.
 * - Ein Termin auf derselben Tour bewertet beim Wechsel in eine andere ISO-KW die Ziel-Wochenplanung neu.
 * - Ein Termin ohne Tour kann beim spaeteren Setzen einer Tour mit Wochenplanung die geplanten Mitarbeiter vorab lesen.
 *
 * Fehlerfaelle:
 * - Der Appointment-Preview-Endpunkt meldet trotz vorhandener Ziel-Wochenplanung `hasWeekPlan=false`.
 * - Der KW-Wechsel derselben Tour ignoriert die Ziel-KW und liefert weiter die alte Planung.
 * - Das spaetere Setzen einer Tour ohne bestehende Termin-Mitarbeiter liefert keine uebernehmbaren Wochenplan-Mitarbeiter.
 *
 * Ziel:
 * Den normalen API-Pfad `/api/appointments/:id/tour-change-preview` ausserhalb des Parkplatz-Sonderfalls end-to-end absichern.
 */
import type express from "express";
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../../server/db";
import { appointmentEmployees, appointments, tourWeekEmployees } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: express.Express;
let roleAgentCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

async function loginRole(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const token = `tcp-${roleCode.toLowerCase()}-${roleAgentCounter}`;
  roleAgentCounter += 1;
  const username = `test-${token}`;
  const password = `${token}-password`;
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "TourChange",
    lastName: roleCode,
    passwordHash: await hashPassword(password),
    roleCode,
  });
  return loginAgent(app, { username, password });
}

function resolveNextEditableWeek() {
  const nextWeekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 1));
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(addDays(nextWeekStart, 1), "yyyy-MM-dd"),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
  };
}

describe("FT04 integration: appointment tour change preview", () => {
  it("re-evaluates week planning when an appointment on the same tour moves into another ISO week", async () => {
    const admin = await loginAdmin();
    const sourceWeek = resolveNextEditableWeek();
    const targetWeekStart = startOfISOWeek(addWeeks(parseISO(sourceWeek.weekStartDate), 1));
    const targetWeekSecondDate = format(addDays(targetWeekStart, 1), "yyyy-MM-dd");
    const project = await createProjectFixture({ prefix: "FT04-TCP-SAME-TOUR" });
    const tour = await createTourFixture("#336688");
    const currentEmployee = await createEmployeeFixture("FT04-TCP-CURRENT");
    const plannedEmployee = await createEmployeeFixture("FT04-TCP-WEEK");

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: getISOWeekYear(targetWeekStart),
      isoWeek: getISOWeek(targetWeekStart),
      employeeId: plannedEmployee.id,
    });

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: sourceWeek.weekSecondDate,
      tourId: tour.id,
      employeeIds: [currentEmployee.id],
    });

    await admin
      .post(`/api/appointments/${appointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: targetWeekSecondDate,
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [currentEmployee.id],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({
          isoYear: getISOWeekYear(targetWeekStart),
          isoWeek: getISOWeek(targetWeekStart),
          hasWeekPlan: true,
          currentEmployeeIds: [currentEmployee.id],
        }));
        expect(body.items).toEqual(expect.arrayContaining([
          expect.objectContaining({
            employeeId: currentEmployee.id,
            status: "current_only",
            selectable: false,
            conflictReason: null,
          }),
          expect.objectContaining({
            employeeId: plannedEmployee.id,
            status: "will_add",
            selectable: true,
            conflictReason: null,
          }),
        ]));
      });
  });

  it("returns planned employees when an existing appointment without tour later gets a tour with week planning", async () => {
    const admin = await loginAdmin();
    const targetWeek = resolveNextEditableWeek();
    const project = await createProjectFixture({ prefix: "FT04-TCP-ADD-TOUR" });
    const tour = await createTourFixture("#2563eb");
    const plannedEmployee = await createEmployeeFixture("FT04-TCP-ADD-WEEK");

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employeeId: plannedEmployee.id,
    });

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekSecondDate,
      tourId: null,
      employeeIds: [],
    });

    await admin
      .post(`/api/appointments/${appointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: targetWeek.weekSecondDate,
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({
          isoYear: targetWeek.isoYear,
          isoWeek: targetWeek.isoWeek,
          hasWeekPlan: true,
          currentEmployeeIds: [],
        }));
        expect(body.items).toEqual([
          expect.objectContaining({
            employeeId: plannedEmployee.id,
            status: "will_add",
            selectable: true,
            conflictReason: null,
          }),
        ]);
      });
  });

  it("previews current employee conflicts for pure date moves without tour or KW change", async () => {
    const admin = await loginAdmin();
    const targetWeek = resolveNextEditableWeek();
    const project = await createProjectFixture({ prefix: "FT04-TCP-PURE-DATE" });
    const tour = await createTourFixture("#991b1b");
    const employee = await createEmployeeFixture("FT04-TCP-PURE-CONFLICT");

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    const conflictingAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekSecondDate,
      tourId: tour.id,
      employeeIds: [],
    });
    await db.insert(appointmentEmployees).values({
      appointmentId: conflictingAppointment.id,
      employeeId: employee.id,
    });

    await admin
      .post(`/api/appointments/${appointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: targetWeek.weekSecondDate,
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [employee.id],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({
          isoYear: targetWeek.isoYear,
          isoWeek: targetWeek.isoWeek,
          hasWeekPlan: false,
          currentEmployeeIds: [employee.id],
        }));
        expect(body.items).toEqual([
          expect.objectContaining({
            employeeId: employee.id,
            status: "conflict",
            selectable: true,
            conflictReason: "EMPLOYEE_OVERLAP",
            source: "current",
          }),
        ]);
      });
  });

  it("blocks readers and dispatcher previews for historical regular appointments server-side", async () => {
    const admin = await loginAdmin();
    const dispatcher = await loginRole("DISPATCHER");
    const reader = await loginRole("READER");
    const project = await createProjectFixture({ prefix: "FT04-TCP-ROLE" });
    const tour = await createTourFixture("#0f766e");
    const historicalAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-03",
      tourId: tour.id,
      employeeIds: [],
    });
    await db
      .update(appointments)
      .set({ startDate: "2000-01-03", endDate: null })
      .where(eq(appointments.id, historicalAppointment.id));

    await reader
      .post(`/api/appointments/${historicalAppointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: "2000-01-04",
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [],
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: "FORBIDDEN" });
      });

    await dispatcher
      .post(`/api/appointments/${historicalAppointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: "2000-01-04",
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [],
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: "PAST_APPOINTMENT_READONLY" });
      });

    await admin
      .post(`/api/appointments/${historicalAppointment.id}/tour-change-preview`)
      .send({
        newTourId: tour.id,
        newStartDate: "2000-01-04",
        newEndDate: null,
        newStartTime: null,
        currentEmployeeIds: [],
      })
      .expect(200);
  });
});
