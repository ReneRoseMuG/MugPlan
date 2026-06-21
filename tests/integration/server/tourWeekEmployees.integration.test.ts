/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wochenplanung kann pro Tour/KW gelesen, vorgeprueft und auf Termine uebernommen werden.
 * - Die neue KW-Unique-Regel blockiert Mehrfachzuordnungen ueber Touren hinweg.
 * - Laufende Wochen sind für Admins und Disponenten editierbar; vergangene Wochen bleiben über die echte API schreibgeschützt.
 * - Remove-Preview markiert Unterbesetzung und Execute entfernt Assignment plus Terminzuweisung selektiv.
 * - Appointment-bezogene Preview-Endpunkte nutzen die bestehende Overlap-Prüfung für Konfliktfälle.
 * - Die Termin-Mitarbeiterzuweisung (assignment-preview) zeigt konfligierende Mitarbeiter sichtbar gesperrt mit differenziertem Grund (Abwesenheit/Urlaub als ON_LEAVE vs. Terminkonflikt als EMPLOYEE_OVERLAP) statt sie auszublenden.
 * - In der Tour-KW-Verfügbarkeitsliste bleiben bereits verplante und an allen fünf Werktagen abwesende Mitarbeiter sichtbar, werden aber mit Sperrgrund (ineligibleReason) annotiert; inaktive Mitarbeiter erscheinen nicht. Die direkte Aufnahme (add preview/execute) bleibt für ganztägig Abwesende blockiert. Teil-Abwesenheit und Termin-Überschneidungen sperren nicht und werden erst beim Buchen tagesgenau behandelt.
 * - Leere Wochen, Vollkonflikt-Wochen und Remove-Faelle ohne betroffene Termine bleiben stabil.
 * - Wiederholte Add-Executes für dieselbe Tour/KW/Mitarbeiter-Kombination bleiben idempotent ohne Duplikate.
 * - Wochenplan-Mutationen bumpen die Appointment-Version, sodass stale Termin-Saves blockiert werden.
 * - Beim Öffnen der Tour-Wochenplanung werden ab der kommenden Kalenderwoche vier Tour-KWs idempotent vorbereitet und Legacy-Wochen bleiben weiter sichtbar.
 * - Blockierte Wochen parken Termine, entfernen Wochen-Zuordnungen, blockieren Wochenplan-Mutationen und unterdrücken die aktive Wochenplan-Übernahme.
 * - Die System-Touren `Parkplatz` und `Abwesenheiten` bleiben von Seed, Listen, Verfügbarkeit, Previews und Wochen-Mutationen ausgeschlossen.
 *
 * Fehlerfaelle:
 * - Wochenzuordnungen werden ohne Terminmutation oder ohne Listen-Refresh angelegt.
 * - Ein Mitarbeiter kann trotz bestehender KW-Zuordnung in eine zweite Tour derselben Woche eingeplant werden.
 * - Leser können aktuelle Wochen trotz Rollenregel per API beschreiben.
 * - Admins oder Disponenten können vergangene Wochen trotz Sperrregel per API beschreiben.
 * - Remove-Preview verliert die Unterbesetzungswarnung.
 * - Vollkonflikte verhindern fälschlich die Wochenzuordnung für künftige Termine.
 * - Leere Remove-Previews blockieren das Loeschen der Wochenzuordnung.
 * - Appointment-Previews markieren Konflikte nicht stabil ueber die vorhandene Terminlogik.
 * - Konfligierende Mitarbeiter verschwinden kommentarlos aus der Zuweisungsliste oder ein Urlaub wird als generischer Terminkonflikt statt als Abwesenheit ausgewiesen.
 * - Abwesenheiten in einer leeren Tour-KW werden still ignoriert und erlauben eine fachlich falsche Wochenzuordnung.
 * - Dasselbe Wochenassignment wird beim Wiederholen doppelt persistiert oder in der Liste doppelt angezeigt.
 * - Parallele Terminbearbeitungen können Wochenplan-Mutationen still überschreiben.
 * - Das Rollout legt vergangene oder fachlich fremde Wochen ungefragt als neue Tour-Wochen-Datensaetze an.
 * - Blockierte Wochen behalten stale Wochen-Zuordnungen in Listen oder Join-Tabellen.
 * - Die Wochenplanung erzeugt für `Parkplatz` oder `Abwesenheiten` beim Öffnen wieder KW-Karten oder zeigt Legacy-Zuordnungen weiter an.
 *
 * Ziel:
 * Die neue Wochenplan-API ueber reale DB-Integration serverseitig absichern.
 */
import type express from "express";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "../../../server/db";
import { employees, tourWeekEmployees, tourWeeks, tours } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createEmployeeFixture,
  ensureSystemTagsFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";
import { hashPassword } from "../../../server/security/passwordHash";
import { createUser } from "../../../server/repositories/usersRepository";
import { createEmployeeAppointmentAbsence } from "../../../server/services/employeeAppointmentAbsencesService";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

let userSequence = 0;

async function loginRole(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  userSequence += 1;
  const username = `twe-${roleCode.toLowerCase()}-${Date.now()}-${userSequence}`;
  const password = `tour-week-${roleCode.toLowerCase()}-password`;
  await createUser({
    username,
    email: `${username}@example.test`,
    firstName: "TourWeek",
    lastName: roleCode,
    passwordHash: await hashPassword(password),
    roleCode,
  });
  return loginAgent(app, { username, password });
}

function resolveIsoWeek(dateValue: Date | string) {
  const parsed = dateValue instanceof Date ? dateValue : parseISO(dateValue);
  return {
    isoYear: getISOWeekYear(parsed),
    isoWeek: getISOWeek(parsed),
  };
}

function resolveNextEditableWeekDates() {
  const targetWeekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 3));
  return {
    isoYear: getISOWeekYear(targetWeekStart),
    isoWeek: getISOWeek(targetWeekStart),
    weekStartDate: format(targetWeekStart, "yyyy-MM-dd"),
    weekMidDate: format(addDays(targetWeekStart, 3), "yyyy-MM-dd"),
    previousWeekDate: format(addDays(targetWeekStart, -7), "yyyy-MM-dd"),
  };
}

function resolveUpcomingSeedWindow() {
  const nextWeekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 1));
  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = addWeeks(nextWeekStart, index);
    return {
      isoYear: getISOWeekYear(weekStart),
      isoWeek: getISOWeek(weekStart),
    };
  });
}

function toDateOnlyString(dateValue: Date | string): string {
  return typeof dateValue === "string" ? dateValue.slice(0, 10) : format(dateValue, "yyyy-MM-dd");
}

async function renameTour(tourId: number, name: string): Promise<void> {
  await db
    .update(tours)
    .set({ name })
    .where(eq(tours.id, tourId));
}

async function getTourIdByName(name: string): Promise<number> {
  await ensureSystemTagsFixture();
  const [tour] = await db.select().from(tours).where(eq(tours.name, name));
  if (!tour) throw new Error(`Expected tour ${name} to exist.`);
  return tour.id;
}

