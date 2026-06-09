/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein regulaerer Zukunftstermin laesst sich in der Wochenansicht per Drag-and-drop auf einen anderen Zukunftstag verschieben.
 * - Der Wochenkalender loest dabei den echten PATCH-Request aus und uebernimmt das neue Datum sichtbar.
 *
 * Fehlerfaelle:
 * - Drag-and-drop startet in der Wochenansicht nicht.
 * - Der Browser zeigt einen erfolgreichen Drag, sendet aber keinen PATCH.
 * - Der PATCH ist erfolgreich, der Termin bleibt jedoch am Ursprungstag.
 *
 * Ziel:
 * Einen positiven Browser-Referenztest fuer den normalen D&D-Pfad der Wochenansicht bereitstellen.
 */
import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

type CapturedDndEvent = {
  type: string;
  targetTestId: string | null;
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("moves a regular future appointment onto another future day in the week view", async ({ page }) => {
  test.setTimeout(120_000);

  const browserConsoleMessages: string[] = [];
  page.on("console", (message) => {
    browserConsoleMessages.push(message.text());
  });

  const project = await createProjectFixture({ prefix: "FT01-BROWSER-WEEK-DND" });
  const tour = await createTourFixture("#0f766e");
  const sourceDate = getRelativeBerlinDate(2);
  const targetDate = getRelativeBerlinDate(3);

  await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    endDate: targetDate,
    tourId: tour.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`).first();

  await expect(appointmentPanel).toBeVisible();

  await page.evaluate(() => {
    const eventNames = ["dragstart", "dragenter", "dragover", "drop", "dragend"];
    (window as Window & { __calendarWeekDndEvents?: CapturedDndEvent[] }).__calendarWeekDndEvents = [];

    const recordEvent = (event: Event) => {
      const targetTestId = event.target instanceof Element
        ? event.target.closest("[data-testid]")?.getAttribute("data-testid") ?? null
        : null;

      (window as Window & { __calendarWeekDndEvents?: CapturedDndEvent[] }).__calendarWeekDndEvents?.push({
        type: event.type,
        targetTestId,
      });
    };

    for (const eventName of eventNames) {
      document.addEventListener(eventName, recordEvent, true);
    }
  });

  const awaitPatchResponse = () => page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 }).catch(() => null);

  let patchResponsePromise = awaitPatchResponse();
  const sourceTestId = `week-appointment-panel-${appointment.id}`;
  const targetOverlayTestId = `week-day-drop-overlay-${targetDate}-lane-tour-${tour.id}`;

  const dragStarted = await page.evaluate(async ({ sourceTestId, targetOverlayTestId, appointmentId }) => {
    const source = document.querySelector(`[data-testid="${sourceTestId}"]`);
    if (!(source instanceof HTMLElement)) {
      return false;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", String(appointmentId));

    source.dispatchEvent(new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const target = document.querySelector(`[data-testid="${targetOverlayTestId}"]`);
    if (!(target instanceof HTMLElement)) {
      source.dispatchEvent(new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      return false;
    }

    target.dispatchEvent(new DragEvent("dragenter", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    target.dispatchEvent(new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    target.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    source.dispatchEvent(new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    return true;
  }, {
    sourceTestId,
    targetOverlayTestId,
    appointmentId: appointment.id,
  });

  let patchResponse = await patchResponsePromise;
  const dndEvents = await page.evaluate(() => (
    (window as Window & { __calendarWeekDndEvents?: CapturedDndEvent[] }).__calendarWeekDndEvents ?? []
  ));

  expect(
    dragStarted,
    [
      `The deterministic drag/drop bridge could not dispatch the week-view drop for appointment ${appointment.id}.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"),
  ).toBe(true);

  const dragStartObserved = dndEvents.some(
    (event) => event.type === "dragstart" && event.targetTestId === `week-appointment-panel-${appointment.id}`,
  );
  expect(
    dragStartObserved,
    [
      `No week-view dragstart was observed for appointment ${appointment.id}.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"),
  ).toBe(true);

  expect(
    browserConsoleMessages.some((message) => message.includes("[calendar-week] drag start")),
    [
      `The week-view drag-start log was not observed for appointment ${appointment.id}.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"),
  ).toBe(true);

  if (!patchResponse) {
    patchResponsePromise = awaitPatchResponse();

    const resourceDialog = page.getByTestId("dialog-appointment-move");
    await expect(resourceDialog).toBeVisible();
    await expect(resourceDialog).toContainText("Termin verschieben");
    await resourceDialog.getByTestId("button-appointment-move-confirm").click();

    patchResponse = await patchResponsePromise;
  }

  expect(
    patchResponse,
    [
      `Expected a PATCH response for week-view appointment ${appointment.id}, but none was observed.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"),
  ).not.toBeNull();

  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string };
    return body.startDate;
  }).toBe(targetDate);
});
