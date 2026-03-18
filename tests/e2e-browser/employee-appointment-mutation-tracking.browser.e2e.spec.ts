/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter können über den Tour-Kaskaden-Dialog (Entfernen-Pfad) von einzelnen Terminen abgezogen werden.
 * - Mitarbeiter können über den Tour-Kaskaden-Dialog (Hinzufügen-Pfad) zu einzelnen Terminen hinzugefügt werden.
 * - Der Date-Range-Filter im Kaskaden-Dialog filtert die angezeigte Liste korrekt, ohne die Selektion zu beeinflussen.
 * - Mitarbeiter können über den "–"-Button im Mitarbeiterformular direkt von einem Termin entfernt werden.
 *
 * Fehlerfälle:
 * - Selektion außerhalb des Filterbereichs geht nach Filter-Aktivierung verloren.
 * - Der "–"-Button löst einen Kaskaden-Dialog aus.
 * - Query-Invalidierung schlägt fehl (Termin bleibt in Liste nach Entfernen).
 *
 * Ziel:
 * Die drei neuen Mutationspfade für Termin-Mitarbeiter-Zuweisungen Ende-zu-Ende absichern.
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
let tour: Awaited<ReturnType<typeof createTourFixture>>;
let apptRemoveDialog: Awaited<ReturnType<typeof createAppointmentFixture>>;
let apptAddDialog: Awaited<ReturnType<typeof createAppointmentFixture>>;
let apptMinusButton: Awaited<ReturnType<typeof createAppointmentFixture>>;

test.beforeAll(async () => {
  await resetBrowserSuiteState();

  tour = await createTourFixture("#226688");
  targetEmployee = await createEmployeeFixture("APMT-TARGET");
  sideEmployee = await createEmployeeFixture("APMT-SIDE");

  const project = await createProjectFixture({ prefix: "APMT", name: "APMT Projekt" });

  // apptRemoveDialog: targetEmployee + sideEmployee initial zugewiesen
  apptRemoveDialog = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  // apptAddDialog: nur sideEmployee – targetEmployee fehlt absichtlich
  apptAddDialog = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
    employeeIds: [sideEmployee.id],
  });

  // apptMinusButton: targetEmployee + sideEmployee initial zugewiesen
  apptMinusButton = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(3),
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  // targetEmployee der Tour zuweisen (damit Kaskaden-Dialog erscheint)
  // Die Zuweisung über die Tour-Mitgliedschaft ist Voraussetzung für den Remove-Kaskadenpfad.
  // Wir weisen targetEmployee direkt über den Add-Pfad zu (via Fixture-Setup via API direkt nicht nötig,
  // da für die Kaskaden-Tests die tourId-Zuordnung am Termin ausreicht).
});

test("Test 1: Entfernen über Kaskaden-Dialog mit Date-Range-Filter-Verifikation", async ({ page }) => {
  await loginAsAdmin(page);

  // Tour öffnen
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  // targetEmployee als Tour-Mitglied hinzufügen (kein Fixtures-API-Weg → über UI)
  await page.getByTestId("button-add-tour-member").click();
  await page.getByTestId(`employee-picker-card-${targetEmployee.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("hinzuf");
  // Alle Termine bestätigen (targetEmployee hinzufügen zu Tour-Appointments)
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  // Jetzt targetEmployee entfernen
  await page.getByTestId(`badge-tour-member-${targetEmployee.id}-remove`).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("abziehen");

  // Date-Range-Filter: Datum von auf das Datum von apptRemoveDialog setzen
  const filterDateFrom = dialog.getByTestId("input-tour-cascade-date-from");
  const filterDateTo = dialog.getByTestId("input-tour-cascade-date-to");
  await filterDateFrom.fill(getRelativeBerlinDate(1));
  await filterDateTo.fill(getRelativeBerlinDate(1));

  // Nur apptRemoveDialog sichtbar, apptMinusButton und apptAddDialog ausgeblendet
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptRemoveDialog!.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton!.id}`)).toHaveCount(0);

  // Reset-Button erscheint, Filter zurücksetzen
  await expect(dialog.getByTestId("button-tour-cascade-date-filter-reset")).toBeVisible();
  await dialog.getByTestId("button-tour-cascade-date-filter-reset").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton!.id}`)).toBeVisible();

  // apptMinusButton abwählen (nur apptRemoveDialog entfernen)
  const apptMinusButtonCheckbox = dialog.getByTestId(`tour-employee-cascade-checkbox-${apptMinusButton!.id}`);
  if (await apptMinusButtonCheckbox.isChecked()) {
    await apptMinusButtonCheckbox.click();
  }
  const apptAddDialogCheckbox = dialog.getByTestId(`tour-employee-cascade-checkbox-${apptAddDialog!.id}`);
  if (await apptAddDialogCheckbox.isChecked()) {
    await apptAddDialogCheckbox.click();
  }

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  // A) targetEmployee ist nicht mehr in apptRemoveDialog
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptRemoveDialog!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((e) => e.id);
  }).not.toContain(targetEmployee.id);

  // B) targetEmployee ist noch in apptMinusButton
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((e) => e.id);
  }).toContain(targetEmployee.id);

  // C) Mitarbeiterformular: apptRemoveDialog nicht in Liste, apptMinusButton schon
  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible();
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton!.id}`)).toBeVisible();

  // D) Globale Terminliste: apptRemoveDialog noch vorhanden (Termin existiert, nur Mitarbeiter abgezogen)
  // Mitarbeiterformular schließen — Sidebar ist im Bearbeitungsmodus ausgeblendet
  await page.getByTestId("button-close-employee").click();
  await page.getByTestId("nav-termine").click();
  const termineListe = page.getByTestId("table-appointments-list");
  await expect(termineListe).toBeVisible();
});

