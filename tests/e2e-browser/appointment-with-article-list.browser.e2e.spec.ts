/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Termin mit Projekt und gefuellter Artikelliste zeigt die Projekt-Artikelliste auf der Wochenkarte und in der Hover-Preview.
 * - Die Kalender-Aggregation liefert fuer denselben Termin strukturierte `projectArticleItems` mit Saunamodell und Ofen.
 * - Wird einem bestehenden Direkttermin im Formular ein Projekt mit Artikelliste zugewiesen, aktualisieren sich Wochenkarte und Kalender-Aggregation nach dem Speichern.
 *
 * Fehlerfaelle:
 * - Wochenkarte verliert Projektkopf oder Artikellisteninhalt trotz vorhandener Projekt-Artikelliste.
 * - Hover-Preview zeigt nicht die vollstaendige Artikelliste.
 * - Nach Projektzuweisung im Formular bleiben Wochenkarte oder `/api/calendar/appointments` stale.
 *
 * Ziel:
 * Den Browser-E2E-Pfad fuer FT01/FT27 vom Termin ueber die Projekt-Artikelliste bis zur Wochenkarten- und Kalender-API-Darstellung absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

const berlinDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type AppointmentCreateInput = {
  projectId?: number | null;
  customerId?: number;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  employeeIds?: number[];
  tourId?: number | null;
};

type CalendarAppointmentApiRow = {
  id: number;
  projectId: number | null;
  projectArticleItems: Array<{ label: string; value: string }>;
};

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return berlinDateFormatter.format(date);
}

function getNextWeekTuesdayDate(): string {
  const today = getRelativeBerlinDate(0);
  const [year, month, day] = today.split("-").map((value) => Number(value));
  const currentDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const mondayIndex = (currentDate.getUTCDay() + 6) % 7;
  const daysUntilNextTuesday = (7 - mondayIndex) + 1;
  return addDaysToDateOnly(today, daysUntilNextTuesday);
}

