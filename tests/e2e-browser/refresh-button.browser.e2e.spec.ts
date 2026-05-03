/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Sidebar-Refresh laedt neu angelegte Datensaetze in allen freigegebenen Haupt-Views nach.
 * - Der Standalone-Refresh laedt neu angelegte Datensaetze in allen ueber "In Tab oeffnen" erreichbaren Views nach.
 * - Neu angelegte Datensaetze bleiben vor dem manuellen Refresh unsichtbar und erscheinen erst danach.
 *
 * Fehlerfaelle:
 * - Der Refresh invalidiert Queries nicht mehr und Listen oder Kalender bleiben stale.
 * - Standalone-Popups zeigen trotz aktivem Refresh-Button keine frisch erzeugten Datensaetze.
 * - Einzelne Views driften bei Refresh-Verhalten zwischen Haupt-App und Open-Tab-Variante auseinander.
 *
 * Ziel:
 * Die gemeinsame Refresh-Funktion fuer Sidebar und alle relevanten Open-Tab-Views browserseitig gegen Freshness-Regressionen absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  buildCustomerPayload,
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

type CustomerApiEntity = {
  id: number;
  customerNumber: string;
};

type ProjectApiEntity = {
  id: number;
  name: string;
  orderNumber?: string | null;
};

type AppointmentApiEntity = {
  id: number;
};

type EmployeeApiEntity = {
  id: number;
  firstName: string;
  lastName: string;
};

type ColorApiEntity = {
  id: number;
  name: string;
};

let sequence = 1;

function nextToken(prefix: string) {
  const token = `${prefix}-${String(sequence).padStart(4, "0")}`;
  sequence += 1;
  return token;
}

async function expectOkResponse(response: Awaited<ReturnType<Page["request"]["post"]>>) {
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function createCustomerViaApi(page: Page, prefix: string): Promise<CustomerApiEntity> {
  const response = await page.request.post("/api/customers", {
    data: buildCustomerPayload(prefix),
  });
  await expectOkResponse(response);
  return response.json() as Promise<CustomerApiEntity>;
}

async function createProjectViaApi(page: Page, params: {
  customerId: number;
  prefix: string;
  name?: string;
}): Promise<ProjectApiEntity> {
  const token = nextToken(params.prefix);
  const response = await page.request.post("/api/projects", {
    data: {
      customerId: params.customerId,
      name: params.name ?? `Refresh Projekt ${token}`,
      type: 1,
      orderNumber: `ORD-${token}`,
      descriptionMd: null,
      amount: null,
    },
  });
  await expectOkResponse(response);
  return response.json() as Promise<ProjectApiEntity>;
}

async function createAppointmentViaApi(page: Page, input: {
  projectId?: number | null;
  customerId?: number;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  employeeIds?: number[];
  tourId?: number | null;
}): Promise<AppointmentApiEntity> {
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
  await expectOkResponse(response);
  return response.json() as Promise<AppointmentApiEntity>;
}

async function createEmployeeViaApi(page: Page, prefix: string): Promise<EmployeeApiEntity> {
  const token = nextToken(prefix);
  const response = await page.request.post("/api/employees", {
    data: {
      firstName: "Refresh",
      lastName: token,
      phone: null,
      email: null,
    },
  });
  await expectOkResponse(response);
  return response.json() as Promise<EmployeeApiEntity>;
}

async function createTourViaApi(page: Page, color: string): Promise<ColorApiEntity> {
  const response = await page.request.post("/api/tours", {
    data: { color },
  });
  await expectOkResponse(response);
  return response.json() as Promise<ColorApiEntity>;
}

async function createTeamViaApi(page: Page, color: string): Promise<ColorApiEntity> {
  const response = await page.request.post("/api/teams", {
    data: { color },
  });
  await expectOkResponse(response);
  return response.json() as Promise<ColorApiEntity>;
}

async function openStandalonePopup(page: Page, buttonTestId: string) {
  const popupPromise = page.waitForEvent("popup");
  await page.getByTestId(buttonTestId).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.getByTestId("standalone-header")).toBeVisible();
  await expect(popup.getByTestId("sidebar")).toHaveCount(0);
  return popup;
}

async function openCustomersBoard(page: Page) {
  await page.getByTestId("nav-kunden").click();
  await page.getByTestId("toggle-customers-board").click();
  const board = page.getByTestId("list-customers");
  await expect(board).toBeVisible({ timeout: 10_000 });
  return board;
}

async function openProjectsBoard(page: Page) {
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("toggle-projects-board").click();
  const board = page.getByTestId("list-projects");
  await expect(board).toBeVisible({ timeout: 10_000 });
  return board;
}

async function openEmployeesBoard(page: Page) {
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId("toggle-employees-board").click();
  const board = page.getByTestId("list-employees");
  await expect(board).toBeVisible({ timeout: 10_000 });
  return board;
}

async function openAppointmentsList(page: Page) {
  await page.getByTestId("nav-termine").click();
  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible({ timeout: 10_000 });
  return table;
}

