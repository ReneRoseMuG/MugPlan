/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Projekttermin kann im Browser aus Kunde, Projekt mit Betrag und Mitarbeiter als regulaerer Zukunftstermin angelegt werden.
 * - Der Einweg-Storno laesst sich ueber das Terminformular ausloesen und markiert den Termin sichtbar als storniert.
 * - Der Wochenkalender zeigt den stornierten Termin nach dem Bestätigen des Stornos ohne manuelles Formularschließen weiterhin sichtbar, aber mit Storniert-Tag.
 * - Planung blockierte Termine bleiben im Wochenkalender sichtbar, sind aber im Formular nur noch als Schließansicht oeffbar.
 * - Der Projektbetrag wird nach dem Storno im Projektformular auf 0.00 gesetzt.
 * - Die Vorlaufliste zeigt den stornierten Termin weiterhin mit Betrag 0 und sichtbarer Storno-Kennzeichnung.
 * - Der Produktionsplanung soll stornierte Projekte ausfiltern; dieser Soll-Test beschreibt die aktuelle Luecke bewusst rot.
 * - Ein offener Storno-Dialog lässt sich abbrechen; der Termin bleibt aktiv (nicht storniert), Mitarbeiter bleiben erhalten.
 *
 * Fehlerfaelle:
 * - Der Termin verschwindet vor dem Storno oder traegt bereits vorher den Storniert-Tag.
 * - Der Storno bleibt im offenen Formular hängen und propagiert nicht direkt in Kalender, Projektbetrag oder Reports.
 * - Planung blockierte Termine bleiben im Browser trotz Server-Guard editierbar.
 * - Die Vorlaufliste zeigt nach dem Storno weiterhin den alten Betrag.
 * - Der Produktionsplanung listet das stornierte Projekt trotz Soll-Regel weiterhin in Mengenlisten.
 * - Abbrechen im Storno-Dialog storniert den Termin dennoch.
 *
 * - Der Geparkt-Tag erscheint nicht im Termin-Tag-Picker (isPickerVisibleForDomain schließt ihn aus).
 *
 * Ziel:
 * Den kompletten fachlichen Storno-Flow sowie die Read-only-Oberflaeche fuer Planung blockiert aus Anwendersicht ueber Kalender, Formular, Projekt und Reports absichern.
 * Ergaenzend: Picker-Schutz fuer die reservierten Termin-System-Tags browser-seitig absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { RESERVED_VACANT_TAG_NAME } from "../../shared/appointmentCancellation";

import {
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openProjects(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();
}

async function closeProjectForm(page: Page) {
  await page.getByTestId("button-close-project").click();
  const discardButton = page.getByRole("button", { name: "Verwerfen und schließen" });
  if (await discardButton.isVisible().catch(() => false)) {
    await discardButton.click();
  }
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);
}

