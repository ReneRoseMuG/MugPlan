/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Tour-Create, Tour-Rename und Tour-Delete schreiben fachlich verwertbare Journaleintraege mit Tour-Self-Kontext.
 * - Kalenderwochen-Aktionen erscheinen gleichzeitig im Tour-Journal und im KW-Journal ueber denselben Eintrag.
 * - Wochenplan-Mitarbeiteraktionen und ihre Termin-Kaskaden erscheinen gleichzeitig im Tour-, Mitarbeiter- und KW-Journal.
 * - KW-Create bleibt serverseitig idempotent und erzeugt bei wiederholten Requests keine Dubletten.
 *
 * Fehlerfaelle:
 * - Tour-Mutationen schreiben keinen oder den falschen Trigger/Feldinhalt.
 * - Wochenereignisse sind nur in einem Journal sichtbar, obwohl Mehrfachsichtbarkeit erwartet wird.
 * - Mitarbeiter-Kaskaden verlieren Tour- oder KW-Kontexte.
 * - Dieselbe Tour/KW wird mehrfach persistiert.
 *
 * Ziel:
 * Die neue Tour-/KW-Journalisierung end-to-end ueber echte API-Mutationen und echte Journal-Reads absichern.
 */
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";

import { db } from "../../../server/db";
import { tourWeeks } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

type JournalApiItem = {
  tableName: string;
  recordId: number | null;
  recordKey: string | null;
  triggerKey: string | null;
  field: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  contexts: Array<{
    contextTable: string;
    contextId: number | null;
    contextKey: string | null;
    relationRole: string | null;
  }>;
};

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

function resolveNextEditableWeek() {
  const nextWeekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 1));
  return {
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(addDays(nextWeekStart, 1), "yyyy-MM-dd"),
  };
}

function toCalendarWeekKey(params: { tourId: number; isoYear: number; isoWeek: number }): string {
  return `${params.isoYear}-${String(params.isoWeek).padStart(2, "0")}-${params.tourId}`;
}

async function createTour(agent: SuperAgentTest, color = "#335577") {
  const response = await agent
    .post("/api/tours")
    .send({ color })
    .expect(201);

  return response.body as {
    id: number;
    name: string;
    color: string;
    version: number;
  };
}

async function getJournalItems(
  agent: SuperAgentTest,
  params: { contextTable: string; contextId?: number; contextKey?: string },
) {
  const search = new URLSearchParams({
    page: "1",
    pageSize: "100",
    contextTable: params.contextTable,
  });

  if (typeof params.contextId === "number") {
    search.set("contextId", String(params.contextId));
  }
  if (params.contextKey) {
    search.set("contextKey", params.contextKey);
  }

  const response = await agent
    .get(`/api/journal/messages?${search.toString()}`)
    .expect(200);

  return response.body.items as JournalApiItem[];
}

function findEntry(
  items: JournalApiItem[],
  expected: { tableName: string; triggerKey: string; field?: string | null },
) {
  return items.find((item) =>
    item.tableName === expected.tableName
    && item.triggerKey === expected.triggerKey
    && (expected.field === undefined || item.field === expected.field));
}

function expectContext(
  item: JournalApiItem | undefined,
  expected: { contextTable: string; contextId?: number | null; contextKey?: string | null },
) {
  expect(item).toBeTruthy();
  expect(item?.contexts).toEqual(expect.arrayContaining([
    expect.objectContaining({
      contextTable: expected.contextTable,
      ...(expected.contextId !== undefined ? { contextId: expected.contextId } : {}),
      ...(expected.contextKey !== undefined ? { contextKey: expected.contextKey } : {}),
    }),
  ]));
}