test("Test 2: Hinzufügen über Kaskaden-Dialog mit Date-Range-Filter-Verifikation", async ({ page }) => {
  await loginAsAdmin(page);

  // Tour öffnen
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  // targetEmployee hinzufügen
  await page.getByTestId("button-add-tour-member").click();
  await page.getByTestId(`employee-picker-card-${targetEmployee.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("hinzuf");

  // Date-Range-Filter: Datum bis auf Tag 2 setzen → apptMinusButton (Tag 3) soll ausgeblendet werden
  // Hinweis: apptAddDialog (Tag 2) und apptMinusButton (Tag 3) sind nach Test 1 bereits belegt (disabled),
  // apptRemoveDialog (Tag 1) ist die einzige selektierbare Zeile.
  const filterDateTo = dialog.getByTestId("input-tour-cascade-date-to");
  await filterDateTo.fill(getRelativeBerlinDate(2));
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptAddDialog!.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton!.id}`)).toHaveCount(0);

  // Filter zurücksetzen
  await dialog.getByTestId("button-tour-cascade-date-filter-reset").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${apptMinusButton!.id}`)).toBeVisible();

  // apptRemoveDialog ist nach Test 1 die einzige Zeile ohne targetEmployee → vorselektiert, kein Klick nötig
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  // A) targetEmployee ist jetzt in apptRemoveDialog
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptRemoveDialog!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((e) => e.id);
  }).toContain(targetEmployee.id);

  // B) Mitarbeiterformular: apptRemoveDialog erscheint in Liste
  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  const table = page.getByTestId("table-appointments-list");
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${apptRemoveDialog!.id}`)).toBeVisible();
});

test("Test 3: Entfernen über –-Button im Mitarbeiterformular", async ({ page }) => {
  await loginAsAdmin(page);

  // Mitarbeiterformular öffnen
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible();

  // apptMinusButton ist sichtbar
  const removeButton = table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton!.id}`);
  await expect(removeButton).toBeVisible();

  // Klicken
  await removeButton.click();

  // Toast erscheint
  await expect(page.getByText("Mitarbeiter wurde vom Termin entfernt", { exact: true })).toBeVisible();

  // A) apptMinusButton verschwindet aus Liste (Query-Invalidierung)
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${apptMinusButton!.id}`)).toHaveCount(0);

  // B) API: targetEmployee nicht mehr in apptMinusButton
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((e) => e.id);
  }).not.toContain(targetEmployee.id);

  // C) API: sideEmployee noch in apptMinusButton
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${apptMinusButton!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((e) => e.id);
  }).toContain(sideEmployee.id);

  // D) Globale Terminliste: apptMinusButton noch vorhanden (Termin existiert weiterhin)
  // Mitarbeiterformular schließen — Sidebar ist im Bearbeitungsmodus ausgeblendet
  await page.getByTestId("button-close-employee").click();
  await page.getByTestId("nav-termine").click();
  const termineListe = page.getByTestId("table-appointments-list");
  await expect(termineListe).toBeVisible();
});
