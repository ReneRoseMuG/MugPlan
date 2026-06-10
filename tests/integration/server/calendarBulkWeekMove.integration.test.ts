/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Preview ermittelt die Termine der ausgewählten Touren in der Ausgangswoche und berechnet das Ziel um N volle KW.
 * - Blockierende Tags schließen einen Termin aus (nicht auswählbar, BLOCKING_TAG, Begründung nennt das Tag).
 * - Bundeseinheitliche Feiertage am Ziel sind ein nicht-blockierender Hinweis (Termin bleibt auswählbar/vorausgewählt).
 * - Terminnotizen erzeugen einen nicht-blockierenden Hinweis am betroffenen Termin.
 * - Execute verschiebt nur ausgewählte Termine, teilweise Ausführung: Versionskonflikt blockiert nur den betroffenen Termin.
 * - Execute erhält Mitarbeiter, Tour und Kundenzuordnung und verschiebt Start-/Enddatum exakt um N volle KW.
 * - Historische Termine: für Disponenten blockiert, für Administratoren ausführbar.
 * - Leser werden bei Preview und Execute serverseitig mit 403 blockiert.
 * - Benutzereinstellungen (Quelltouren, Distanz, blockierende Tags) sind persistent les-/schreibbar.
 *
 * Fehlerfälle:
 * - Stale Version beim Execute -> VERSION_CONFLICT für genau diesen Termin, andere bleiben erfolgreich.
 * - Tag-blockierte Termine sind im Report nicht auswählbar.
 * - Rollenverstoß (Leser) -> 403.
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: echte Routen /api/calendar/bulk-week-move/preview und /execute.
 * - Eindeutiger Nachweis: Termine über appointmentId identifiziert; Tag-/Kunden-/Tour-Fixtures mit eindeutigen Tokens.
 * - Kritische Assertion: Count-/Identitäts-/Delta-Nachweise auf startDate, version, employees, tourId statt reiner Existenz.
 * - False-Positive-Schutz: isolierter temporärer Kalendermarker-Store je Test; Zielzustände werden über die GET-API rückgelesen.
 *
 * Isolation: Klasse B (DB-Schreibzugriffe). Baseline: core. Storage: isolierter temporärer Kalendermarker-Store (none/uploads/backups: none).
 *
 * Ziel:
 * Absicherung der serverseitigen Sammelverschiebung (Report + teilweise Ausführung) gegen alle fachlichen Regeln aus UC-258.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { ServerScopedFileStore } from "../../../server/services/serverScopedFileStore";
import {
  resetCalendarMarkersFileStoreForTests,
  setCalendarMarkersFileStoreForTests,
} from "../../../server/repositories/calendarMarkersRepository";
import { createCalendarMarker } from "../../../server/services/calendarMarkersService";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createExactTagFixture,
  createProjectFixture,
  createRawAppointmentFixture,
  createTourFixture,
  attachAppointmentTagFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { createAppointmentNote } from "../../../server/services/appointmentNotesService";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let tempRoot = "";
let userCounter = 0;

const PREVIEW_PATH = "/api/calendar/bulk-week-move/preview";
const EXECUTE_PATH = "/api/calendar/bulk-week-move/execute";

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-bulk-week-move-"));
  setCalendarMarkersFileStoreForTests(new ServerScopedFileStore({ baseDirectory: tempRoot }));
  userCounter += 1;
});

