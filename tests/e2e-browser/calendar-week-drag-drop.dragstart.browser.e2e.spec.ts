/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Wochenansicht verarbeitet fuer regulaere Termine einen Drag-Start und schreibt die appointmentId in dataTransfer.
 *
 * Fehlerfaelle:
 * - Der Week-View-DnD-Pfad reagiert selbst auf einen direkten Drag-Start-Event nicht.
 * - Die appointmentId wird beim Drag-Start nicht transportiert.
 *
 * Ziel:
 * Den isolierten Drag-Start-Pfad der Wochenansicht im Browser ohne kompletten Drop-Flow absichern.
 */
import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

type WeekDragStartCapture = {
  capturedValue: string | null;
  eventObserved: boolean;
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("records a dragstart with the appointment id for a regular week-view appointment", async ({ page }) => {
  const browserConsoleMessages: string[] = [];
  page.on("console", (message) => {
    browserConsoleMessages.push(message.text());
  });

  const project = await createProjectFixture({ prefix: "FT01-BROWSER-WEEK-DRAGSTART" });
  const tour = await createTourFixture("#0f766e");
  const sourceDate = getRelativeBerlinDate(2);

  await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    endDate: getRelativeBerlinDate(4),
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

  const result = await page.evaluate((appointmentId) => {
    const element = document.querySelector(`[data-testid="week-appointment-panel-${appointmentId}"]`);
    if (!(element instanceof HTMLElement)) {
      return { capturedValue: null, eventObserved: false };
    }

    let capturedValue: string | null = null;
    let eventObserved = false;

    const dataTransfer = new DataTransfer();
    const originalSetData = dataTransfer.setData.bind(dataTransfer);
    dataTransfer.setData = (format: string, data: string) => {
      if (format === "text/plain") {
        capturedValue = data;
      }
      originalSetData(format, data);
    };

    const handleDragStart = () => {
      eventObserved = true;
    };

    element.addEventListener("dragstart", handleDragStart, { once: true });
    element.dispatchEvent(new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    return { capturedValue, eventObserved };
  }, appointment.id) as WeekDragStartCapture;

  expect(result.eventObserved).toBe(true);
  expect(result.capturedValue).toBe(String(appointment.id));
  expect(
    browserConsoleMessages.some((message) => message.includes("[calendar-week] drag start")),
  ).toBe(true);
});
