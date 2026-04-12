/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Zukunftstermin kann über den „Parken"-Button im Terminformular in die Parkplatz-Tour verschoben werden.
 * - Nach dem Parken trägt der Termin den Geparkt-Tag, hat keine Mitarbeiter mehr und liegt in der Parkplatz-Tour.
 * - Der Park-Button ist nach erfolgtem Parken nicht mehr sichtbar (Termin bereits geparkt).
 * - Der Geparkt-Tag-Badge ist auf der Wochenkalender-Terminkarte sichtbar.
 *
 * Fehlerfälle:
 * - Der Park-Button bleibt nach dem Parken sichtbar.
 * - Der Geparkt-Tag fehlt auf dem Termin nach dem Parken.
 * - Mitarbeiter sind nach dem Parken noch zugewiesen.
 * - Die Tour wurde nicht auf Parkplatz geändert.
 *
 * Ziel:
 * Den vollständigen Park-Workflow im Browser absichern: vom offenen Terminformular bis zum verifizierten Parkzustand in Kalender und API.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  RESERVED_VACANT_TAG_NAME,
} from "../../shared/appointmentCancellation";
import {
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  createAppointmentFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function readSystemTagByName(page: Page, name: string): Promise<{ id: number; name: string }> {
  const response = await page.request.get("/api/admin/master-data/tags");
  expect(response.ok()).toBeTruthy();
  const allTags = await response.json() as Array<{ id: number; name: string }>;
  const tag = allTags.find((t) => t.name === name);
  expect(tag?.id).toBeTruthy();
  return tag!;
}

async function readSystemTourByName(page: Page, name: string): Promise<{ id: number; name: string }> {
  const response = await page.request.get("/api/tours");
  expect(response.ok()).toBeTruthy();
  const allTours = await response.json() as Array<{ id: number; name: string }>;
  const tour = allTours.find((t) => t.name === name);
  expect(tour?.id).toBeTruthy();
  return tour!;
}

test("parks a future appointment via the park button and shows correct state in calendar and form", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-PARK-BROWSER-CUST");
  const employee = await createEmployeeFixture("FT06-PARK-BROWSER-EMP");
  const tour = await createTourFixture("#005599");
  const project = await createProjectFixture({
    prefix: "FT06-PARK-BROWSER",
    customerId: customer.id,
    name: "FT06 Park Browser Projekt",
  });
  const startDate = getRelativeBerlinDate(2);
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    tourId: tour.id,
    startDate,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);

  const geparktTag = await readSystemTagByName(page, RESERVED_VACANT_TAG_NAME);
  const parkplatzTour = await readSystemTourByName(page, "Parkplatz");

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible();

  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("button-park-appointment")).toBeVisible();

  const detailResponse = await page.request.get(`/api/appointments/${appointment.id}`);
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json() as { version: number };

  const parkResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes(`/api/appointments/${appointment.id}/park`)
  ));
  await page.getByTestId("button-park-appointment").click();
  await expect(page.getByTestId("dialog-park-appointment")).toBeVisible();
  await page.getByRole("button", { name: "Termin parken" }).click();
  const parkResponse = await parkResponsePromise;
  expect(parkResponse.status()).toBe(204);
  expect(parkResponse.request().postDataJSON()).toEqual({ version: detail.version });

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) return { tagNames: [] as string[], employeeIds: [] as number[], tourId: null as number | null };
    const body = await response.json();
    return {
      tagNames: Array.isArray(body.appointmentTags)
        ? body.appointmentTags.map((tag: { name: string }) => tag.name)
        : [],
      employeeIds: Array.isArray(body.employees)
        ? body.employees.map((e: { id: number }) => e.id)
        : [],
      tourId: typeof body.tourId === "number" ? body.tourId : null,
    };
  }).toEqual({
    tagNames: expect.arrayContaining([RESERVED_VACANT_TAG_NAME]),
    employeeIds: [],
    tourId: parkplatzTour.id,
  });

  await expect(page.getByTestId(`week-appointment-tags-${appointment.id}-badges-tag-${geparktTag.id}`)).toBeVisible();

  const parkedAppointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(parkedAppointmentPanel).toBeVisible();
  await parkedAppointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("button-park-appointment")).toHaveCount(0);
});