async function openReports(page: Page) {
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

async function fillReportDateRange(page: Page, prefix: string, fromDate: string, toDate = fromDate) {
  const dateToggle = page.getByTestId(`toggle-${prefix}-date`);
  await expect(dateToggle).toBeVisible();
  if ((await dateToggle.getAttribute("data-state")) !== "on") {
    await dateToggle.click();
  }
  await page.getByTestId(`${prefix}-from-date`).fill(fromDate);
  await page.getByTestId(`${prefix}-to-date`).fill(toDate);
}

async function openNewAppointmentFromProjectContext(page: Page) {
  await page.getByTestId("button-new-appointment-from-project").click();
  await expect(page.getByTestId("button-calendar-context-back")).toBeVisible();
  const button = page.locator('[data-testid^="button-new-appointment-week-"]').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openCustomerPickerAndSelect(page: Page, customerNumber: string) {
  await page.getByTestId("button-select-customer").click();
  await expect(page.getByTestId("table-customers")).toBeVisible();
  await page.locator("#customer-filter-last-name").fill(customerNumber.slice(-12));
  await page.getByTestId("table-customers").locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

async function selectEmployeeForAppointment(page: Page, employeeId: number) {
  await page.getByTestId("button-add-employee").click();
  await expect(page.getByTestId("list-employee-picker")).toBeVisible();
  await page.getByTestId(`employee-picker-card-${employeeId}`).dblclick();
  await expect(page.getByTestId(`badge-employee-${employeeId}`)).toBeVisible();
}

async function openProjectById(
  page: Page,
  project: { id: number; name: string; orderNumber?: string | null },
  scope: "all" | "noAppointments" = "all",
) {
  await openProjects(page);
  if (scope === "noAppointments") {
    await page.getByTestId("toggle-project-scope-no-appointments").click();
  } else {
    await page.getByTestId("toggle-project-scope-all").click();
  }

  if (project.orderNumber) {
    await page.locator("#project-filter-order-number").fill(project.orderNumber);
  }
  await page.locator("#project-filter-title").fill(project.name);

  const tableRow = page.getByTestId("table-projects").locator("tbody tr")
    .filter({ hasText: project.name })
    .filter({ hasText: project.orderNumber ?? "" })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    await tableRow.dblclick();
  } else {
    const boardCard = page.getByTestId(`project-card-${project.id}`).first();
    await expect(boardCard).toBeVisible();
    await boardCard.dblclick();
  }

  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

test("runs the browser cancellation flow from regular future appointment to cancelled report state", async ({ page }) => {
  const customer = await createCustomerFixture("FT28-CANCEL-BROWSER-CUST");
  const employee = await createEmployeeFixture("FT28-CANCEL-BROWSER-EMP");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT28 Browser Cancel Sauna",
  });
  const component = await createComponentFixture({
    categoryName: "Fenster",
    name: "FT28 Browser Cancel Fenster",
  });
  const appointmentDate = getRelativeBerlinDate(1);
  const projectName = "FT28 Browser Storno Projekt";
  const projectOrderNumber = "FT28-CANCEL-001";
  const initialAmount = "14999.90";

  await openProjects(page);
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
  await page.getByTestId("input-project-name").fill(projectName);
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill(projectOrderNumber);
  await page.getByTestId("input-project-amount").fill(initialAmount);

  const createProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes("/api/projects")
    && !response.url().includes("/order-items")
  ));
  await page.getByTestId("button-save-project").click();
  const createProjectResponse = await createProjectResponsePromise;
  expect(createProjectResponse.ok()).toBeTruthy();
  const createdProject = await createProjectResponse.json() as {
    id: number;
    orderNumber?: string | null;
    projectOrder?: { orderNumber?: string | null } | null;
  };
  const projectId = Number(createdProject.id);
  expect(projectId).toBeGreaterThan(0);
  const persistedOrderNumber = createdProject.projectOrder?.orderNumber ?? createdProject.orderNumber ?? projectOrderNumber;

  await createProjectOrderItemFixture({
    projectId,
    orderNumber: persistedOrderNumber,
    productId: product.id,
    quantity: 1,
  });
  await createProjectOrderItemFixture({
    projectId,
    orderNumber: persistedOrderNumber,
    componentId: component.id,
    quantity: 2,
  });

  await openProjectById(page, {
    id: projectId,
    name: projectName,
    orderNumber: persistedOrderNumber,
  }, "noAppointments");
  await openNewAppointmentFromProjectContext(page);
  await page.getByTestId("input-start-date").fill(appointmentDate);
  await expect(page.getByTestId("badge-project")).toContainText(projectName);
  await selectEmployeeForAppointment(page, employee.id);

  const createAppointmentResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes("/api/appointments")
    && !response.url().includes("/cancel")
  ));
  await page.getByTestId("button-save-appointment").click();
  const createAppointmentResponse = await createAppointmentResponsePromise;
  expect(createAppointmentResponse.ok()).toBeTruthy();
  const createdAppointment = await createAppointmentResponse.json() as { id: number };
  const appointmentId = Number(createdAppointment.id);
  expect(appointmentId).toBeGreaterThan(0);

  const regularAppointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(regularAppointmentPanel).toBeVisible();
  await expect(regularAppointmentPanel).toContainText(projectName);
  await expect(regularAppointmentPanel.getByText("Storniert", { exact: true })).toHaveCount(0);

  await regularAppointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${employee.id}`)).toBeVisible();
  const openCancelWorkflowButton = page.getByTestId("button-cancel-appointment");
  await expect(openCancelWorkflowButton).toBeVisible();
  await openCancelWorkflowButton.click();
  await expect(page.getByRole("button", { name: "Termin stornieren" })).toBeVisible();

  const cancelDetailResponse = await page.request.get(`/api/appointments/${appointmentId}`);
  expect(cancelDetailResponse.ok()).toBeTruthy();
  const cancelDetail = await cancelDetailResponse.json() as { version: number };

  const cancelResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes(`/api/appointments/${appointmentId}/cancel`)
  ));
  await page.getByRole("button", { name: "Termin stornieren" }).click();
  const cancelResponse = await cancelResponsePromise;
  expect(cancelResponse.status()).toBe(204);
  expect(cancelResponse.request().postDataJSON()).toEqual({ version: cancelDetail.version });

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointmentId}`);
    if (!response.ok()) {
      return { isCancelled: false, tagNames: [] as string[], employeeIds: [] as number[] };
    }
    const body = await response.json();
    return {
      isCancelled: body.isCancelled === true,
      tagNames: Array.isArray(body.appointmentTags)
        ? body.appointmentTags.map((tag: { name: string }) => tag.name)
        : [],
      employeeIds: Array.isArray(body.employees)
        ? body.employees.map((entry: { id: number }) => entry.id)
        : [],
    };
  }).toEqual({
    isCancelled: true,
    tagNames: expect.arrayContaining(["Storniert"]),
    employeeIds: [],
  });
  await expect(page.getByRole("button", { name: "Termin stornieren" })).toHaveCount(0);
  await expect(page.getByTestId("button-close-appointment")).toHaveCount(0);
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  const cancelledAppointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(cancelledAppointmentPanel).toBeVisible();
  await expect(cancelledAppointmentPanel).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId(`week-appointment-tags-${appointmentId}`)).toContainText("Sto");
  await expect(cancelledAppointmentPanel).toContainText(projectName);

  await page.getByTestId("button-calendar-context-back").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
  await closeProjectForm(page);

  await openProjectById(page, {
    id: projectId,
    name: projectName,
    orderNumber: persistedOrderNumber,
  });
  await expect(page.getByTestId("input-project-order-number")).toHaveValue(persistedOrderNumber);
  await expect(page.getByTestId("input-project-amount")).toHaveValue("0.00");
  await closeProjectForm(page);

  await openReports(page);
  await fillReportDateRange(page, "reports-vorlaufliste", appointmentDate);
  await page.getByTestId("button-reports-vorlaufliste-generate").click();

  const vorlauflisteTable = page.getByTestId("table-reports-vorlaufliste");
  await expect(vorlauflisteTable).toBeVisible();
  await expect(vorlauflisteTable).toContainText(customer.fullName ?? "");
  await expect(
    vorlauflisteTable.getByRole("row").filter({ hasText: customer.fullName ?? "" }).first(),
  ).toHaveAttribute("aria-label", "Storniert");
  await expect(vorlauflisteTable).toContainText("0,00");

  await page.getByTestId("button-reports-back").click();
  await fillReportDateRange(page, "reports-produktionsplanung", appointmentDate);
  await page.getByTestId("button-reports-produktionsplanung-generate").click();

  await expect(page.getByTestId("reports-produktionsplanung-overlay")).toBeVisible();
  await expect(page.getByTestId("reports-produktionsplanung-categories")).toContainText("Keine passenden Kategorien im gewählten Zeitraum gefunden.");
  await expect(page.getByTestId("reports-produktionsplanung-overlay")).not.toContainText("FT28 Browser Cancel Sauna");
  await expect(page.getByTestId("reports-produktionsplanung-overlay")).not.toContainText("FT28 Browser Cancel Fenster");
});


