/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der neue Tour-KW-View liefert eine reine Vier-KW-Projektion für alle unterstützten Touren.
 * - Parkplatz- und Abwesenheitstouren bleiben aus der Tour-KW-Planung ausgeschlossen.
 * - Lesen des Views erzeugt keine neuen tour_week-Datensätze.
 * - Leser dürfen die Sicht lesen, erhalten aber weiterhin nur bestehende read-only Daten.
 *
 * Fehlerfälle:
 * - Der View legt beim Öffnen Wochenpläne an.
 * - Systemtouren erscheinen als planbare Tour-Bahnen.
 * - Mitarbeiter-, Notiz-, Blockiert- oder Terminzähler gehen in der Projektion verloren.
 *
 * Ziel:
 * Die neue Tour-KW-View-API als read-only Aggregation über echte DB-Pfade absichern.
 */
import type express from "express";
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { addWeeks, endOfISOWeek, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import * as calendarWeekNotesService from "../../../server/services/calendarWeekNotesService";
import { hashPassword } from "../../../server/security/passwordHash";
import { tourWeekEmployees, tourWeeks, tours } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: express.Express;
let userSequence = 0;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

async function loginReader(): Promise<SuperAgentTest> {
  userSequence += 1;
  const username = `tour-week-view-reader-${Date.now()}-${userSequence}`;
  const password = "tour-week-view-reader-password";
  await createUser({
    username,
    email: `${username}@example.test`,
    firstName: "TourWeek",
    lastName: "Reader",
    passwordHash: await hashPassword(password),
    roleCode: "READER",
  });
  return loginAgent(app, { username, password });
}

async function renameTour(tourId: number, name: string): Promise<void> {
  await db.update(tours).set({ name }).where(eq(tours.id, tourId));
}

async function countTourWeeks(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(tourWeeks);
  return Number(row?.count ?? 0);
}

function resolveViewWindow() {
  const firstWeekStart = startOfISOWeek(addWeeks(new Date(`${getRelativeBerlinDate(0)}T12:00:00`), 3));
    const fourthWeekStart = addWeeks(firstWeekStart, 3);
  return {
    fromDate: format(firstWeekStart, "yyyy-MM-dd"),
    toDate: format(endOfISOWeek(fourthWeekStart), "yyyy-MM-dd"),
    targetIsoYear: getISOWeekYear(firstWeekStart),
    targetIsoWeek: getISOWeek(firstWeekStart),
    fourthIsoYear: getISOWeekYear(fourthWeekStart),
    fourthIsoWeek: getISOWeek(fourthWeekStart),
  };
}

describe("tour week planning view integration", () => {
  it("returns the four-week planning projection without creating tour weeks", async () => {
    const admin = await loginAdmin();
    const window = resolveViewWindow();
    const project = await createProjectFixture({ prefix: "TWV" });
    const planningTour = await createTourFixture("#2266aa");
    const parkplatzTour = await createTourFixture("#999999");
    const absenceTour = await createTourFixture("#aa6622");
    const employee = await createEmployeeFixture("TWV-EMP");
    await renameTour(planningTour.id, "TWV Tour");
    await renameTour(parkplatzTour.id, "Parkplatz");
    await renameTour(absenceTour.id, "Abwesenheiten");

    const assignmentResult = await db.insert(tourWeekEmployees).values({
      tourId: planningTour.id,
      employeeId: employee.id,
      isoYear: window.targetIsoYear,
      isoWeek: window.targetIsoWeek,
    });
    const assignmentId = Number((assignmentResult as any)?.[0]?.insertId ?? (assignmentResult as any)?.insertId ?? 0);
    await createAppointmentFixture({
      projectId: project.id,
      tourId: planningTour.id,
      startDate: window.fromDate,
    });
    await db.insert(tourWeeks).values({
      tourId: planningTour.id,
      isoYear: window.targetIsoYear,
      isoWeek: window.targetIsoWeek,
      isBlocked: true,
    });
    await calendarWeekNotesService.createCalendarWeekNote(window.targetIsoYear, window.targetIsoWeek, planningTour.id, {
      title: "Tour-KW-Notiz",
      body: "Sichtbare Notiz im neuen View",
      cardColor: "#f8fafc",
      print: false,
    });

    const beforeCount = await countTourWeeks();
    const response = await admin
      .get(`/api/tours/week-planning?fromDate=${window.fromDate}&toDate=${window.toDate}`)
      .expect(200);
    const afterCount = await countTourWeeks();

    expect(afterCount).toBe(beforeCount);
    expect(response.body.weeks).toHaveLength(4);
    expect(response.body.tours.map((tour: { id: number }) => tour.id)).toContain(planningTour.id);
    expect(response.body.tours.map((tour: { id: number }) => tour.id)).not.toContain(parkplatzTour.id);
    expect(response.body.tours.map((tour: { id: number }) => tour.id)).not.toContain(absenceTour.id);

    const targetCell = response.body.cells.find((cell: { tourId: number; isoYear: number; isoWeek: number }) =>
      cell.tourId === planningTour.id
      && cell.isoYear === window.targetIsoYear
      && cell.isoWeek === window.targetIsoWeek,
    );
    expect(targetCell).toMatchObject({
      tourId: planningTour.id,
      tourName: "TWV Tour",
      isBlocked: true,
      appointmentsCount: 1,
      notesCount: 1,
    });
    expect(targetCell.employees).toEqual([
      expect.objectContaining({
        assignmentId,
        employeeId: employee.id,
        fullName: employee.fullName,
      }),
    ]);

    const emptyFutureCell = response.body.cells.find((cell: { tourId: number; isoYear: number; isoWeek: number }) =>
      cell.tourId === planningTour.id
      && cell.isoYear === window.fourthIsoYear
      && cell.isoWeek === window.fourthIsoWeek,
    );
    expect(emptyFutureCell).toMatchObject({
      tourId: planningTour.id,
      appointmentsCount: 0,
      notesCount: 0,
      employees: [],
      isBlocked: false,
    });
  });

  it("allows reader roles to read the planning projection", async () => {
    const reader = await loginReader();
    const window = resolveViewWindow();

    await reader
      .get(`/api/tours/week-planning?fromDate=${window.fromDate}&toDate=${window.toDate}`)
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body.weeks)).toBe(true);
        expect(Array.isArray(response.body.tours)).toBe(true);
        expect(Array.isArray(response.body.cells)).toBe(true);
      });
  });
});