describe("FT-Journal integration: tour and calendar week journals", () => {
  it("writes create, rename and delete audit entries for tours and suppresses color-only updates", async () => {
    const admin = await loginAdminAgent(app);
    const created = await createTour(admin, "#2255aa");

    const colorOnlyUpdate = await admin
      .patch(`/api/tours/${created.id}`)
      .send({
        name: created.name,
        color: "#114477",
        version: created.version,
      })
      .expect(200)
      .then((response) => response.body as { version: number });

    let journal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: created.id,
    });

    const createEntry = findEntry(journal, {
      tableName: "tour",
      triggerKey: "tour.create",
    });
    expectContext(createEntry, {
      contextTable: "tour",
      contextId: created.id,
    });
    expect(findEntry(journal, {
      tableName: "tour",
      triggerKey: "tour.update.name",
    })).toBeUndefined();

    const renamed = await admin
      .patch(`/api/tours/${created.id}`)
      .send({
        name: `${created.name} Journal`,
        color: "#446688",
        version: colorOnlyUpdate.version,
      })
      .expect(200)
      .then((response) => response.body as { name: string; version: number });

    journal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: created.id,
    });

    const renameEntry = findEntry(journal, {
      tableName: "tour",
      triggerKey: "tour.update.name",
      field: "name",
    });
    expect(renameEntry).toMatchObject({
      field: "name",
      oldValue: created.name,
      newValue: renamed.name,
    });
    expectContext(renameEntry, {
      contextTable: "tour",
      contextId: created.id,
    });

    await admin
      .delete(`/api/tours/${created.id}`)
      .send({ version: renamed.version })
      .expect(204);

    journal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: created.id,
    });

    const deleteEntry = findEntry(journal, {
      tableName: "tour",
      triggerKey: "tour.delete",
    });
    expectContext(deleteEntry, {
      contextTable: "tour",
      contextId: created.id,
    });
  });

  it("shows week create, block and unblock entries in both tour and KW journals and keeps create idempotent", async () => {
    const admin = await loginAdminAgent(app);
    const tour = await createTour(admin, "#0f766e");
    const nextWeek = resolveNextEditableWeek();
    const weekKey = toCalendarWeekKey({
      tourId: tour.id,
      isoYear: nextWeek.isoYear,
      isoWeek: nextWeek.isoWeek,
    });

    await admin
      .post(`/api/tours/${tour.id}/weeks`)
      .send({
        isoYear: nextWeek.isoYear,
        isoWeek: nextWeek.isoWeek,
      })
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/weeks`)
      .send({
        isoYear: nextWeek.isoYear,
        isoWeek: nextWeek.isoWeek,
      })
      .expect(200);

    const persistedWeeks = await db
      .select()
      .from(tourWeeks)
      .where(and(
        eq(tourWeeks.tourId, tour.id),
        eq(tourWeeks.isoYear, nextWeek.isoYear),
        eq(tourWeeks.isoWeek, nextWeek.isoWeek),
      ));

    expect(persistedWeeks).toHaveLength(1);

    await admin
      .post(`/api/tours/${tour.id}/weeks/${nextWeek.isoYear}/${nextWeek.isoWeek}/block`)
      .send({})
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/weeks/${nextWeek.isoYear}/${nextWeek.isoWeek}/unblock`)
      .send({})
      .expect(200);

    const tourJournal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: tour.id,
    });
    const weekJournal = await getJournalItems(admin, {
      contextTable: "calendar_week",
      contextKey: weekKey,
    });

    const weekCreateTourEntry = findEntry(tourJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.create",
    });
    const weekCreateWeekEntry = findEntry(weekJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.create",
    });
    expectContext(weekCreateTourEntry, { contextTable: "tour", contextId: tour.id });
    expectContext(weekCreateTourEntry, { contextTable: "calendar_week", contextKey: weekKey });
    expectContext(weekCreateWeekEntry, { contextTable: "tour", contextId: tour.id });

    const weekBlockTourEntry = findEntry(tourJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.block",
    });
    const weekUnblockTourEntry = findEntry(tourJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.unblock",
    });
    expectContext(weekBlockTourEntry, { contextTable: "calendar_week", contextKey: weekKey });
    expectContext(weekUnblockTourEntry, { contextTable: "calendar_week", contextKey: weekKey });

    expect(findEntry(weekJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.block",
    })).toBeTruthy();
    expect(findEntry(weekJournal, {
      tableName: "calendar_week",
      triggerKey: "calendar_week.unblock",
    })).toBeTruthy();
  });

  it("shows week employee actions and appointment cascades in tour, employee and KW journals", async () => {
    const admin = await loginAdminAgent(app);
    const tour = await createTour(admin, "#1d4ed8");
    const employee = await createEmployeeFixture("TOUR-JOURNAL-WEEK-EMP");
    const project = await createProjectFixture({ prefix: "TOUR-JOURNAL-WEEK" });
    const nextWeek = resolveNextEditableWeek();
    const weekKey = toCalendarWeekKey({
      tourId: tour.id,
      isoYear: nextWeek.isoYear,
      isoWeek: nextWeek.isoWeek,
    });

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: nextWeek.weekStartDate,
      tourId: tour.id,
      employeeIds: [],
    });
    if (!appointment) {
      throw new Error("Expected appointment fixture to be created.");
    }

    const addResult = await admin
      .post(`/api/tours/${tour.id}/week-employees/add`)
      .send({
        isoYear: nextWeek.isoYear,
        isoWeek: nextWeek.isoWeek,
        employeeId: employee.id,
        selectedAppointmentIds: [appointment.id],
      })
      .expect(200)
      .then((response) => response.body as { assignmentId: number });

    let tourJournal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: tour.id,
    });
    let employeeJournal = await getJournalItems(admin, {
      contextTable: "employee",
      contextId: employee.id,
    });
    let weekJournal = await getJournalItems(admin, {
      contextTable: "calendar_week",
      contextKey: weekKey,
    });

    const assignmentCreateTourEntry = findEntry(tourJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.create",
    });
    const appointmentAddTourEntry = findEntry(tourJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_add",
    });
    expectContext(assignmentCreateTourEntry, { contextTable: "tour", contextId: tour.id });
    expectContext(assignmentCreateTourEntry, { contextTable: "employee", contextId: employee.id });
    expectContext(assignmentCreateTourEntry, { contextTable: "calendar_week", contextKey: weekKey });
    expectContext(appointmentAddTourEntry, { contextTable: "tour", contextId: tour.id });
    expectContext(appointmentAddTourEntry, { contextTable: "employee", contextId: employee.id });
    expectContext(appointmentAddTourEntry, { contextTable: "calendar_week", contextKey: weekKey });
    expectContext(appointmentAddTourEntry, { contextTable: "appointment", contextId: appointment.id });

    expect(findEntry(employeeJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.create",
    })).toBeTruthy();
    expect(findEntry(employeeJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_add",
    })).toBeTruthy();
    expect(findEntry(weekJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.create",
    })).toBeTruthy();
    expect(findEntry(weekJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_add",
    })).toBeTruthy();

    await admin
      .delete(`/api/tours/${tour.id}/week-employees/${addResult.assignmentId}`)
      .send({
        isoYear: nextWeek.isoYear,
        isoWeek: nextWeek.isoWeek,
        selectedAppointmentIds: [appointment.id],
      })
      .expect(200);

    tourJournal = await getJournalItems(admin, {
      contextTable: "tour",
      contextId: tour.id,
    });
    employeeJournal = await getJournalItems(admin, {
      contextTable: "employee",
      contextId: employee.id,
    });
    weekJournal = await getJournalItems(admin, {
      contextTable: "calendar_week",
      contextKey: weekKey,
    });

    const assignmentDeleteTourEntry = findEntry(tourJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.delete",
    });
    const appointmentRemoveTourEntry = findEntry(tourJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_remove",
    });
    expectContext(assignmentDeleteTourEntry, { contextTable: "tour", contextId: tour.id });
    expectContext(appointmentRemoveTourEntry, { contextTable: "tour", contextId: tour.id });

    expect(findEntry(employeeJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.delete",
    })).toBeTruthy();
    expect(findEntry(employeeJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_remove",
    })).toBeTruthy();
    expect(findEntry(weekJournal, {
      tableName: "employee_week_assignment",
      triggerKey: "employee.week_assignment.delete",
    })).toBeTruthy();
    expect(findEntry(weekJournal, {
      tableName: "appointment_employee",
      triggerKey: "employee.week_assignment.appointment_remove",
    })).toBeTruthy();
  });
});