test("Geparkt-Tag erscheint nicht im Termin-Tag-Picker", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-PICKER-GUARD-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-PICKER-GUARD",
    customerId: customer.id,
    name: "FT06 Picker Guard Projekt",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
  });

  await loginAsAdmin(page);

  const tagsResponse = await page.request.get("/api/admin/master-data/tags");
  expect(tagsResponse.ok()).toBeTruthy();
  const allTags = await tagsResponse.json() as Array<{ id: number; name: string }>;
  const geparktTag = allTags.find((t) => t.name === RESERVED_VACANT_TAG_NAME);
  expect(geparktTag?.id).toBeTruthy();

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  await page.getByTestId("appointment-tag-picker-button-add").click();
  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toBeVisible();

  await expect(page.getByTestId(`appointment-tag-picker-add-tag-${geparktTag!.id}`)).toHaveCount(0);
});

test("Storno-Dialog Abbrechen – Termin bleibt aktiv und wird nicht storniert", async ({ page }) => {
  const customer = await createCustomerFixture("FT28-CANCEL-ABORT-CUST");
  const employee = await createEmployeeFixture("FT28-CANCEL-ABORT-EMP");
  const tour = await createTourFixture("#3311aa");
  const project = await createProjectFixture({
    prefix: "FT28-CANCEL-ABORT",
    customerId: customer.id,
    name: "FT28 Storno-Abbruch Projekt",
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

  const panel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(panel).toBeVisible();
  await panel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  // Storno-Dialog öffnen
  await page.getByTestId("button-cancel-appointment").click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("button", { name: "Termin stornieren" })).toBeVisible();

  // Abbrechen: Storno wird nicht ausgeführt
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByRole("button", { name: "Termin stornieren" })).toHaveCount(0);

  // Termin ist NICHT storniert, Mitarbeiter erhalten
  const response = await page.request.get(`/api/appointments/${appointment.id}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as {
    isCancelled: boolean;
    appointmentTags: Array<{ name: string }>;
    employees: Array<{ id: number }>;
  };
  expect(body.isCancelled).toBe(false);
  expect(body.appointmentTags.map((tag) => tag.name)).not.toContain("Storniert");
  expect(body.employees.map((entry) => entry.id)).toEqual([employee.id]);

  // Formular bleibt bearbeitbar, Storno erneut auslösbar
  await expect(page.getByTestId("button-cancel-appointment")).toBeVisible();
});