async function openWeekView(page: Page) {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible({ timeout: 10_000 });
}

async function openMonthView(page: Page) {
  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible({ timeout: 10_000 });
}

async function openToursView(page: Page) {
  await page.getByTestId("nav-touren").click();
  const board = page.getByTestId("list-tours");
  await expect(board).toBeVisible({ timeout: 10_000 });
  return board;
}

async function openTeamsView(page: Page) {
  await page.getByTestId("nav-teams").click();
  const board = page.getByTestId("list-teams");
  await expect(board).toBeVisible({ timeout: 10_000 });
  return board;
}

function appointmentRow(table: Locator, projectName: string) {
  return table.locator("tbody tr").filter({ hasText: projectName }).first();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  sequence = 1;
  await resetBrowserSuiteState("tests/e2e-browser/refresh-button.browser.e2e.spec.ts");
});

test("refreshes customers in the main customers board via the sidebar button", async ({ page }) => {
  await createCustomerFixture("REFRESH-CUST-BASE");

  await loginAsAdmin(page);
  await openCustomersBoard(page);

  const createdCustomer = await createCustomerViaApi(page, "REFRESH-CUST");
  const createdCard = page.getByTestId(`customer-card-${createdCustomer.id}`);
  await expect(createdCard).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
});

test("refreshes projects in the main projects board via the sidebar button", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-PROJ-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-PROJ-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Projekt Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);
  await openProjectsBoard(page);

  const externalCustomer = await createCustomerViaApi(page, "REFRESH-PROJ-CUST");
  const createdProject = await createProjectViaApi(page, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-PROJ",
  });
  await createAppointmentViaApi(page, {
    projectId: createdProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });
  const createdCard = page.getByTestId(`project-card-${createdProject.id}`);
  await expect(createdCard).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
});

test("refreshes appointments in the main appointments list via the sidebar button", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-APPT-LIST-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-APPT-LIST-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Terminliste Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);
  const table = await openAppointmentsList(page);

  const externalCustomer = await createCustomerViaApi(page, "REFRESH-APPT-LIST-CUST");
  const externalProject = await createProjectViaApi(page, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-APPT-LIST",
  });
  await createAppointmentViaApi(page, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  const createdRow = appointmentRow(table, externalProject.name);
  await expect(createdRow).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdRow).toBeVisible({ timeout: 10_000 });
});

test("refreshes week calendar appointments in the main app via the sidebar button", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-WEEK-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-WEEK-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Woche Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });

  await loginAsAdmin(page);
  await openWeekView(page);

  const externalCustomer = await createCustomerViaApi(page, "REFRESH-WEEK-CUST");
  const externalProject = await createProjectViaApi(page, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-WEEK",
  });
  const createdAppointment = await createAppointmentViaApi(page, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });
  const createdPanel = page.getByTestId(`week-appointment-panel-${createdAppointment.id}`).first();
  await expect(createdPanel).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdPanel).toBeVisible({ timeout: 10_000 });
});

test("refreshes month calendar appointments in the main app via the sidebar button", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-MONTH-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-MONTH-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Monat Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });

  await loginAsAdmin(page);
  await openMonthView(page);

  const externalCustomer = await createCustomerViaApi(page, "REFRESH-MONTH-CUST");
  const externalProject = await createProjectViaApi(page, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-MONTH",
  });
  const createdAppointment = await createAppointmentViaApi(page, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });
  const createdBar = page.getByTestId(`appointment-bar-${createdAppointment.id}`).first();
  await expect(createdBar).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdBar).toBeVisible({ timeout: 10_000 });
});

test("refreshes tours in the main tours view via the sidebar button", async ({ page }) => {
  await createTourFixture("#225577");

  await loginAsAdmin(page);
  await openToursView(page);

  const createdTour = await createTourViaApi(page, "#334455");
  const createdCard = page.getByTestId(`card-tour-${createdTour.id}`);
  await expect(createdCard).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
});

test("refreshes employees in the main employees board via the sidebar button", async ({ page }) => {
  await createEmployeeFixture("REFRESH-EMP-BASE");

  await loginAsAdmin(page);
  await openEmployeesBoard(page);

  const createdEmployee = await createEmployeeViaApi(page, "REFRESH-EMP");
  const createdCard = page.getByTestId(`employee-card-${createdEmployee.id}`);
  await expect(createdCard).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
});

