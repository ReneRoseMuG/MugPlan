/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wochenplanung kann pro Tour/KW gelesen, vorgeprueft und auf Termine uebernommen werden.
 * - Die neue KW-Unique-Regel blockiert Mehrfachzuordnungen ueber Touren hinweg.
 * - Remove-Preview markiert Unterbesetzung und Execute entfernt Assignment plus Terminzuweisung selektiv.
 * - Appointment-bezogene Preview-Endpunkte nutzen die bestehende Overlap-Pruefung fuer Konfliktfaelle.
 *
 * Fehlerfaelle:
 * - Wochenzuordnungen werden ohne Terminmutation oder ohne Listen-Refresh angelegt.
 * - Ein Mitarbeiter kann trotz bestehender KW-Zuordnung in eine zweite Tour derselben Woche eingeplant werden.
 * - Remove-Preview verliert die Unterbesetzungswarnung.
 * - Appointment-Previews markieren Konflikte nicht stabil ueber die vorhandene Terminlogik.
 *
 * Ziel:
 * Die neue Wochenplan-API ueber reale DB-Integration serverseitig absichern.
 */
import type express from "express";
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../../server/db";
import { tourWeekEmployees } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

function resolveIsoWeek(dateValue: Date | string) {
  const parsed = dateValue instanceof Date ? dateValue : parseISO(dateValue);
  return {
    isoYear: getISOWeekYear(parsed),
    isoWeek: getISOWeek(parsed),
  };
}

describe("tourWeekEmployees integration", () => {
  it("adds a week assignment, applies it to selected appointments and exposes it in the week list", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335577");
    const project = await createProjectFixture({ prefix: "TWE-LIST" });
    const employee = await createEmployeeFixture("TWE-LIST-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(14),
      tourId: tour.id,
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({ ...isoWeek, employeeId: employee.id })
      .expect(200);

    expect(preview.body.items).toEqual([
      expect.objectContaining({
        appointmentId: appointment!.id,
        status: "will_add",
        selectable: true,
      }),
    ]);

    const execute = await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        ...isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [appointment!.id],
      })
      .expect(200);

    expect(execute.body).toMatchObject({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([employee.id]);

    const list = await admin.get(`/api/tours/${tour.id}/week-employees`).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        isoYear: isoWeek.isoYear,
        isoWeek: isoWeek.isoWeek,
        employees: [expect.objectContaining({ employeeId: employee.id, fullName: employee.fullName })],
      }),
    ]);
  });

  it("blocks assigning the same employee to a second tour in the same ISO week", async () => {
    const admin = await loginAdmin();
    const firstTour = await createTourFixture("#114477");
    const secondTour = await createTourFixture("#771144");
    const project = await createProjectFixture({ prefix: "TWE-UNIQUE" });
    const employee = await createEmployeeFixture("TWE-UNIQUE-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(16),
      tourId: firstTour.id,
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);

    await admin
      .post(`/api/tours/${firstTour.id}/week-employees/add`)
      .send({
        ...isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    await admin
      .post(`/api/tours/${secondTour.id}/week-employees/add/preview`)
      .send({ ...isoWeek, employeeId: employee.id })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("marks understaffing in remove preview and removes the assignment plus employee from selected appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#225588");
    const project = await createProjectFixture({ prefix: "TWE-REMOVE" });
    const employee = await createEmployeeFixture("TWE-REMOVE-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(18),
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: employee.id,
    });
    const assignmentId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId);

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/remove/preview`)
      .send({ assignmentId })
      .expect(200);

    expect(preview.body.items).toEqual([
      expect.objectContaining({
        appointmentId: appointment!.id,
        status: "understaffed",
        isUnderstaffed: true,
      }),
    ]);

    await admin
      .delete(`/api/tours/${tour.id}/week-employees/${assignmentId}`)
      .send({
        isoYear: isoWeek.isoYear,
        isoWeek: isoWeek.isoWeek,
        selectedAppointmentIds: [appointment!.id],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.updatedAppointmentCount).toBe(1);
      });

    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([]);
    const remainingAssignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(eq(tourWeekEmployees.id, assignmentId));
    expect(remainingAssignments).toHaveLength(0);
  });

  it("uses the existing appointment overlap logic in assignment previews", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335511");
    const project = await createProjectFixture({ prefix: "TWE-CONFLICT" });
    const employee = await createEmployeeFixture("TWE-CONFLICT-EMP");
    const targetDate = getRelativeBerlinDate(20);
    const isoWeek = resolveIsoWeek(targetDate);

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: employee.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetDate,
      employeeIds: [employee.id],
    });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/assignment-preview`)
      .send({
        startDate: targetDate,
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.hasWeekPlan).toBe(true);
        expect(res.body.items).toEqual([
          expect.objectContaining({
            employeeId: employee.id,
            status: "conflict",
            selectable: false,
            conflictReason: "EMPLOYEE_OVERLAP",
          }),
        ]);
      });
  });
});
