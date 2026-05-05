/**
 * Test Scope:
 *
 * Bereich:
 * - Sichtbare Kalender-Fehlermeldungen beim Drag-and-drop
 *
 * Abgedeckte Regeln:
 * - Drag & Drop in der Monatsübersicht zeigt die konkrete VALIDATION_ERROR-Message des Servers.
 * - Der Fehler erscheint fuer ein reales Verschieben auf heute mit vergangener Startzeit als sichtbarer Toast.
 *
 * Fehlerfaelle:
 * - Die UI zeigt nur noch einen generischen Reload-Hinweis.
 * - Der Serverfehler geht beim echten Drag-&-Drop-Flow zwischen Request und Toast verloren.
 *
 * Ziel:
 * Das Durchreichen der konkreten Drag-&-Drop-Validierungsmessage im Browser Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { closeDispatcherLoginConflictsDialog, loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";

type CapturedDndEvent = {
  type: string;
  targetTestId: string | null;
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("shows the concrete server validation message after dragging an appointment onto today", async ({ page }) => {
  const browserConsoleMessages: string[] = [];
  page.on("console", (message) => {
    browserConsoleMessages.push(message.text());
  });

  const project = await createProjectFixture({ prefix: "FT01-BROWSER-DRAGDROP" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    startTime: "00:00:00",
  });
  const today = getRelativeBerlinDate(0);

  await loginAsRole(page, "DISPATCHER");
  await closeDispatcherLoginConflictsDialog(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  await expect(appointmentBar).toBeVisible();

  const todayCalendarDay = page.getByTestId(`month-sheet-day-${today}`).first();
  await expect(todayCalendarDay).toBeVisible();
  await page.evaluate(() => {
    const eventNames = ["dragstart", "dragenter", "dragover", "drop", "dragend"];
    (window as Window & { __calendarDndEvents?: CapturedDndEvent[] }).__calendarDndEvents = [];

    const recordEvent = (event: Event) => {
      const targetTestId = event.target instanceof Element
        ? event.target.closest("[data-testid]")?.getAttribute("data-testid") ?? null
        : null;

      (window as Window & { __calendarDndEvents?: CapturedDndEvent[] }).__calendarDndEvents?.push({
        type: event.type,
        targetTestId,
      });
    };

    for (const eventName of eventNames) {
      document.addEventListener(eventName, recordEvent, true);
    }
  });

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  await appointmentBar.dragTo(todayCalendarDay);

  const patchResponse = await patchResponsePromise.catch(() => null);
  const dndEvents = await page.evaluate(() => (
    (window as Window & { __calendarDndEvents?: CapturedDndEvent[] }).__calendarDndEvents ?? []
  ));

  const dragStartObserved = dndEvents.some(
    (event) => event.type === "dragstart" && event.targetTestId === `appointment-bar-${appointment.id}`,
  );
  if (!dragStartObserved) {
    throw new Error([
      `No dragstart was observed for appointment ${appointment.id}.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"));
  }

  const monthDragStartLogged = browserConsoleMessages.some(
    (message) => message.includes("[calendar-month-sheet] drag start"),
  );
  if (!monthDragStartLogged) {
    throw new Error([
      `The calendar month drag-start log was not observed for appointment ${appointment.id}.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"));
  }

  expect(
    patchResponse,
    [
      `Expected a PATCH response for appointment ${appointment.id}, but none was observed.`,
      `Captured DnD events: ${JSON.stringify(dndEvents)}`,
      `Captured console: ${JSON.stringify(browserConsoleMessages)}`,
    ].join("\n"),
  ).not.toBeNull();

  const responseBodyText = await patchResponse.text();
  const responseBody = JSON.parse(responseBodyText) as { code?: string; message?: string };

  expect(patchResponse.status()).toBe(409);
  expect(responseBody.code).toBe("VALIDATION_ERROR");
  expect(responseBody.message).toBe("Startzeit liegt in der Vergangenheit");

  await expect(appointmentBar).toBeVisible();

  await expect(page.getByText("Fehler beim Verschieben", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Startzeit liegt in der Vergangenheit", { exact: true }).first()).toBeVisible();
});
