/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter koennen ueber den Tour-Kaskaden-Dialog (Entfernen-Pfad) von einzelnen Terminen abgezogen werden.
 * - Mitarbeiter koennen ueber den Tour-Kaskaden-Dialog (Hinzufuegen-Pfad) zu einzelnen Terminen hinzugefuegt werden.
 * - Der Date-Range-Filter im Kaskaden-Dialog filtert die angezeigte Liste korrekt.
 * - Die Sammelbuttons arbeiten auf der gefilterten Ansicht und starten aus leerer Auswahl.
 * - Mitarbeiter koennen ueber den Minus-Button im Mitarbeiterformular direkt von einem Termin entfernt werden.
 *
 * Fehlerfaelle:
 * - Selektion ausserhalb des Filterbereichs geht nach Filter-Aktivierung verloren.
 * - Der Minus-Button loest einen Kaskaden-Dialog aus.
 * - Query-Invalidierung schlaegt fehl (Termin bleibt in Liste nach Entfernen).
 *
 * Ziel:
 * Die Mutationspfade fuer Termin-Mitarbeiter-Zuweisungen Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

let targetEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let sideEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let addCandidateEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let tour: Awaited<ReturnType<typeof createTourFixture>>;
let apptRemoveDialog: Awaited<ReturnType<typeof createAppointmentFixture>>;
let apptAddDialog: Awaited<ReturnType<typeof createAppointmentFixture>>;
let apptMinusButton: Awaited<ReturnType<typeof createAppointmentFixture>>;

test.beforeAll(async () => {
  await resetBrowserSuiteState();

  tour = await createTourFixture("#226688");
  targetEmployee = await createEmployeeFixture("APMT-TARGET");
  sideEmployee = await createEmployeeFixture("APMT-SIDE");
  addCandidateEmployee = await createEmployeeFixture("APMT-ADD");

  const project = await createProjectFixture({ prefix: "APMT", name: "APMT Projekt" });

  apptRemoveDialog = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  apptAddDialog = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  apptMinusButton = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(3),
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });
});

test("Test 1: Entfernen ueber Kaskaden-Dialog mit Date-Range-Filter-Verifikation", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await page.getByTestId(`badge-tour-member-${targetEmployee.id}-remove`).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("abziehen");

  const filterDateFrom = dialog.getByTestId("input-tour-cascade-date-from");
  const filterDateTo = dialog.getByTestId("input-tour-cascade-date-to");
  await filterDateFrom.fill(getRelativeBerlinDate(1));
  await filterDateTo.fill(getRelativeBerlinDate(1));

  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptRemoveDialog.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton.id}`)).toHaveCount(0);
  await dialog.getByTestId("button-tour-cascade-deselect-all").click();
  await dialog.getByTestId("button-tour-cascade-select-all").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptRemoveDialog.id}`)).toBeChecked();

  await expect(dialog.getByTestId("button-tour-cascade-date-filter-reset")).toBeVisible();
  await dialog.getByTestId("button-tour-cascade-date-filter-reset").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptMinusButton.id}`)).not.toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptAddDialog.id}`)).not.toBeChecked();

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptRemoveDialog.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).not.toContain(targetEmployee.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(targetEmployee.id);

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible();
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton.id}`)).toBeVisible();

  await page.getByTestId("button-close-employee").click();
  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible();
});

test("Test 2: Hinzufuegen ueber Kaskaden-Dialog mit Date-Range-Filter-Verifikation", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  await page.getByTestId("button-add-tour-member").click();
  await page.getByTestId(`employee-picker-card-${addCandidateEmployee.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("hinzuf");
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptRemoveDialog.id}`)).not.toBeChecked();

  const filterDateTo = dialog.getByTestId("input-tour-cascade-date-to");
  await filterDateTo.fill(getRelativeBerlinDate(2));
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptAddDialog.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton.id}`)).toHaveCount(0);
  await dialog.getByTestId("button-tour-cascade-deselect-all").click();
  await dialog.getByTestId("button-tour-cascade-select-all").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptRemoveDialog.id}`)).toBeChecked();

  await dialog.getByTestId("button-tour-cascade-date-filter-reset").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${apptMinusButton.id}`)).not.toBeChecked();
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptRemoveDialog.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(addCandidateEmployee.id);

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${addCandidateEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  await expect(
    page.getByTestId("table-appointments-list").getByTestId(`button-remove-employee-from-appointment-${apptRemoveDialog.id}`),
  ).toBeVisible();
});

test("Test 3: Entfernen ueber Minus-Button im Mitarbeiterformular", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible();

  const removeButton = table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton.id}`);
  await expect(removeButton).toBeVisible();
  const removeDetailResponse = await page.request.get(`/api/appointments/${apptMinusButton.id}`);
  expect(removeDetailResponse.ok()).toBeTruthy();
  const removeDetail = await removeDetailResponse.json() as { version: number };
  const removeResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "DELETE"
    && response.url().includes(`/api/appointments/${apptMinusButton.id}/employees/${targetEmployee.id}`)
  ));
  await removeButton.click();
  const removeResponse = await removeResponsePromise;
  expect(removeResponse.status()).toBe(204);
  expect(removeResponse.request().postDataJSON()).toEqual({ version: removeDetail.version });

  await expect(page.getByText("Mitarbeiter wurde vom Termin entfernt", { exact: true })).toBeVisible();
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton.id}`)).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).not.toContain(targetEmployee.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(sideEmployee.id);

  await page.getByTestId("button-close-employee").click();
  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible();
});