async function createAppointmentViaApi(page: Page, input: AppointmentCreateInput) {
  const response = await page.request.post("/api/appointments", {
    data: {
      projectId: input.projectId ?? null,
      customerId: input.customerId,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      startTime: input.startTime ?? null,
      employeeIds: input.employeeIds ?? [],
      tourId: input.tourId ?? null,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{ id: number; projectId: number | null; customerId: number }>;
}

async function fetchCalendarAppointment(page: Page, appointmentId: number, date: string): Promise<CalendarAppointmentApiRow> {
  const response = await page.request.get(
    `/api/calendar/appointments?fromDate=${date}&toDate=${date}&detail=full`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  const appointments = await response.json() as CalendarAppointmentApiRow[];
  const appointment = appointments.find((item) => item.id === appointmentId);
  expect(appointment, `Kalendertermin ${appointmentId} wurde fuer ${date} nicht gefunden`).toBeDefined();
  return appointment!;
}

async function openWeekAppointment(page: Page, appointmentId: number) {
  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`).first();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function assignProjectWithoutAppointments(page: Page, project: { id: number; name: string; orderNumber?: string | null }, customer: { customerNumber: string }) {
  await page.getByTestId("button-select-project").click();
  const table = page.getByTestId("table-projects");
  await expect(table).toBeVisible();
  await page.getByLabel("Ohne Termine").click();
  await page.locator("#project-filter-order-number").fill(project.orderNumber ?? "");
  await page.locator("#project-filter-title").fill(project.name);
  const row = table.locator("tbody tr")
    .filter({ hasText: project.orderNumber ?? "" })
    .filter({ hasText: project.name })
    .filter({ hasText: customer.customerNumber })
    .first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(page.getByTestId("badge-project-name")).toContainText(project.name);
}

async function confirmSaveIfNeeded(page: Page) {
  const confirmButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }
}

async function expectWeekCardAndPreview(page: Page, params: {
  appointmentId: number;
  projectName: string;
  orderNumber: string;
  productName: string;
  componentName: string;
}) {
  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${params.appointmentId}`).first();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });

  await expect(appointmentPanel.getByTestId("week-project-header")).toContainText(params.orderNumber);
  await expect(appointmentPanel.getByTestId("week-project-header")).toContainText(params.projectName);
  await expect(appointmentPanel.getByTestId("week-project-hover-trigger-renderer-articles")).toContainText(params.productName);

  await appointmentPanel.getByTestId("week-project-description-hover-trigger").hover();
  const hoverArticleList = page.getByTestId("week-project-hover-renderer-articles-list");
  await expect(hoverArticleList).toBeVisible({ timeout: 5_000 });
  await expect(hoverArticleList).toContainText(`Saunamodell: ${params.productName}`);
  await expect(hoverArticleList).toContainText(`Ofen: ${params.componentName}`);
}

async function expectCalendarArticleItems(page: Page, params: {
  appointmentId: number;
  projectId: number;
  date: string;
  productName: string;
  componentName: string;
}) {
  const appointment = await fetchCalendarAppointment(page, params.appointmentId, params.date);
  expect(appointment.projectId).toBe(params.projectId);
  expect(appointment.projectArticleItems).toEqual(expect.arrayContaining([
    { label: "Saunamodell", value: params.productName },
    { label: "Ofen", value: params.componentName },
  ]));
  expect(appointment.projectArticleItems.length).toBeGreaterThanOrEqual(2);
}

test("shows project article items on a week card when the appointment is created via API with a project", async ({ page }) => {
  const appointmentDate = getNextWeekTuesdayDate();
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT01 FT27 Browser Produkt",
    description: "Produkt fuer Termin mit Artikelliste.",
  });
  const component = await createComponentFixture({
    categoryName: "\u00d6fen",
    name: "FT01 FT27 Browser Ofen",
    description: "Komponente fuer Termin mit Artikelliste.",
  });
  const project = await createProjectFixture({
    prefix: "FT01-FT27-API",
    name: "FT01 FT27 Terminprojekt API",
  });
  const orderNumber = project.projectOrder?.orderNumber ?? project.orderNumber ?? "";

  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: product.id,
    quantity: 1,
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    componentId: component.id,
    quantity: 1,
  });

  await loginAsAdmin(page);
  const createdAppointment = await createAppointmentViaApi(page, {
    projectId: project.id,
    startDate: appointmentDate,
    endDate: null,
    startTime: null,
    employeeIds: [],
  });

  await page.getByTestId("button-next").click();

  await expectWeekCardAndPreview(page, {
    appointmentId: createdAppointment.id,
    projectName: project.name,
    orderNumber,
    productName: product.name,
    componentName: component.name,
  });
  await expectCalendarArticleItems(page, {
    appointmentId: createdAppointment.id,
    projectId: project.id,
    date: appointmentDate,
    productName: product.name,
    componentName: component.name,
  });
});

test("updates week card and calendar aggregation after assigning a project with article list in the appointment form", async ({ page }) => {
  const appointmentDate = getNextWeekTuesdayDate();
  const customer = await createCustomerFixture("FT01-FT27-DIRECT");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT01 FT27 Formular Produkt",
    description: "Produkt fuer Formular-Zuweisung.",
  });
  const component = await createComponentFixture({
    categoryName: "\u00d6fen",
    name: "FT01 FT27 Formular Ofen",
    description: "Komponente fuer Formular-Zuweisung.",
  });
  const project = await createProjectFixture({
    prefix: "FT01-FT27-FORM",
    customerId: customer.id,
    name: "FT01 FT27 Terminprojekt Formular",
  });
  const orderNumber = project.projectOrder?.orderNumber ?? project.orderNumber ?? "";

  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: product.id,
    quantity: 1,
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    componentId: component.id,
    quantity: 1,
  });

  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: appointmentDate,
  });

  await loginAsAdmin(page);
  await page.getByTestId("button-next").click();
  await openWeekAppointment(page, appointment.id);
  await expect(page.getByTestId("slot-project-relation")).toContainText("Kein Projekt ausgewählt");

  await assignProjectWithoutAppointments(page, project, customer);

  const saveResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/appointments/${appointment.id}`
  ));
  await page.getByTestId("button-save-appointment").click();
  await confirmSaveIfNeeded(page);
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);

  await expectWeekCardAndPreview(page, {
    appointmentId: appointment.id,
    projectName: project.name,
    orderNumber,
    productName: product.name,
    componentName: component.name,
  });
  await expectCalendarArticleItems(page, {
    appointmentId: appointment.id,
    projectId: project.id,
    date: appointmentDate,
    productName: product.name,
    componentName: component.name,
  });
});