test("refreshes teams in the main teams view via the sidebar button", async ({ page }) => {
  await createTeamFixture("#336699");

  await loginAsAdmin(page);
  await openTeamsView(page);

  const createdTeam = await createTeamViaApi(page, "#663399");
  const createdCard = page.getByTestId(`card-team-${createdTeam.id}`);
  await expect(createdCard).toHaveCount(0);

  await page.getByTestId("sidebar-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
});

test("refreshes the standalone customers popup opened via in-tab-open", async ({ page }) => {
  await createCustomerFixture("REFRESH-ST-CUST-BASE");

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-kunden-open-tab");
  await expect(popup.getByTestId("list-customers")).toBeVisible({ timeout: 10_000 });

  const createdCustomer = await createCustomerViaApi(popup, "REFRESH-ST-CUST");
  const createdCard = popup.getByTestId(`customer-card-${createdCustomer.id}`);
  await expect(createdCard).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone projects popup opened via in-tab-open", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-ST-PROJ-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-ST-PROJ-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Standalone Projekt Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-projekte-open-tab");
  await expect(popup.getByTestId("list-projects")).toBeVisible({ timeout: 10_000 });

  const externalCustomer = await createCustomerViaApi(popup, "REFRESH-ST-PROJ-CUST");
  const createdProject = await createProjectViaApi(popup, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-ST-PROJ",
  });
  await createAppointmentViaApi(popup, {
    projectId: createdProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });
  const createdCard = popup.getByTestId(`project-card-${createdProject.id}`);
  await expect(createdCard).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone appointments popup opened via in-tab-open", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-ST-APPT-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-ST-APPT-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Standalone Termine Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-termine-open-tab");
  const table = popup.getByTestId("table-appointments-list");
  await expect(table).toBeVisible({ timeout: 10_000 });

  const externalCustomer = await createCustomerViaApi(popup, "REFRESH-ST-APPT-CUST");
  const externalProject = await createProjectViaApi(popup, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-ST-APPT",
  });
  await createAppointmentViaApi(popup, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  const createdRow = appointmentRow(table, externalProject.name);
  await expect(createdRow).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdRow).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone week popup opened via in-tab-open", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-ST-WEEK-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-ST-WEEK-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Standalone Woche Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-wochenuebersicht-open-tab");
  await expect(popup.getByTestId("calendar-week-view")).toBeVisible({ timeout: 10_000 });

  const externalCustomer = await createCustomerViaApi(popup, "REFRESH-ST-WEEK-CUST");
  const externalProject = await createProjectViaApi(popup, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-ST-WEEK",
  });
  const createdAppointment = await createAppointmentViaApi(popup, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });
  const createdPanel = popup.getByTestId(`week-appointment-panel-${createdAppointment.id}`).first();
  await expect(createdPanel).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdPanel).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone month popup opened via in-tab-open", async ({ page }) => {
  const baseCustomer = await createCustomerFixture("REFRESH-ST-MONTH-BASE-CUST");
  const baseProject = await createProjectFixture({
    prefix: "REFRESH-ST-MONTH-BASE",
    customerId: baseCustomer.id,
    name: "Refresh Standalone Monat Basis",
  });
  await createAppointmentFixture({
    projectId: baseProject.id,
    customerId: baseCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-monatsuebersicht-open-tab");
  await expect(popup.getByTestId("month-sheet-container")).toBeVisible({ timeout: 10_000 });

  const externalCustomer = await createCustomerViaApi(popup, "REFRESH-ST-MONTH-CUST");
  const externalProject = await createProjectViaApi(popup, {
    customerId: externalCustomer.id,
    prefix: "REFRESH-ST-MONTH",
  });
  const createdAppointment = await createAppointmentViaApi(popup, {
    projectId: externalProject.id,
    customerId: externalCustomer.id,
    startDate: getRelativeBerlinDate(0),
  });
  const createdBar = popup.getByTestId(`appointment-bar-${createdAppointment.id}`).first();
  await expect(createdBar).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdBar).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone tours popup opened via in-tab-open", async ({ page }) => {
  await createTourFixture("#225577");

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-touren-open-tab");
  await expect(popup.getByTestId("list-tours")).toBeVisible({ timeout: 10_000 });

  const createdTour = await createTourViaApi(popup, "#445566");
  const createdCard = popup.getByTestId(`card-tour-${createdTour.id}`);
  await expect(createdCard).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone employees popup opened via in-tab-open", async ({ page }) => {
  await createEmployeeFixture("REFRESH-ST-EMP-BASE");

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-mitarbeiter-open-tab");
  await expect(popup.getByTestId("list-employees")).toBeVisible({ timeout: 10_000 });

  const createdEmployee = await createEmployeeViaApi(popup, "REFRESH-ST-EMP");
  const createdCard = popup.getByTestId(`employee-card-${createdEmployee.id}`);
  await expect(createdCard).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
  await popup.close();
});

test("refreshes the standalone teams popup opened via in-tab-open", async ({ page }) => {
  await createTeamFixture("#336699");

  await loginAsAdmin(page);
  const popup = await openStandalonePopup(page, "nav-teams-open-tab");
  await expect(popup.getByTestId("list-teams")).toBeVisible({ timeout: 10_000 });

  const createdTeam = await createTeamViaApi(popup, "#7744aa");
  const createdCard = popup.getByTestId(`card-team-${createdTeam.id}`);
  await expect(createdCard).toHaveCount(0);

  await popup.getByTestId("standalone-refresh").click();
  await expect(createdCard).toBeVisible({ timeout: 10_000 });
  await popup.close();
});