afterEach(async () => {
  resetCalendarMarkersFileStoreForTests();
  if (tempRoot) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const base = new Date(`${dateOnly}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

async function createDispatcherAgent(): Promise<SuperAgentTest> {
  const username = `bulk-move-disp-${userCounter}-${Date.now()}`;
  const password = `${username}-pw`;
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Bulk",
    lastName: "Disponent",
    passwordHash: await hashPassword(password),
    roleCode: "DISPATCHER",
  });
  return loginAgent(app, { username, password });
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `bulk-move-reader-${userCounter}-${Date.now()}`;
  const password = `${username}-pw`;
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Bulk",
    lastName: "Leser",
    passwordHash: await hashPassword(password),
    roleCode: "READER",
  });
  return loginAgent(app, { username, password });
}

describe("Bulk-KW-Verschiebung Preview", () => {
  it("kennzeichnet verschiebbare Termine als vorausgewählt und tag-blockierte als nicht auswählbar", async () => {
    const agent = await createDispatcherAgent();
    const customer = await createCustomerFixture("BULK-PREVIEW");
    const tour = await createTourFixture();
    const blockingTag = await createExactTagFixture(`Fix-${userCounter}-${Date.now()}`);
    const sourceDate = getRelativeBerlinDate(35);

    const movable = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });
    const blocked = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });
    await attachAppointmentTagFixture(Number(blocked.id), blockingTag.id);

    const response = await agent.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: sourceDate,
      shiftWeeks: 2,
      blockingTagIds: [blockingTag.id],
    }).expect(200);

    const items: any[] = response.body.items;
    const movableItem = items.find((item) => item.appointmentId === Number(movable.id));
    const blockedItem = items.find((item) => item.appointmentId === Number(blocked.id));

    expect(movableItem).toBeDefined();
    expect(blockedItem).toBeDefined();
    expect(movableItem.status).toBe("movable");
    expect(movableItem.selectable).toBe(true);
    expect(movableItem.preselected).toBe(true);
    expect(movableItem.targetStartDate).toBe(addDaysToDateOnly(sourceDate, 14));

    expect(blockedItem.status).toBe("blocked");
    expect(blockedItem.selectable).toBe(false);
    expect(blockedItem.preselected).toBe(false);
    expect(blockedItem.blockReasons.map((reason: any) => reason.code)).toContain("BLOCKING_TAG");
    expect(blockedItem.blockReasons.find((reason: any) => reason.code === "BLOCKING_TAG").message).toContain(blockingTag.name);
  });

  it("weist bundeseinheitliche Feiertage am Ziel als nicht-blockierenden Hinweis aus", async () => {
    const agent = await createDispatcherAgent();
    const customer = await createCustomerFixture("BULK-HOLIDAY");
    const tour = await createTourFixture();
    const sourceDate = getRelativeBerlinDate(42);
    const targetDate = addDaysToDateOnly(sourceDate, 7);

    await createCalendarMarker("ADMIN", {
      date: targetDate,
      endDate: null,
      name: "Testfeiertag bundesweit",
      type: "public_holiday",
      source: "automatic",
      scope: "national",
      states: [],
      active: true,
      note: null,
    });

    const appointment = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });

    const response = await agent.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: sourceDate,
      shiftWeeks: 1,
      blockingTagIds: [],
    }).expect(200);

    const item = response.body.items.find((entry: any) => entry.appointmentId === Number(appointment.id));
    expect(item).toBeDefined();
    expect(item.status).toBe("movable");
    expect(item.selectable).toBe(true);
    expect(item.hints.map((hint: any) => hint.code)).toContain("PUBLIC_HOLIDAY");
    expect(item.hints.find((hint: any) => hint.code === "PUBLIC_HOLIDAY").message).toContain("Testfeiertag bundesweit");
  });

  it("erzeugt für Termine mit Notizen einen nicht-blockierenden Notizhinweis", async () => {
    const agent = await createDispatcherAgent();
    const customer = await createCustomerFixture("BULK-NOTES");
    const tour = await createTourFixture();
    const sourceDate = getRelativeBerlinDate(49);
    const appointment = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });
    await createAppointmentNote(Number(appointment.id), { title: "Bezugstermin", body: "Achtung Datumsbezug", print: false });

    const response = await agent.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: sourceDate,
      shiftWeeks: 1,
      blockingTagIds: [],
    }).expect(200);

    const item = response.body.items.find((entry: any) => entry.appointmentId === Number(appointment.id));
    expect(item).toBeDefined();
    expect(item.status).toBe("movable");
    expect(item.hints.map((hint: any) => hint.code)).toContain("NOTES");
  });
});

describe("Bulk-KW-Verschiebung Execute", () => {
  it("verschiebt nur ausgewählte Termine und isoliert Versionskonflikte (teilweise Ausführung)", async () => {
    const agent = await createDispatcherAgent();
    const customer = await createCustomerFixture("BULK-EXEC");
    const tour = await createTourFixture();
    const sourceDate = getRelativeBerlinDate(35);
    const targetDate = addDaysToDateOnly(sourceDate, 7);

    const moved = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });
    const conflicting = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });
    const untouched = await createAppointmentFixture({ customerId: customer.id, tourId: tour.id, startDate: sourceDate });

    const response = await agent.post(EXECUTE_PATH).send({
      shiftWeeks: 1,
      items: [
        { appointmentId: Number(moved.id), version: 1 },
        { appointmentId: Number(conflicting.id), version: 99 },
      ],
    }).expect(200);

    expect(response.body.moved.map((entry: any) => entry.appointmentId)).toEqual([Number(moved.id)]);
    expect(response.body.failed).toHaveLength(1);
    expect(response.body.failed[0].appointmentId).toBe(Number(conflicting.id));
    expect(response.body.failed[0].code).toBe("VERSION_CONFLICT");

    const movedAfter = await agent.get(`/api/appointments/${Number(moved.id)}`).expect(200);
    expect(movedAfter.body.startDate).toBe(targetDate);
    expect(movedAfter.body.version).toBeGreaterThan(1);

    const conflictingAfter = await agent.get(`/api/appointments/${Number(conflicting.id)}`).expect(200);
    expect(conflictingAfter.body.startDate).toBe(sourceDate);

    const untouchedAfter = await agent.get(`/api/appointments/${Number(untouched.id)}`).expect(200);
    expect(untouchedAfter.body.startDate).toBe(sourceDate);
    expect(untouchedAfter.body.version).toBe(1);
  });

  it("erhält Mitarbeiter, Tour und Datumsdelta exakt um N volle Kalenderwochen", async () => {
    const agent = await createDispatcherAgent();
    const customer = await createCustomerFixture("BULK-PRESERVE");
    const tour = await createTourFixture();
    const employeeA = await createEmployeeFixture("BULK-EMP-A");
    const employeeB = await createEmployeeFixture("BULK-EMP-B");
    const sourceDate = getRelativeBerlinDate(35);
    const endDate = addDaysToDateOnly(sourceDate, 1);

    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      tourId: tour.id,
      startDate: sourceDate,
      endDate,
      employeeIds: [Number(employeeA.id), Number(employeeB.id)],
    });

    await agent.post(EXECUTE_PATH).send({
      shiftWeeks: 3,
      items: [{ appointmentId: Number(appointment.id), version: 1 }],
    }).expect(200);

    const after = await agent.get(`/api/appointments/${Number(appointment.id)}`).expect(200);
    expect(after.body.startDate).toBe(addDaysToDateOnly(sourceDate, 21));
    expect(after.body.endDate).toBe(addDaysToDateOnly(endDate, 21));
    expect(after.body.tourId).toBe(tour.id);
    expect(after.body.employees.map((employee: any) => employee.id).sort()).toEqual(
      [Number(employeeA.id), Number(employeeB.id)].sort(),
    );
  });
});

describe("Bulk-KW-Verschiebung Rollen- und Historienregeln", () => {
  it("blockiert historische Termine für Disponenten, erlaubt sie aber für Administratoren", async () => {
    const dispatcher = await createDispatcherAgent();
    const adminAgent = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "BULK-HIST" });
    const tour = await createTourFixture();
    const pastDate = getRelativeBerlinDate(-7);
    const appointmentId = await createRawAppointmentFixture({
      projectId: project.id,
      startDate: pastDate,
      title: "Historischer Bulk-Termin",
      tourId: tour.id,
    });

    const dispatcherPreview = await dispatcher.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: pastDate,
      shiftWeeks: 1,
      blockingTagIds: [],
    }).expect(200);
    const dispatcherItem = dispatcherPreview.body.items.find((entry: any) => entry.appointmentId === appointmentId);
    expect(dispatcherItem).toBeDefined();
    expect(dispatcherItem.status).toBe("blocked");
    expect(dispatcherItem.blockReasons.map((reason: any) => reason.code)).toContain("PAST_APPOINTMENT_READONLY");

    const adminPreview = await adminAgent.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: pastDate,
      shiftWeeks: 1,
      blockingTagIds: [],
    }).expect(200);
    const adminItem = adminPreview.body.items.find((entry: any) => entry.appointmentId === appointmentId);
    expect(adminItem).toBeDefined();
    expect(adminItem.status).toBe("movable");

    const adminExecute = await adminAgent.post(EXECUTE_PATH).send({
      shiftWeeks: 1,
      items: [{ appointmentId, version: adminItem.version }],
    }).expect(200);
    expect(adminExecute.body.moved.map((entry: any) => entry.appointmentId)).toContain(appointmentId);
  });

  it("blockiert Leser bei Preview und Execute mit 403", async () => {
    const reader = await createReaderAgent();
    const tour = await createTourFixture();
    const sourceDate = getRelativeBerlinDate(35);

    await reader.post(PREVIEW_PATH).send({
      sourceTourIds: [tour.id],
      sourceWeekDate: sourceDate,
      shiftWeeks: 1,
      blockingTagIds: [],
    }).expect(403);

    await reader.post(EXECUTE_PATH).send({
      shiftWeeks: 1,
      items: [{ appointmentId: 1, version: 1 }],
    }).expect(403);
  });
});

describe("Bulk-KW-Verschiebung Benutzereinstellungen", () => {
  it("speichert und liest Quelltouren, Distanz und blockierende Tags pro Anwender", async () => {
    const agent = await createDispatcherAgent();
    const tour = await createTourFixture();
    const blockingTag = await createExactTagFixture(`Fix-Setting-${userCounter}-${Date.now()}`);

    await agent.patch("/api/user-settings").send({
      key: "calendarBulkMove.sourceTourIds",
      scopeType: "USER",
      version: 1,
      value: [tour.id],
    }).expect(200);
    await agent.patch("/api/user-settings").send({
      key: "calendarBulkMove.shiftWeeks",
      scopeType: "USER",
      version: 1,
      value: 4,
    }).expect(200);
    await agent.patch("/api/user-settings").send({
      key: "calendarBulkMove.blockingTagIds",
      scopeType: "USER",
      version: 1,
      value: [blockingTag.id],
    }).expect(200);

    const resolved = await agent.get("/api/user-settings/resolved").expect(200);
    const byKey = new Map<string, any>(resolved.body.map((entry: any) => [entry.key, entry]));
    expect(byKey.get("calendarBulkMove.sourceTourIds").resolvedValue).toEqual([tour.id]);
    expect(byKey.get("calendarBulkMove.shiftWeeks").resolvedValue).toBe(4);
    expect(byKey.get("calendarBulkMove.blockingTagIds").resolvedValue).toEqual([blockingTag.id]);
  });
});
