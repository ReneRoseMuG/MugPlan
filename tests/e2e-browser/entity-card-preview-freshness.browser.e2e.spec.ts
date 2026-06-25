/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin-, Projekt-, Kunden- und Mitarbeiterkarten zeigen in Board View, Table View und Hover-Preview die aktuellen Stammdaten.
 * - Nach Parent- oder Relationen-Aenderungen werden die aktualisierten Daten im jeweils naechsten View-Aufruf sichtbar.
 * - Der Mitarbeiter-Terminhover rendert maximal die ersten vier Termine, waehrend das Formular alle Termine zeigt.
 *
 * Fehlerfaelle:
 * - Board und Table View greifen nach Mutationen auf stale Projektionen zu.
 * - Hover-Previews zeigen andere Daten als die zugrunde liegenden Entity Cards.
 * - Mitarbeiter-Preview oder Formular verlieren Terminreferenzen bei mehreren Terminen.
 *
 * Ziel:
 * Die browserseitigen Freshness- und Vollstaendigkeitsluecken fuer Entity Cards und Entity-Card-Previews sichtbar absichern.
 */
import { expect, test, type Page } from "./fixtures";

import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createFilledProjectArticleListFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function hoverTableRow(page: Page, tableTestId: string, rowText: string) {
  const row = page.getByTestId(tableTestId).locator("tbody tr").filter({ hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.hover();
  return row;
}

// MS-68: Rechnungsadresse über die Adress-API ändern (wie im echten Client), statt über den
// Kunden-Contract; setzt die BILLING-Zeile des Kunden auf die übergebenen Werte.
async function patchBillingAddressViaApi(
  page: Page,
  customerId: number,
  fields: { addressLine1: string; addressLine2?: string | null; postalCode: string; city: string; country: string },
) {
  const addresses = (await (await page.request.get(`/api/customers/${customerId}/addresses`)).json()) as Array<{ id: number; roleKey: string | null; version: number }>;
  const billing = addresses.find((address) => address.roleKey === "BILLING")!;
  await page.request.patch(`/api/customers/${customerId}/addresses/${billing.id}`, {
    data: {
      addressLine1: fields.addressLine1,
      addressLine2: fields.addressLine2 ?? null,
      postalCode: fields.postalCode,
      city: fields.city,
      country: fields.country,
      version: billing.version,
    },
  });
}

test("Terminkarte und Tabellen-Preview zeigen nach Parent-Mutation die frischen Customer- und Projektdaten", async ({ page }) => {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "E2E-APPT-CUST",
    firstName: "Mira",
    lastName: "Planung",
    fullName: "Mira Planung",
    company: "Planung GmbH",
    email: "mira.planung@example.test",
    phone: "0441000001",
    addressLine1: "Alte Straße 3",
    postalCode: "26122",
    city: "Oldenburg",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "E2E-APPT-PROJ",
    customerId: customer.id,
    name: "Termin Projekt Alt",
    orderNumber: "APPT-ALT-1",
    descriptionMd: "Alte Projektbeschreibung",
    projectOrder: {
      amount: "1000.00",
      plannedDateText: "KW 18 / Montag",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "APPT-ALT-1",
    prefix: "E2E-APPT",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);

  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText(customer.customerNumber);
  await expect(appointmentPanel).toContainText("26122");
  await expect(appointmentPanel).toContainText("Termin Projekt Alt");
  await expect(appointmentPanel).toContainText("APPT-ALT-1");

  await page.getByTestId("week-customer-panel").hover();
  await expect(page.getByText("0441000001")).toBeVisible({ timeout: 5_000 });

  await page.request.patch(`/api/customers/${customer.id}`, {
    data: {
      version: customer.version,
      firstName: "Nina",
      lastName: "Frisch",
      company: "Frisch GmbH",
      email: "nina.frisch@example.test",
      phone: "0441009999",
    },
  });
  await patchBillingAddressViaApi(page, customer.id, {
    addressLine1: "Neue Straße 8",
    postalCode: "28195",
    city: "Bremen",
    country: "Deutschland",
  });
  await page.request.patch(`/api/projects/${project.id}`, {
    data: {
      version: project.version,
      name: "Termin Projekt Neu",
      descriptionMd: "Neue Projektbeschreibung",
      projectOrder: {
        amount: "2000.00",
        plannedDateText: "KW 20 / Freitag",
        plannedWeek: "2099-W20",
      },
    },
  });

  await page.reload();
  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible({ timeout: 10_000 });
  await hoverTableRow(page, "table-appointments-list", "Termin Projekt Neu");
  const listPreview = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(listPreview).toContainText("28195");
  await expect(listPreview).toContainText("Termin Projekt Neu");
  await expect(listPreview).toContainText("APPT-ALT-1");

  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("28195");
  await expect(appointmentPanel).toContainText("Termin Projekt Neu");
  await expect(appointmentPanel).toContainText("APPT-ALT-1");
});

test("Projektkarte und Tabellen-Preview spiegeln frische Customer-Daten und Sidebar-Termine", async ({ page }) => {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "E2E-PROJ-CUST",
    firstName: "Petra",
    lastName: "Alt",
    fullName: "Petra Alt",
    email: "petra.alt@example.test",
    phone: "0499111000",
    addressLine1: "Werkshof 2",
    postalCode: "26135",
    city: "Oldenburg",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "E2E-PROJ",
    customerId: customer.id,
    name: "Projektkarte Alt",
    orderNumber: "PROJ-ALT-2",
    descriptionMd: "Projektbeschreibung Alt",
    projectOrder: {
      amount: "5000.00",
      plannedDateText: "KW 18 / Mittwoch",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "PROJ-ALT-2",
    prefix: "E2E-PROJ",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);

  await page.getByTestId("nav-projekte").click();
  const projectCard = page.getByTestId(`project-card-${project.id}`);
  await expect(projectCard).toBeVisible({ timeout: 10_000 });
  await expect(projectCard).toContainText("Projektkarte Alt");
  await expect(projectCard).toContainText("PROJ-ALT-2");
  await expect(projectCard).toContainText("Alt, Petra");

  await page.request.patch(`/api/customers/${customer.id}`, {
    data: {
      version: customer.version,
      firstName: "Petra",
      lastName: "Neu",
      email: "petra.neu@example.test",
      phone: "0499111222",
    },
  });
  await patchBillingAddressViaApi(page, customer.id, {
    addressLine1: "Neue Werkstraße 5",
    postalCode: "28203",
    city: "Bremen",
    country: "Deutschland",
  });
  await page.request.patch(`/api/projects/${project.id}`, {
    data: {
      version: project.version,
      name: "Projektkarte Neu",
      descriptionMd: "Projektbeschreibung Neu",
      projectOrder: {
        amount: "7000.00",
        plannedDateText: "KW 21 / Donnerstag",
        plannedWeek: "2099-W21",
      },
    },
  });

  await page.reload();
  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await expect(projectCard).toBeVisible({ timeout: 10_000 });
  await expect(projectCard).toContainText("Projektkarte Neu");
  await expect(projectCard).toContainText("PROJ-ALT-2");
  await expect(projectCard).toContainText("Neu, Petra");

  const projectCustomerPanel = projectCard.getByTestId(`project-card-customer-${project.id}`);
  await projectCustomerPanel.hover();
  await expect(page.getByText("28203 Bremen")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("0499111222")).toBeVisible();

  await page.getByTestId("toggle-projects-table").click();
  await hoverTableRow(page, "table-projects", "Projektkarte Neu");
  const tableProjectPreview = page.getByTestId(`project-card-${project.id}`);
  await expect(tableProjectPreview).toContainText("Projektkarte Neu");
  await expect(tableProjectPreview).toContainText("Neu, Petra");
  await tableProjectPreview.getByTestId(`project-card-customer-${project.id}`).hover();
  await expect(page.getByText("28203 Bremen")).toBeVisible({ timeout: 5_000 });

  await page.getByTestId("toggle-projects-board").click();
  await page.getByTestId(`project-card-${project.id}`).dblclick();
  await expect(page.getByTestId(`project-appointment-${appointment.id}`)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("button-close-project").click();
});

test("Kundenkarte und Tabellen-Preview spiegeln frische Stammdaten sowie verknuepfte Projekte und Termine", async ({ page }) => {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "E2E-CUST",
    firstName: "Klara",
    lastName: "Alt",
    fullName: "Klara Alt",
    company: "Kundenbau Alt",
    email: "klara.alt@example.test",
    phone: "0421000000",
    addressLine1: "Kundenweg 4",
    addressLine2: "Tor 7",
    postalCode: "26123",
    city: "Oldenburg",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "E2E-CUST-PROJ",
    customerId: customer.id,
    name: "Kundenprojekt Eins",
    orderNumber: "CUST-PROJ-1",
    descriptionMd: "Projekt fuer Kundenkarte",
    projectOrder: {
      amount: "3500.00",
      plannedDateText: "KW 18 / Dienstag",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "CUST-PROJ-1",
    prefix: "E2E-CUST-PROJ",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);

  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await expect(customerCard).toContainText("Alt, Klara");
  await expect(customerCard).toContainText("26123");
  await expect(customerCard).toContainText("Kundenweg 4");

  await page.request.patch(`/api/customers/${customer.id}`, {
    data: {
      version: customer.version,
      firstName: "Klara",
      lastName: "Neu",
      company: "Kundenbau Neu",
      email: "klara.neu@example.test",
      phone: "0421777888",
    },
  });
  await patchBillingAddressViaApi(page, customer.id, {
    addressLine1: "Neue Kundenstraße 11",
    addressLine2: "Empfang",
    postalCode: "28195",
    city: "Bremen",
    country: "Deutschland",
  });
  const secondProject = await createProjectFixtureWithOverrides({
    prefix: "E2E-CUST-PROJ-2",
    customerId: customer.id,
    name: "Kundenprojekt Zwei",
    orderNumber: "CUST-PROJ-2",
    descriptionMd: "Zweites Kundenprojekt",
    projectOrder: {
      amount: "4500.00",
      plannedDateText: "KW 20 / Donnerstag",
      plannedWeek: "2099-W20",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: secondProject.id,
    orderNumber: secondProject.orderNumber ?? "CUST-PROJ-2",
    prefix: "E2E-CUST-PROJ-2",
  });
  const secondAppointment = await createAppointmentFixture({
    projectId: secondProject.id,
    startDate: getRelativeBerlinDate(4),
  });

  await page.reload();
  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await expect(customerCard).toContainText("Neu, Klara");
  await expect(customerCard).toContainText("28195");
  await expect(customerCard).toContainText("Neue Kundenstraße 11");

  await page.getByTestId("toggle-customers-table").click();
  await hoverTableRow(page, "table-customers", customer.customerNumber);
  await expect(page.getByTestId(`customer-card-${customer.id}`)).toContainText("Neu, Klara");
  await expect(page.getByTestId(`customer-card-${customer.id}`)).toContainText("28195");

  await page.getByTestId("toggle-customers-board").click();
  await page.getByTestId(`customer-card-${customer.id}`).dblclick();
  await expect(page.getByTestId(`customer-appointment-${appointment.id}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(`customer-appointment-${secondAppointment.id}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId(`linked-project-card-${project.id}`)).toBeVisible();
  await expect(page.getByTestId(`linked-project-card-${secondProject.id}`)).toBeVisible();
  await page.getByTestId("button-close-customer").click();
});

test("Mitarbeiterkarte und Preview begrenzen Hover auf vier Termine, waehrend das Formular alle Termine zeigt", async ({ page }) => {
  const employee = await createEmployeeFixtureWithOverrides({
    prefix: "E2E-EMP",
    firstName: "Lena",
    lastName: "Vorschau",
    phone: "0151000009",
    email: "lena.vorschau@example.test",
  });
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "E2E-EMP-CUST",
    firstName: "Fritz",
    lastName: "Kunde",
    fullName: "Fritz Kunde",
    phone: "0441888777",
    email: "fritz.kunde@example.test",
    addressLine1: "Feldweg 3",
    postalCode: "26129",
    city: "Oldenburg",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "E2E-EMP-PROJ",
    customerId: customer.id,
    name: "Mitarbeiterprojekt",
    orderNumber: "EMP-PROJ-1",
    descriptionMd: "Mitarbeiterprojekt Beschreibung",
    projectOrder: {
      amount: "6000.00",
      plannedDateText: "KW 18 / Montag",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "EMP-PROJ-1",
    prefix: "E2E-EMP-PROJ",
  });
  const appointments = [] as Awaited<ReturnType<typeof createAppointmentFixture>>[];
  for (const index of Array.from({ length: 8 }, (_, value) => value)) {
    appointments.push(
      await createAppointmentFixture({
        projectId: project.id,
        startDate: getRelativeBerlinDate(index + 1),
        employeeIds: [employee.id],
      }),
    );
  }

  await loginAsAdmin(page);

  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(employeeCard).toContainText("0151000009");
  await expect(employeeCard).toContainText("lena.vorschau@example.test");
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`)).toContainText("8");

  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${appointments[7].id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`employee-appointment-preview-${appointments[4].id}`)).toBeVisible();
  await expect(page.getByTestId(`employee-appointment-preview-${appointments[3].id}`)).toHaveCount(0);
  await expect(page.getByText("... weitere im Formular")).toBeVisible();

  await page.getByTestId("toggle-employees-table").click();
  await hoverTableRow(page, "table-employees", "0151000009");
  await expect(page.getByTestId(`employee-card-${employee.id}`)).toContainText("0151000009");

  await page.getByTestId("toggle-employees-board").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  const appointmentRows = page.getByTestId("table-appointments-list").locator("tbody tr");
  await expect(appointmentRows).toHaveCount(8);

  await page.request.put(`/api/employees/${employee.id}`, {
    data: {
      version: employee.version,
      firstName: "Lena",
      lastName: "Aktuell",
      phone: "0151000010",
      email: "lena.aktuell@example.test",
    },
  });

  await page.getByTestId("button-close-employee").click();
  await page.reload();
  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await expect(page.getByTestId(`employee-card-${employee.id}`)).toContainText("0151000010");
  await expect(page.getByTestId(`employee-card-${employee.id}`)).toContainText("lena.aktuell@example.test");
});