async function seedWeekPlanNoise(prefix: string, referenceDate: string) {
  const noiseProject = await createProjectFixture({ prefix: `${prefix}-NOISE` });
  const noiseTour = await createTourFixture("#6b7280");
  const noiseEmployee = await createEmployeeFixture(`${prefix}-NOISE-EMP`);

  await createAppointmentFixture({
    projectId: noiseProject.id,
    startDate: referenceDate,
    tourId: noiseTour.id,
    employeeIds: [noiseEmployee.id],
  });

  await createAppointmentFixture({
    projectId: noiseProject.id,
    startDate: getRelativeBerlinDate(40),
    tourId: null,
    employeeIds: [],
  });

  return {
    noiseProject,
    noiseTour,
    noiseEmployee,
  };
}

describe("tourWeekEmployees integration", () => {
  it("lists week-planning cards for an employee grouped by tour and ISO week", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335577");
    const employee = await createEmployeeFixture("TWE-EMPLOYEE-VIEW");
    const colleague = await createEmployeeFixture("TWE-EMPLOYEE-VIEW-COLLEAGUE");
    const targetWeek = resolveNextEditableWeekDates();

    await db.insert(tourWeekEmployees).values([
      {
        tourId: tour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      },
      {
        tourId: tour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: colleague.id,
      },
    ]);

    await admin
      .get(`/api/employees/${employee.id}/week-plans`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([
          expect.objectContaining({
            assignmentId: expect.any(Number),
            tourId: tour.id,
            tourName: tour.name,
            tourColor: tour.color,
            isoYear: targetWeek.isoYear,
            isoWeek: targetWeek.isoWeek,
            members: expect.arrayContaining([
              expect.objectContaining({ employeeId: employee.id, fullName: employee.fullName }),
              expect.objectContaining({ employeeId: colleague.id, fullName: colleague.fullName }),
            ]),
          }),
        ]);
      });
  });

  it("projects appointment and note counters for tour and employee week cards strictly by ISO week", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335577");
    const project = await createProjectFixture({ prefix: "TWE-COUNTS" });
    const employee = await createEmployeeFixture("TWE-COUNTS-EMP");
    const colleague = await createEmployeeFixture("TWE-COUNTS-COL");
    const targetWeek = resolveNextEditableWeekDates();

    await db.insert(tourWeekEmployees).values([
      {
        tourId: tour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      },
      {
        tourId: tour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: colleague.id,
      },
    ]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      tourId: tour.id,
      employeeIds: [colleague.id],
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.previousWeekDate,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    await admin
      .post(`/api/calendar-weeks/${targetWeek.isoYear}/${targetWeek.isoWeek}/tours/${tour.id}/notes`)
      .send({ title: "KW-Notiz", body: "<p>nur diese Woche</p>", print: false })
      .expect(201);

    const tourWeeksResponse = await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200);

    const tourWeekCard = tourWeeksResponse.body.find((entry: { isoYear: number; isoWeek: number }) =>
      entry.isoYear === targetWeek.isoYear && entry.isoWeek === targetWeek.isoWeek,
    );

    expect(tourWeekCard).toEqual(expect.objectContaining({
      tourId: tour.id,
      tourName: tour.name,
      tourColor: tour.color,
      appointmentsCount: 2,
      notesCount: 1,
    }));

    const employeeWeekPlansResponse = await admin
      .get(`/api/employees/${employee.id}/week-plans`)
      .expect(200);

    expect(employeeWeekPlansResponse.body).toEqual([
      expect.objectContaining({
        tourId: tour.id,
        appointmentsCount: 1,
        notesCount: 1,
        employees: expect.arrayContaining([
          expect.objectContaining({ employeeId: employee.id }),
          expect.objectContaining({ employeeId: colleague.id }),
        ]),
      }),
    ]);
  });

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
    await seedWeekPlanNoise("TWE-LIST", toDateOnlyString(appointment!.startDate));

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
    const targetWeekEntry = list.body.find((week: { isoYear: number; isoWeek: number }) =>
      week.isoYear === isoWeek.isoYear && week.isoWeek === isoWeek.isoWeek,
    );
    expect(targetWeekEntry).toEqual(expect.objectContaining({
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employees: [expect.objectContaining({ employeeId: employee.id, fullName: employee.fullName })],
    }));
  });

  it("seeds the upcoming four tour weeks when the tour week list is opened", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335577");
    const expectedWeeks = resolveUpcomingSeedWindow();

    const response = await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200);

    expect(response.body).toHaveLength(4);
    expect(response.body.map((week: { isoYear: number; isoWeek: number }) => ({
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
    }))).toEqual(expectedWeeks);

    const dbWeeks = await db
      .select()
      .from(tourWeeks)
      .where(eq(tourWeeks.tourId, tour.id));

    expect(dbWeeks.map((week) => ({
      isoYear: Number(week.isoYear),
      isoWeek: Number(week.isoWeek),
    }))).toEqual(expectedWeeks);
  });

  it("keeps Parkplatz out of week-plan lists, availability and employee week plans without seeding a horizon", async () => {
    const admin = await loginAdmin();
    const parkplatzTour = await createTourFixture("#d4537e");
    const employee = await createEmployeeFixture("TWE-PARKPLATZ-LIST-EMP");
    const colleague = await createEmployeeFixture("TWE-PARKPLATZ-LIST-COL");
    const targetWeek = resolveNextEditableWeekDates();

    await renameTour(parkplatzTour.id, "Parkplatz");

    await db.insert(tourWeeks).values({
      tourId: parkplatzTour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      isBlocked: false,
    });

    await db.insert(tourWeekEmployees).values([
      {
        tourId: parkplatzTour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      },
      {
        tourId: parkplatzTour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: colleague.id,
      },
    ]);

    await admin
      .get(`/api/tours/${parkplatzTour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    await admin
      .get(`/api/tours/${parkplatzTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    await admin
      .get(`/api/employees/${employee.id}/week-plans`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    const persistedWeeks = await db
      .select()
      .from(tourWeeks)
      .where(eq(tourWeeks.tourId, parkplatzTour.id));
    expect(persistedWeeks).toHaveLength(1);
    expect(persistedWeeks[0]).toEqual(expect.objectContaining({
      tourId: parkplatzTour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      isBlocked: false,
    }));
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
    await seedWeekPlanNoise("TWE-UNIQUE", toDateOnlyString(appointment!.startDate));

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

  it("returns active employees and locks those already assigned in the target ISO week with a tour-specific reason while omitting inactive employees", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#117799");
    const otherTour = await createTourFixture("#991177");
    const targetWeek = resolveNextEditableWeekDates();
    const freeEmployee = await createEmployeeFixture("TWE-AVAILABLE-FREE");
    const sameWeekSameTourEmployee = await createEmployeeFixture("TWE-AVAILABLE-SAME-TOUR");
    const sameWeekOtherTourEmployee = await createEmployeeFixture("TWE-AVAILABLE-OTHER-TOUR");
    const inactiveEmployee = await createEmployeeFixture("TWE-AVAILABLE-INACTIVE");

    await db.insert(tourWeekEmployees).values([
      {
        tourId: targetTour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: sameWeekSameTourEmployee.id,
      },
      {
        tourId: otherTour.id,
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: sameWeekOtherTourEmployee.id,
      },
    ]);

    await db
      .update(employees)
      .set({ isActive: false })
      .where(eq(employees.id, inactiveEmployee.id));

    await admin
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200)
      .expect((res) => {
        const rows = res.body as Array<{ id: number; ineligibleReason: string | null }>;
        const rowById = new Map(rows.map((row) => [row.id, row]));

        // Freier Mitarbeiter: sichtbar und auswaehlbar (kein Sperrgrund).
        expect(rowById.get(freeEmployee.id)).toBeDefined();
        expect(rowById.get(freeEmployee.id)?.ineligibleReason).toBeNull();

        // Bereits in der KW verplant (gleiche Tour): sichtbar, aber gesperrt mit Tour-Grund.
        expect(rowById.get(sameWeekSameTourEmployee.id)?.ineligibleReason).toContain("Bereits verplant");
        expect(rowById.get(sameWeekSameTourEmployee.id)?.ineligibleReason).toContain(targetTour.name);

        // Bereits in der KW verplant (andere Tour): KW-Unique-Regel greift tour-uebergreifend.
        expect(rowById.get(sameWeekOtherTourEmployee.id)?.ineligibleReason).toContain("Bereits verplant");
        expect(rowById.get(sameWeekOtherTourEmployee.id)?.ineligibleReason).toContain(otherTour.name);

        // Inaktiver Mitarbeiter: erscheint weiterhin gar nicht in der Liste.
        expect(rowById.has(inactiveEmployee.id)).toBe(false);
      });
  });

  it("returns the same available employee pool for ADMIN and DISPATCHER", async () => {
    const admin = await loginAdmin();
    const dispatcher = await loginRole("DISPATCHER");
    const targetTour = await createTourFixture("#117799");
    const targetWeek = resolveNextEditableWeekDates();
    const freeEmployee = await createEmployeeFixture("TWE-ROLE-SYM-FREE");

    const adminResponse = await admin
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200);

    const dispatcherResponse = await dispatcher
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200);

    const adminIds = adminResponse.body.map((employee: { id: number }) => employee.id);
    const dispatcherIds = dispatcherResponse.body.map((employee: { id: number }) => employee.id);

    expect(new Set(adminIds)).toEqual(new Set(dispatcherIds));
    expect(adminIds).toContain(freeEmployee.id);
    expect(dispatcherIds).toContain(freeEmployee.id);
  });

  it("rejects READER requests to the available week employee picker", async () => {
    const reader = await loginRole("READER");
    const targetTour = await createTourFixture("#117799");
    const targetWeek = resolveNextEditableWeekDates();

    await reader
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(403)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({ code: "FORBIDDEN" }));
      });
  });

  it("rejects unauthenticated requests to the available week employee picker", async () => {
    const targetTour = await createTourFixture("#117799");
    const targetWeek = resolveNextEditableWeekDates();

    await request(app)
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      // requireSessionUser rejects missing sessions before the /available controller guard runs.
      .expect(401);
  });

  it("sends no-store cache control for the available week employee picker", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#117799");
    const targetWeek = resolveNextEditableWeekDates();

    const response = await admin
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200);

    expect(response.headers["cache-control"]).toContain("no-store");
  });

  it("includes employees with appointment conflicts in the available picker because conflicts are handled when booking, not when adding to the roster", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#117799");
    const otherTour = await createTourFixture("#991177");
    const project = await createProjectFixture({ prefix: "TWE-AVAILABLE-CONFLICTS" });
    const targetWeek = resolveNextEditableWeekDates();
    const targetMultiDayEnd = format(addDays(parseISO(targetWeek.weekMidDate), 1), "yyyy-MM-dd");
    const freeEmployee = await createEmployeeFixture("TWE-AVAILABLE-CONFLICTS-FREE");
    const outsideWeekConflictEmployee = await createEmployeeFixture("TWE-AVAILABLE-CONFLICTS-OUTSIDE");
    const sameDayConflictEmployee = await createEmployeeFixture("TWE-AVAILABLE-CONFLICTS-SAME-DAY");
    const multiDayConflictEmployee = await createEmployeeFixture("TWE-AVAILABLE-CONFLICTS-MULTI-DAY");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      startTime: null,
      tourId: targetTour.id,
      employeeIds: [],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      endDate: targetMultiDayEnd,
      startTime: null,
      tourId: targetTour.id,
      employeeIds: [],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.previousWeekDate,
      startTime: null,
      tourId: otherTour.id,
      employeeIds: [outsideWeekConflictEmployee.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      startTime: null,
      tourId: otherTour.id,
      employeeIds: [sameDayConflictEmployee.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetMultiDayEnd,
      startTime: null,
      tourId: otherTour.id,
      employeeIds: [multiDayConflictEmployee.id],
    });

    await admin
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200)
      .expect((res) => {
        const rows = res.body as Array<{ id: number; ineligibleReason: string | null }>;
        const availableEmployeeIds = rows.map((row) => row.id);
        const rowById = new Map(rows.map((row) => [row.id, row]));

        expect(availableEmployeeIds).toContain(freeEmployee.id);
        expect(availableEmployeeIds).toContain(outsideWeekConflictEmployee.id);
        // Neue Regel: Termin-Überschneidungen schließen NICHT mehr aus der Aufnahme-Liste aus –
        // sie werden erst beim Buchen auf den einzelnen Termin als Tageskonflikt behandelt.
        expect(availableEmployeeIds).toContain(sameDayConflictEmployee.id);
        expect(availableEmployeeIds).toContain(multiDayConflictEmployee.id);
        // Verstaerkt: Eine reine Termin-Ueberschneidung erzeugt KEINEN Sperrgrund –
        // gesperrt wird nur bei KW-Verplanung oder Vollabwesenheit.
        expect(rowById.get(sameDayConflictEmployee.id)?.ineligibleReason).toBeNull();
        expect(rowById.get(multiDayConflictEmployee.id)?.ineligibleReason).toBeNull();
      });
  });

  it("shows partially absent employees as eligible and locks fully absent employees with a reason in the available picker", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#0f766e");
    const targetWeek = resolveNextEditableWeekDates();
    const fullWeekEndDate = format(addDays(parseISO(targetWeek.weekStartDate), 4), "yyyy-MM-dd");
    const freeEmployee = await createEmployeeFixture("TWE-ABSENCE-PICKER-FREE");
    const partiallyAbsentEmployee = await createEmployeeFixture("TWE-ABSENCE-PICKER-PARTIAL");
    const fullyAbsentEmployee = await createEmployeeFixture("TWE-ABSENCE-PICKER-FULL");
    const outsideWeekAbsenceEmployee = await createEmployeeFixture("TWE-ABSENCE-PICKER-OUTSIDE");

    await createEmployeeAppointmentAbsence(partiallyAbsentEmployee.id, {
      absenceType: "vacation",
      startDate: targetWeek.weekStartDate,
      endDate: targetWeek.weekMidDate,
      note: `TWE-ABSENCE-PICKER-PARTIAL-${partiallyAbsentEmployee.id}`,
    }, "ADMIN");
    await createEmployeeAppointmentAbsence(fullyAbsentEmployee.id, {
      absenceType: "vacation",
      startDate: targetWeek.weekStartDate,
      endDate: fullWeekEndDate,
      note: `TWE-ABSENCE-PICKER-FULL-${fullyAbsentEmployee.id}`,
    }, "ADMIN");
    await createEmployeeAppointmentAbsence(outsideWeekAbsenceEmployee.id, {
      absenceType: "vacation",
      startDate: targetWeek.previousWeekDate,
      endDate: targetWeek.previousWeekDate,
      note: `TWE-ABSENCE-PICKER-OUTSIDE-${outsideWeekAbsenceEmployee.id}`,
    }, "ADMIN");

    await admin
      .get(`/api/tours/${targetTour.id}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200)
      .expect((res) => {
        const rows = res.body as Array<{ id: number; ineligibleReason: string | null }>;
        const rowById = new Map(rows.map((row) => [row.id, row]));

        // Frei und auswaehlbar.
        expect(rowById.get(freeEmployee.id)?.ineligibleReason).toBeNull();
        // Abwesenheit ausserhalb der KW sperrt nicht.
        expect(rowById.get(outsideWeekAbsenceEmployee.id)?.ineligibleReason).toBeNull();
        // Teil-Abwesenheit (Mo–Do) sperrt nicht – sichtbar und auswaehlbar.
        expect(rowById.get(partiallyAbsentEmployee.id)).toBeDefined();
        expect(rowById.get(partiallyAbsentEmployee.id)?.ineligibleReason).toBeNull();
        // Nur wer an allen fünf Werktagen (Mo–Fr) abwesend ist, bleibt sichtbar, aber gesperrt mit Grund.
        expect(rowById.get(fullyAbsentEmployee.id)).toBeDefined();
        expect(rowById.get(fullyAbsentEmployee.id)?.ineligibleReason).toBe("Ganze Woche abwesend");
      });
  });

  it("rejects direct Tour-KW add preview and execute only when the employee is absent on every weekday of that ISO week", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#0f766e");
    const absentEmployee = await createEmployeeFixture("TWE-ABSENCE-DIRECT-BLOCKED");
    const targetWeek = resolveNextEditableWeekDates();
    const fullWeekEndDate = format(addDays(parseISO(targetWeek.weekStartDate), 4), "yyyy-MM-dd");

    await createEmployeeAppointmentAbsence(absentEmployee.id, {
      absenceType: "sick",
      startDate: targetWeek.weekStartDate,
      endDate: fullWeekEndDate,
      note: `TWE-ABSENCE-DIRECT-${absentEmployee.id}`,
    }, "ADMIN");

    await admin
      .post(`/api/tours/${targetTour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: absentEmployee.id,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
        expect(res.body.message).toContain("abwesend");
      });

    await admin
      .post(`/api/tours/${targetTour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: absentEmployee.id,
        selectedAppointmentIds: [],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
        expect(res.body.message).toContain("abwesend");
      });

    const assignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, targetTour.id),
        eq(tourWeekEmployees.isoYear, targetWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, targetWeek.isoWeek),
        eq(tourWeekEmployees.employeeId, absentEmployee.id),
      ));
    expect(assignments).toEqual([]);
  });

  it("allows adding a partially absent employee to the Tour-KW roster (per-day absences are handled when booking)", async () => {
    const admin = await loginAdmin();
    const targetTour = await createTourFixture("#0f766e");
    const partiallyAbsentEmployee = await createEmployeeFixture("TWE-ABSENCE-PARTIAL-ALLOWED");
    const targetWeek = resolveNextEditableWeekDates();

    await createEmployeeAppointmentAbsence(partiallyAbsentEmployee.id, {
      absenceType: "vacation",
      startDate: targetWeek.weekStartDate,
      endDate: targetWeek.weekMidDate,
      note: `TWE-ABSENCE-PARTIAL-ALLOWED-${partiallyAbsentEmployee.id}`,
    }, "ADMIN");

    await admin
      .post(`/api/tours/${targetTour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: partiallyAbsentEmployee.id,
      })
      .expect(200);

    await admin
      .post(`/api/tours/${targetTour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: partiallyAbsentEmployee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    const assignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, targetTour.id),
        eq(tourWeekEmployees.isoYear, targetWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, targetWeek.isoWeek),
        eq(tourWeekEmployees.employeeId, partiallyAbsentEmployee.id),
      ));
    expect(assignments).toHaveLength(1);
  });

  it("allows admins and dispatchers to edit the current ISO week while past weeks and readers stay locked", async () => {
    const admin = await loginAdmin();
    const dispatcher = await loginRole("DISPATCHER");
    const reader = await loginRole("READER");
    const tour = await createTourFixture("#7c3aed");
    const employee = await createEmployeeFixture("TWE-LOCKED-WEEK-EMP");
    const secondEmployee = await createEmployeeFixture("TWE-CURRENT-ADMIN-EMP");
    const readerEmployee = await createEmployeeFixture("TWE-CURRENT-READER-EMP");
    const currentWeek = resolveIsoWeek(getRelativeBerlinDate(0));
    const pastWeek = resolveIsoWeek(getRelativeBerlinDate(-7));

    await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({ ...currentWeek, employeeId: employee.id })
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        ...currentWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        const currentEntry = res.body.find((week: { isoYear: number; isoWeek: number }) =>
          week.isoYear === currentWeek.isoYear && week.isoWeek === currentWeek.isoWeek,
        );
        expect(currentEntry).toEqual(expect.objectContaining({
          isLocked: false,
          employees: [expect.objectContaining({ employeeId: employee.id })],
        }));
      });

    await admin
      .post(`/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/block`)
      .expect(200)
      .expect((res) => {
        expect(res.body.week.isBlocked).toBe(true);
        expect(res.body.week.isLocked).toBe(false);
      });

    await admin
      .post(`/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/unblock`)
      .expect(200)
      .expect((res) => {
        expect(res.body.week.isBlocked).toBe(false);
        expect(res.body.week.isLocked).toBe(false);
      });

    await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        const currentEntry = res.body.find((week: { isoYear: number; isoWeek: number }) =>
          week.isoYear === currentWeek.isoYear && week.isoWeek === currentWeek.isoWeek,
        );
        expect(currentEntry).toEqual(expect.objectContaining({ isLocked: false }));
      });

    await dispatcher
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        const currentEntry = res.body.find((week: { isoYear: number; isoWeek: number }) =>
          week.isoYear === currentWeek.isoYear && week.isoWeek === currentWeek.isoWeek,
        );
        expect(currentEntry).toEqual(expect.objectContaining({ isLocked: false }));
      });

    await dispatcher
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({ ...currentWeek, employeeId: secondEmployee.id })
      .expect(200);

    await dispatcher
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        ...currentWeek,
        employeeId: secondEmployee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    await dispatcher
      .post(`/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/block`)
      .expect(200)
      .expect((res) => {
        expect(res.body.week.isBlocked).toBe(true);
        expect(res.body.week.isLocked).toBe(false);
      });

    await dispatcher
      .post(`/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/unblock`)
      .expect(200)
      .expect((res) => {
        expect(res.body.week.isBlocked).toBe(false);
        expect(res.body.week.isLocked).toBe(false);
      });

    await reader
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({ ...currentWeek, employeeId: readerEmployee.id })
      .expect(403);

    await reader
      .post(`/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/block`)
      .expect(403);

    for (const lockedWeek of [pastWeek]) {
      await admin
        .post(`/api/tours/${tour.id}/week-employees/add/preview`)
        .send({ ...lockedWeek, employeeId: employee.id })
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe("PAST_WEEK_READONLY");
        });

      await admin
        .post(`/api/tours/${tour.id}/week-employees/add`)
        .send({
          ...lockedWeek,
          employeeId: employee.id,
          selectedAppointmentIds: [],
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe("PAST_WEEK_READONLY");
        });

      await dispatcher
        .post(`/api/tours/${tour.id}/week-employees/add/preview`)
        .send({ ...lockedWeek, employeeId: secondEmployee.id })
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe("PAST_WEEK_READONLY");
        });

      await dispatcher
        .post(`/api/tours/${tour.id}/weeks/${lockedWeek.isoYear}/${lockedWeek.isoWeek}/block`)
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe("PAST_WEEK_READONLY");
        });
    }
  });

  it("rejects add preview and execute for the system tour Parkplatz", async () => {
    const admin = await loginAdmin();
    const parkplatzTour = await createTourFixture("#d4537e");
    const employee = await createEmployeeFixture("TWE-PARKPLATZ-EMP");
    const targetWeek = resolveNextEditableWeekDates();
    await renameTour(parkplatzTour.id, "Parkplatz");

    await admin
      .post(`/api/tours/${parkplatzTour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .post(`/api/tours/${parkplatzTour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    const assignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, parkplatzTour.id),
        eq(tourWeekEmployees.isoYear, targetWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, targetWeek.isoWeek),
      ));
    expect(assignments).toHaveLength(0);
  });

  it("suppresses availability and rejects add preview and execute for the system tour Abwesenheiten", async () => {
    const admin = await loginAdmin();
    const absenceTourId = await getTourIdByName("Abwesenheiten");
    const employee = await createEmployeeFixture("TWE-ABSENCE-TOUR-EMP");
    const targetWeek = resolveNextEditableWeekDates();

    await admin
      .get(`/api/tours/${absenceTourId}/week-employees/available?isoYear=${targetWeek.isoYear}&isoWeek=${targetWeek.isoWeek}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    await admin
      .post(`/api/tours/${absenceTourId}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .post(`/api/tours/${absenceTourId}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    const assignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, absenceTourId),
        eq(tourWeekEmployees.isoYear, targetWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, targetWeek.isoWeek),
      ));
    expect(assignments).toHaveLength(0);
  });

  it("suppresses assignment previews and week mutations for the system tour Parkplatz", async () => {
    const admin = await loginAdmin();
    const parkplatzTour = await createTourFixture("#d4537e");
    const employee = await createEmployeeFixture("TWE-PARKPLATZ-PREVIEW-EMP");
    const targetWeek = resolveNextEditableWeekDates();

    await renameTour(parkplatzTour.id, "Parkplatz");

    await db.insert(tourWeekEmployees).values({
      tourId: parkplatzTour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employeeId: employee.id,
    });

    await admin
      .post(`/api/tours/${parkplatzTour.id}/week-employees/assignment-preview`)
      .send({
        startDate: targetWeek.weekMidDate,
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({
          isoYear: targetWeek.isoYear,
          isoWeek: targetWeek.isoWeek,
          hasWeekPlan: false,
          currentEmployeeIds: [],
          items: [],
        }));
      });

    await admin
      .post(`/api/tours/${parkplatzTour.id}/weeks`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .post(`/api/tours/${parkplatzTour.id}/weeks/${targetWeek.isoYear}/${targetWeek.isoWeek}/block`)
      .send({})
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .post(`/api/tours/${parkplatzTour.id}/weeks/${targetWeek.isoYear}/${targetWeek.isoWeek}/unblock`)
      .send({})
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
    await seedWeekPlanNoise("TWE-REMOVE", toDateOnlyString(appointment!.startDate));

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
    await seedWeekPlanNoise("TWE-CONFLICT", targetDate);

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

  it("includes active employees in calendar assignment previews and locks conflicting ones with a reason", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335588");
    const project = await createProjectFixture({ prefix: "TWE-CALENDAR-PREVIEW" });
    const weekEmployee = await createEmployeeFixture("TWE-CALENDAR-WEEK");
    const availableEmployee = await createEmployeeFixture("TWE-CALENDAR-FREE");
    const conflictEmployee = await createEmployeeFixture("TWE-CALENDAR-BLOCKED");
    const targetDate = getRelativeBerlinDate(22);
    const isoWeek = resolveIsoWeek(targetDate);
    await seedWeekPlanNoise("TWE-CALENDAR-PREVIEW", targetDate);

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: weekEmployee.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetDate,
      employeeIds: [conflictEmployee.id],
    });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/assignment-preview`)
      .send({
        startDate: targetDate,
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
        includeAvailableEmployees: true,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.hasWeekPlan).toBe(true);
        expect(res.body.items).toEqual(expect.arrayContaining([
          expect.objectContaining({
            employeeId: weekEmployee.id,
            status: "will_add",
            selectable: true,
            source: "week_plan",
          }),
          expect.objectContaining({
            employeeId: availableEmployee.id,
            status: "will_add",
            selectable: true,
            source: "available",
          }),
        ]));
        // Neu: Der konfligierende Mitarbeiter wird nicht mehr ausgeblendet, sondern sichtbar
        // gesperrt mit Terminkonflikt-Grund.
        const items = res.body.items as Array<Record<string, unknown>>;
        const conflictItem = items.find((item) => item.employeeId === conflictEmployee.id);
        expect(conflictItem).toMatchObject({
          employeeId: conflictEmployee.id,
          status: "conflict",
          selectable: false,
          conflictReason: "EMPLOYEE_OVERLAP",
          source: "available",
        });
      });
  });

  it("includes active employees and locks conflicting ones with a reason when no tour week employees exist", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#338855");
    const project = await createProjectFixture({ prefix: "TWE-CALENDAR-FALLBACK" });
    const availableEmployee = await createEmployeeFixture("TWE-CALENDAR-FALLBACK-FREE");
    const conflictEmployee = await createEmployeeFixture("TWE-CALENDAR-FALLBACK-BLOCKED");
    const targetDate = getRelativeBerlinDate(24);
    await seedWeekPlanNoise("TWE-CALENDAR-FALLBACK", targetDate);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetDate,
      employeeIds: [conflictEmployee.id],
    });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/assignment-preview`)
      .send({
        startDate: targetDate,
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
        includeAvailableEmployees: true,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.hasWeekPlan).toBe(false);
        expect(res.body.items).toEqual(expect.arrayContaining([
          expect.objectContaining({
            employeeId: availableEmployee.id,
            status: "will_add",
            selectable: true,
            source: "available",
          }),
        ]));
        // Neu: Konfligierender Mitarbeiter sichtbar gesperrt statt ausgeblendet.
        const items = res.body.items as Array<Record<string, unknown>>;
        const conflictItem = items.find((item) => item.employeeId === conflictEmployee.id);
        expect(conflictItem).toMatchObject({
          employeeId: conflictEmployee.id,
          status: "conflict",
          selectable: false,
          conflictReason: "EMPLOYEE_OVERLAP",
        });
      });
  });

  it("locks an absent employee in the assignment preview with an absence reason instead of a generic overlap", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#0ea5e9");
    const targetDate = getRelativeBerlinDate(26);
    const freeEmployee = await createEmployeeFixture("TWE-ASSIGN-ABSENCE-FREE");
    const absentEmployee = await createEmployeeFixture("TWE-ASSIGN-ABSENCE-ON-LEAVE");
    const overlapEmployee = await createEmployeeFixture("TWE-ASSIGN-ABSENCE-OVERLAP");
    const project = await createProjectFixture({ prefix: "TWE-ASSIGN-ABSENCE" });
    await seedWeekPlanNoise("TWE-ASSIGN-ABSENCE", targetDate);

    // Urlaub am Zieltag (als ganztaegiger Abwesenheits-Tour-Termin gespeichert).
    await createEmployeeAppointmentAbsence(absentEmployee.id, {
      absenceType: "vacation",
      startDate: targetDate,
      endDate: targetDate,
      note: `TWE-ASSIGN-ABSENCE-ON-LEAVE-${absentEmployee.id}`,
    }, "ADMIN");

    // Normaler kollidierender Termin am Zieltag.
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetDate,
      startTime: null,
      employeeIds: [overlapEmployee.id],
    });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/assignment-preview`)
      .send({
        startDate: targetDate,
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
        includeAvailableEmployees: true,
      })
      .expect(200)
      .expect((res) => {
        const items = res.body.items as Array<Record<string, unknown>>;
        const itemById = new Map(items.map((item) => [item.employeeId as number, item]));

        // Freier Mitarbeiter: auswaehlbar, kein Sperrgrund.
        expect(itemById.get(freeEmployee.id)).toMatchObject({ selectable: true, conflictReason: null });

        // Urlaub: gesperrt mit Abwesenheitsgrund (ON_LEAVE), nicht generischer Terminkonflikt.
        expect(itemById.get(absentEmployee.id)).toMatchObject({
          status: "conflict",
          selectable: false,
          conflictReason: "ON_LEAVE",
        });

        // Normaler Terminkonflikt: gesperrt mit EMPLOYEE_OVERLAP (Gegenbeispiel zur Abwesenheit).
        expect(itemById.get(overlapEmployee.id)).toMatchObject({
          status: "conflict",
          selectable: false,
          conflictReason: "EMPLOYEE_OVERLAP",
        });
      });
  });

  it("limits week previews to appointments inside the selected ISO week for single-day appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#447799");
    const project = await createProjectFixture({ prefix: "TWE-WEEK-RANGE" });
    const employee = await createEmployeeFixture("TWE-WEEK-RANGE-EMP");
    const targetWeek = resolveNextEditableWeekDates();
    await seedWeekPlanNoise("TWE-WEEK-RANGE", targetWeek.weekMidDate);

    const beforeWeekAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.previousWeekDate,
      tourId: tour.id,
    });
    const targetWeekAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      tourId: tour.id,
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(200);

    expect(preview.body.items).toEqual([
      expect.objectContaining({
        appointmentId: targetWeekAppointment!.id,
      }),
    ]);
    expect(preview.body.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appointmentId: beforeWeekAppointment!.id,
        }),
      ]),
    );
  });

  it("creates a week assignment even when the selected week has no tour appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#3b82f6");
    const employee = await createEmployeeFixture("TWE-NO-APPTS-EMP");
    const targetWeek = resolveNextEditableWeekDates();
    await seedWeekPlanNoise("TWE-NO-APPTS", targetWeek.weekMidDate);

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(200);

    expect(preview.body.items).toEqual([]);

    const execute = await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    expect(execute.body).toMatchObject({
      updatedAppointmentCount: 0,
      skipped: [],
    });

    const list = await admin.get(`/api/tours/${tour.id}/week-employees`).expect(200);
    const targetWeekEntry = list.body.find((week: { isoYear: number; isoWeek: number }) =>
      week.isoYear === targetWeek.isoYear && week.isoWeek === targetWeek.isoWeek,
    );
    expect(targetWeekEntry).toEqual(expect.objectContaining({
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employees: [expect.objectContaining({ employeeId: employee.id })],
    }));
  });

  it("keeps legacy assignment weeks visible alongside the seeded planning horizon", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#0f766e");
    const employee = await createEmployeeFixture("TWE-EXPLICIT-WEEK-EMP");
    const firstWeek = resolveNextEditableWeekDates();
    const secondWeekStart = addWeeks(parseISO(firstWeek.weekStartDate), 1);
    const secondWeek = {
      isoYear: getISOWeekYear(secondWeekStart),
      isoWeek: getISOWeek(secondWeekStart),
    };

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: firstWeek.isoYear,
      isoWeek: firstWeek.isoWeek,
      employeeId: employee.id,
    });

    await admin
      .post(`/api/tours/${tour.id}/weeks`)
      .send(secondWeek)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({
          tourId: tour.id,
          isoYear: secondWeek.isoYear,
          isoWeek: secondWeek.isoWeek,
          isBlocked: false,
        }));
      });

    const persistedWeeks = await db
      .select()
      .from(tourWeeks)
      .where(eq(tourWeeks.tourId, tour.id));
    expect(persistedWeeks).toHaveLength(1);
    expect(persistedWeeks[0]).toEqual(expect.objectContaining({
      tourId: tour.id,
      isoYear: secondWeek.isoYear,
      isoWeek: secondWeek.isoWeek,
      isBlocked: false,
    }));

    await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            isoYear: firstWeek.isoYear,
            isoWeek: firstWeek.isoWeek,
            isBlocked: false,
            employees: [expect.objectContaining({ employeeId: employee.id })],
          }),
          expect.objectContaining({
            isoYear: secondWeek.isoYear,
            isoWeek: secondWeek.isoWeek,
            isBlocked: false,
            employees: [],
          }),
        ]));
      });
  });

  it("keeps repeated add executes idempotent for the same employee in the same tour week", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#14b8a6");
    const employee = await createEmployeeFixture("TWE-IDEMPOTENT-EMP");
    const sideEmployee = await createEmployeeFixture("TWE-IDEMPOTENT-SIDE");
    const targetWeek = resolveNextEditableWeekDates();
    await seedWeekPlanNoise("TWE-IDEMPOTENT", targetWeek.weekMidDate);

    const firstExecute = await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    expect(firstExecute.body).toMatchObject({
      updatedAppointmentCount: 0,
      skipped: [],
    });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.updatedAppointmentCount).toBe(0);
        expect(res.body.skipped).toEqual([]);
      });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: sideEmployee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    const list = await admin.get(`/api/tours/${tour.id}/week-employees`).expect(200);
    const targetWeekEntry = list.body.find((week: { isoYear: number; isoWeek: number }) =>
      week.isoYear === targetWeek.isoYear && week.isoWeek === targetWeek.isoWeek,
    );
    expect(targetWeekEntry).toEqual(expect.objectContaining({
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
    }));
    expect(targetWeekEntry?.employees).toEqual(expect.arrayContaining([
      expect.objectContaining({ employeeId: employee.id }),
      expect.objectContaining({ employeeId: sideEmployee.id }),
    ]));
    expect(targetWeekEntry?.employees).toHaveLength(2);

    const employeeAssignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, tour.id),
        eq(tourWeekEmployees.isoYear, targetWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, targetWeek.isoWeek),
        eq(tourWeekEmployees.employeeId, employee.id),
      ));
    expect(employeeAssignments).toHaveLength(1);
  });

  it("blocks a week, parks appointments plus clears week assignments, exposes the blocked calendar feed and suppresses active week-plan previews", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#b45309");
    const parkplatzTourId = await getTourIdByName("Parkplatz");
    const project = await createProjectFixture({ prefix: "TWE-BLOCK" });
    const employee = await createEmployeeFixture("TWE-BLOCK-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(24),
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: employee.id,
    });

    await admin
      .post(`/api/tours/${tour.id}/weeks/${isoWeek.isoYear}/${isoWeek.isoWeek}/block`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({
          affectedAppointmentCount: 1,
          week: expect.objectContaining({
            tourId: tour.id,
            isoYear: isoWeek.isoYear,
            isoWeek: isoWeek.isoWeek,
            isBlocked: true,
          }),
        }));
      });

    await admin
      .get(`/api/appointments/${appointment!.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.tourId).toBe(parkplatzTourId);
        expect((res.body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual([]);
        const tagNames = (res.body.appointmentTags as Array<{ name: string }>).map((tag) => tag.name);
        expect(tagNames).toContain("Geparkt");
        expect(tagNames).not.toContain("Planung blockiert");
      });

    await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        const targetWeekEntry = res.body.find((week: { isoYear: number; isoWeek: number }) =>
          week.isoYear === isoWeek.isoYear && week.isoWeek === isoWeek.isoWeek,
        );
        expect(targetWeekEntry).toEqual(expect.objectContaining({
          isoYear: isoWeek.isoYear,
          isoWeek: isoWeek.isoWeek,
          isBlocked: true,
          employees: [],
        }));
      });

    const remainingAssignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(and(
        eq(tourWeekEmployees.tourId, tour.id),
        eq(tourWeekEmployees.isoYear, isoWeek.isoYear),
        eq(tourWeekEmployees.isoWeek, isoWeek.isoWeek),
      ));
    expect(remainingAssignments).toHaveLength(0);

    await admin
      .post(`/api/tours/${tour.id}/week-employees/assignment-preview`)
      .send({
        startDate: toDateOnlyString(appointment!.startDate),
        endDate: null,
        startTime: null,
        existingEmployeeIds: [],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
        expect(res.body.message).toBe(`Für ${tour.name}/KW ${isoWeek.isoWeek} wurde die Terminplanung gesperrt.`);
      });

    await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({
        isoYear: isoWeek.isoYear,
        isoWeek: isoWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    await admin
      .get(`/api/calendar/blocked-tour-weeks?fromDate=${toDateOnlyString(appointment!.startDate)}&toDate=${toDateOnlyString(appointment!.startDate)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([
          expect.objectContaining({
            tourId: tour.id,
            isoYear: isoWeek.isoYear,
            isoWeek: isoWeek.isoWeek,
            isBlocked: true,
          }),
        ]);
      });
  });

  it("unblocks a blocked week without restoring parked appointment state", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#1d4ed8");
    const parkplatzTourId = await getTourIdByName("Parkplatz");
    const project = await createProjectFixture({ prefix: "TWE-UNBLOCK" });
    const employee = await createEmployeeFixture("TWE-UNBLOCK-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(26),
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: employee.id,
    });

    await admin
      .post(`/api/tours/${tour.id}/weeks/${isoWeek.isoYear}/${isoWeek.isoWeek}/block`)
      .send({})
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/weeks/${isoWeek.isoYear}/${isoWeek.isoWeek}/unblock`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({
          week: expect.objectContaining({
            tourId: tour.id,
            isoYear: isoWeek.isoYear,
            isoWeek: isoWeek.isoWeek,
            isBlocked: false,
          }),
        }));
      });

    await admin
      .get(`/api/appointments/${appointment!.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.tourId).toBe(parkplatzTourId);
        expect((res.body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual([]);
        const tagNames = (res.body.appointmentTags as Array<{ name: string }>).map((tag) => tag.name);
        expect(tagNames).toContain("Geparkt");
        expect(tagNames).not.toContain("Planung blockiert");
      });

    await admin
      .get(`/api/tours/${tour.id}/week-employees`)
      .expect(200)
      .expect((res) => {
        const targetWeekEntry = res.body.find((week: { isoYear: number; isoWeek: number }) =>
          week.isoYear === isoWeek.isoYear && week.isoWeek === isoWeek.isoWeek,
        );
        expect(targetWeekEntry).toEqual(expect.objectContaining({
          isoYear: isoWeek.isoYear,
          isoWeek: isoWeek.isoWeek,
          isBlocked: false,
          employees: [],
        }));
      });
  });

  it("leaves cancelled appointments in the blocked tour week and excludes them from affected count", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#be123c");
    const project = await createProjectFixture({ prefix: "TWE-BLOCK-CANCELLED" });
    const employee = await createEmployeeFixture("TWE-BLOCK-CANCELLED-EMP");
    const cancelledEmployee = await createEmployeeFixture("TWE-BLOCK-CANCELLED-KEEP");
    const activeAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(28),
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const cancelledAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: toDateOnlyString(activeAppointment!.startDate),
      tourId: tour.id,
      employeeIds: [cancelledEmployee.id],
    });
    const { allTags } = await ensureSystemTagsFixture();
    const cancellationTag = allTags.find((tag) => tag.name === "Storniert");
    if (!cancellationTag) throw new Error("Expected Storniert tag to exist.");
    await attachAppointmentTagFixture(cancelledAppointment!.id, cancellationTag.id);
    const isoWeek = resolveIsoWeek(activeAppointment!.startDate);
    const parkplatzTourId = await getTourIdByName("Parkplatz");

    await admin
      .post(`/api/tours/${tour.id}/weeks/${isoWeek.isoYear}/${isoWeek.isoWeek}/block`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({
          affectedAppointmentCount: 1,
          week: expect.objectContaining({
            tourId: tour.id,
            isoYear: isoWeek.isoYear,
            isoWeek: isoWeek.isoWeek,
            isBlocked: true,
          }),
        }));
      });

    await admin
      .get(`/api/appointments/${activeAppointment!.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.tourId).toBe(parkplatzTourId);
        expect((res.body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual([]);
        const tagNames = (res.body.appointmentTags as Array<{ name: string }>).map((tag) => tag.name);
        expect(tagNames).toContain("Geparkt");
        expect(tagNames).not.toContain("Planung blockiert");
      });

    await admin
      .get(`/api/appointments/${cancelledAppointment!.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.tourId).toBe(tour.id);
        expect((res.body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual([cancelledEmployee.id]);
        const tagNames = (res.body.appointmentTags as Array<{ name: string }>).map((tag) => tag.name);
        expect(tagNames).toContain("Storniert");
        expect(tagNames).not.toContain("Geparkt");
        expect(tagNames).not.toContain("Planung blockiert");
      });
  });

  it("keeps the assignment when all appointments conflict and only leaves future appointments untouched", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#ef4444");
    const project = await createProjectFixture({ prefix: "TWE-ALL-CONFLICT" });
    const employee = await createEmployeeFixture("TWE-ALL-CONFLICT-EMP");
    const targetWeek = resolveNextEditableWeekDates();
    await seedWeekPlanNoise("TWE-ALL-CONFLICT", targetWeek.weekMidDate);

    const firstTourAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      tourId: tour.id,
    });
    const secondTourAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      tourId: tour.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekStartDate,
      employeeIds: [employee.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      employeeIds: [employee.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/add/preview`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
      })
      .expect(200);

    expect(preview.body.items).toEqual([
      expect.objectContaining({
        appointmentId: firstTourAppointment!.id,
        status: "conflict",
        selectable: false,
      }),
      expect.objectContaining({
        appointmentId: secondTourAppointment!.id,
        status: "conflict",
        selectable: false,
      }),
    ]);

    const execute = await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [],
      })
      .expect(200);

    expect(execute.body).toMatchObject({
      updatedAppointmentCount: 0,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(firstTourAppointment!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(secondTourAppointment!.id)).toEqual([]);

    const list = await admin.get(`/api/tours/${tour.id}/week-employees`).expect(200);
    const targetWeekEntry = list.body.find((week: { isoYear: number; isoWeek: number }) =>
      week.isoYear === targetWeek.isoYear && week.isoWeek === targetWeek.isoWeek,
    );
    expect(targetWeekEntry?.employees).toEqual(
      expect.arrayContaining([expect.objectContaining({ employeeId: employee.id })]),
    );
  });

  it("removes a week assignment even when no appointment in that week currently contains the employee", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#8b5cf6");
    const project = await createProjectFixture({ prefix: "TWE-REMOVE-EMPTY" });
    const employee = await createEmployeeFixture("TWE-REMOVE-EMPTY-EMP");
    const targetWeek = resolveNextEditableWeekDates();
    await seedWeekPlanNoise("TWE-REMOVE-EMPTY", targetWeek.weekMidDate);

    const untouchedAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: targetWeek.weekMidDate,
      tourId: tour.id,
      employeeIds: [],
    });

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employeeId: employee.id,
    });
    const assignmentId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId);

    const preview = await admin
      .post(`/api/tours/${tour.id}/week-employees/remove/preview`)
      .send({ assignmentId })
      .expect(200);

    expect(preview.body.items).toEqual([]);

    await admin
      .delete(`/api/tours/${tour.id}/week-employees/${assignmentId}`)
      .send({
        isoYear: targetWeek.isoYear,
        isoWeek: targetWeek.isoWeek,
        selectedAppointmentIds: [],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.updatedAppointmentCount).toBe(0);
      });

    expect(await getAppointmentEmployeeIds(untouchedAppointment!.id)).toEqual([]);
    const remainingAssignments = await db
      .select()
      .from(tourWeekEmployees)
      .where(eq(tourWeekEmployees.id, assignmentId));
    expect(remainingAssignments).toHaveLength(0);
  });

  it("bumps the appointment version so stale saves are rejected after a week-plan removal", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#114488");
    const project = await createProjectFixture({ prefix: "TWE-VERSION" });
    const employee = await createEmployeeFixture("TWE-VERSION-EMP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(22),
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const isoWeek = resolveIsoWeek(appointment!.startDate);
    await seedWeekPlanNoise("TWE-VERSION", toDateOnlyString(appointment!.startDate));

    const detailBeforeRemoval = await admin.get(`/api/appointments/${appointment!.id}`).expect(200);
    const staleVersion = Number(detailBeforeRemoval.body.version);

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: isoWeek.isoYear,
      isoWeek: isoWeek.isoWeek,
      employeeId: employee.id,
    });
    const assignmentId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId);

    await admin
      .delete(`/api/tours/${tour.id}/week-employees/${assignmentId}`)
      .send({
        isoYear: isoWeek.isoYear,
        isoWeek: isoWeek.isoWeek,
        selectedAppointmentIds: [appointment!.id],
      })
      .expect(200);

    await admin.get(`/api/appointments/${appointment!.id}`).expect(200).expect(({ body }) => {
      expect(body.version).toBe(staleVersion + 1);
      expect((body.employees as Array<{ id: number }>).map((entry) => entry.id)).toEqual([]);
    });

    await admin
      .patch(`/api/appointments/${appointment!.id}`)
      .send({
        version: staleVersion,
        projectId: project.id,
        customerId: detailBeforeRemoval.body.customerId,
        tourId: tour.id,
        startDate: detailBeforeRemoval.body.startDate,
        endDate: detailBeforeRemoval.body.endDate,
        startTime: detailBeforeRemoval.body.startTime,
        employeeIds: [employee.id],
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });
  });
});
