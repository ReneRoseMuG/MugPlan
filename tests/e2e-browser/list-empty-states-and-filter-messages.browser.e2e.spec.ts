/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Empty-States erscheinen in allen vorhandenen Listen-Views bei leerer Datenbasis.
 * - Empty-States verschwinden in allen vorhandenen Listen-Views, sobald mindestens ein passender Datensatz vorhanden ist.
 * - Filterbare Listen zeigen bei aktiven Nicht-Treffer-Filtern eine Message und blenden sie bei Treffern wieder aus.
 *
 * Fehlerfaelle:
 * - Empty-Messages bleiben trotz vorhandener Daten sichtbar.
 * - View-Wechsel verlieren den Empty-State oder stellen ihn falsch wieder her.
 * - Filter-Messages erscheinen nicht oder verschwinden bei Treffer-Filtern nicht.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer Empty- und Filter-Messages in Kunden-, Projekt-, Mitarbeiter-, Tour-, Team- und Terminlisten.
 */
import { expect, test, type Locator, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
} from "../helpers/testDataFactory";

function boardEmptyMessage(container: Locator, title: string) {
  return container.getByRole("heading", { name: title });
}

function tableEmptyMessage(container: Locator, title: string) {
  return container.getByRole("heading", { name: title });
}

test.describe("empty states on empty datasets", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState();
  });

  test("customers list: empty state is stable across board and table views", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-kunden").click();

    const board = page.getByTestId("list-customers");
    await expect(board).toBeVisible();
    await expect(boardEmptyMessage(board, "Keine Kunden vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-customers-table").click();
    const table = page.getByTestId("table-customers");
    await expect(table).toBeVisible();
    await expect(tableEmptyMessage(table, "Keine Kunden vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-customers-board").click();
    await expect(board).toBeVisible();
    await expect(boardEmptyMessage(board, "Keine Kunden vorhanden.")).toBeVisible();
  });

  test("projects list: empty state is stable across board and table views", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-projekte").click();

    const board = page.getByTestId("list-projects");
    await expect(board).toBeVisible();
    await expect(boardEmptyMessage(board, "Keine Projekte vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-projects-table").click();
    const table = page.getByTestId("table-projects");
    await expect(table).toBeVisible();
    await expect(tableEmptyMessage(table, "Keine Projekte vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-projects-board").click();
    await expect(boardEmptyMessage(board, "Keine Projekte vorhanden.")).toBeVisible();
  });

  test("employees list: empty state is stable across board and table views", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-mitarbeiter").click();

    const board = page.getByTestId("list-employees");
    await expect(board).toBeVisible();
    await expect(boardEmptyMessage(board, "Keine Mitarbeiter vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-employees-table").click();
    const table = page.getByTestId("table-employees");
    await expect(table).toBeVisible();
    await expect(tableEmptyMessage(table, "Keine Mitarbeiter vorhanden.")).toBeVisible();

    await page.getByTestId("toggle-employees-board").click();
    await expect(boardEmptyMessage(board, "Keine Mitarbeiter vorhanden.")).toBeVisible();
  });

  test("tours list: empty state is visible on empty data", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-touren").click();

    const board = page.getByTestId("list-tours");
    await expect(board).toBeVisible();
    await expect(board.getByText("Keine Touren vorhanden")).toBeVisible();
  });

  test("teams list: empty state is visible on empty data", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-teams").click();

    const board = page.getByTestId("list-teams");
    await expect(board).toBeVisible();
    await expect(board.getByText("Keine Teams vorhanden")).toBeVisible();
  });

  test("appointments list: empty state is visible on empty data", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-termine").click();

    const table = page.getByTestId("table-appointments-list");
    await expect(table).toBeVisible();
    await expect(tableEmptyMessage(table, "Keine Termine vorhanden.")).toBeVisible();
  });
});

test.describe("states with seeded data", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState();
  });

  test("customers list: empty state disappears in board and table when data exists", async ({ page }) => {
    await createCustomerFixture("EMPTY-CUSTOMER");

    await loginAsAdmin(page);
    await page.getByTestId("nav-kunden").click();

    const board = page.getByTestId("list-customers");
    await expect(board).toBeVisible();
    await expect(boardEmptyMessage(board, "Keine Kunden vorhanden.")).not.toBeVisible();

    await page.getByTestId("toggle-customers-table").click();
    const table = page.getByTestId("table-customers");
    await expect(table).toBeVisible();
    await expect(tableEmptyMessage(table, "Keine Kunden vorhanden.")).not.toBeVisible();
  });

  test("projects list: empty state disappears in board and table when data exists", async ({ page }) => {
    const project = await createProjectFixture({ prefix: "EMPTY-PROJECT", name: "Empty Project" });
    await createAppointmentFixture({ projectId: project.id });

    await loginAsAdmin(page);
    await page.getByTestId("nav-projekte").click();

    const board = page.getByTestId("list-projects");
    await expect(boardEmptyMessage(board, "Keine Projekte vorhanden.")).not.toBeVisible();

    await page.getByTestId("toggle-projects-table").click();
    const table = page.getByTestId("table-projects");
    await expect(tableEmptyMessage(table, "Keine Projekte vorhanden.")).not.toBeVisible();
  });

  test("employees list: empty state disappears in board and table when data exists", async ({ page }) => {
    await createEmployeeFixture("EMPTY-EMPLOYEE");

    await loginAsAdmin(page);
    await page.getByTestId("nav-mitarbeiter").click();

    const board = page.getByTestId("list-employees");
    await expect(boardEmptyMessage(board, "Keine Mitarbeiter vorhanden.")).not.toBeVisible();

    await page.getByTestId("toggle-employees-table").click();
    const table = page.getByTestId("table-employees");
    await expect(tableEmptyMessage(table, "Keine Mitarbeiter vorhanden.")).not.toBeVisible();
  });

  test("tours list: empty state disappears when data exists", async ({ page }) => {
    await createTourFixture("#1f8a70");

    await loginAsAdmin(page);
    await page.getByTestId("nav-touren").click();

    const board = page.getByTestId("list-tours");
    await expect(board.getByText("Keine Touren vorhanden")).not.toBeVisible();
  });

  test("teams list: empty state disappears when data exists", async ({ page }) => {
    await createTeamFixture("#7c3aed");

    await loginAsAdmin(page);
    await page.getByTestId("nav-teams").click();

    const board = page.getByTestId("list-teams");
    await expect(board.getByText("Keine Teams vorhanden")).not.toBeVisible();
  });

  test("appointments list: empty state disappears when data exists", async ({ page }) => {
    const project = await createProjectFixture({ prefix: "EMPTY-APPOINTMENT", name: "Empty Appointment Project" });
    await createAppointmentFixture({ projectId: project.id });

    await loginAsAdmin(page);
    await page.getByTestId("nav-termine").click();

    const table = page.getByTestId("table-appointments-list");
    await expect(tableEmptyMessage(table, "Keine Termine vorhanden.")).not.toBeVisible();
  });
});

test.describe("filter messages", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState();
  });

  test("customers list: filter message appears for no hits and disappears for hits", async ({ page }) => {
    const customer = await createCustomerFixture("FILTER-CUSTOMER");

    await loginAsAdmin(page);
    await page.getByTestId("nav-kunden").click();

    const board = page.getByTestId("list-customers");
    const filteredMessage = boardEmptyMessage(board, "Keine Treffer gefunden.");
    const nameFilter = page.locator("#customer-filter-last-name");

    await nameFilter.fill("NO-HIT");
    await expect(filteredMessage).toBeVisible();

    await nameFilter.fill(customer.lastName ?? "");
    await expect(filteredMessage).not.toBeVisible();
  });

  test("projects list: filter message appears for no hits and disappears for hits", async ({ page }) => {
    const project = await createProjectFixture({ prefix: "FILTER-PROJECT", name: "Filter Project" });
    await createAppointmentFixture({ projectId: project.id });

    await loginAsAdmin(page);
    await page.getByTestId("nav-projekte").click();

    const board = page.getByTestId("list-projects");
    const filteredMessage = boardEmptyMessage(board, "Keine Treffer gefunden.");
    const titleFilter = page.locator("#project-filter-title");

    await titleFilter.fill("NO-HIT");
    await expect(filteredMessage).toBeVisible();

    await titleFilter.fill("Filter Project");
    await expect(filteredMessage).not.toBeVisible();
  });

  test("employees list: filter message appears for no hits and disappears for hits", async ({ page }) => {
    const employee = await createEmployeeFixture("FILTER-EMPLOYEE");

    await loginAsAdmin(page);
    await page.getByTestId("nav-mitarbeiter").click();

    const board = page.getByTestId("list-employees");
    const filteredMessage = boardEmptyMessage(board, "Keine Treffer gefunden.");
    const nameFilter = page.locator("#employee-filter-last-name");

    await nameFilter.fill("NO-HIT");
    await expect(filteredMessage).toBeVisible();

    await nameFilter.fill(employee.lastName);
    await expect(filteredMessage).not.toBeVisible();
  });

  test("appointments list: filter message appears for no hits and disappears for hits", async ({ page }) => {
    const project = await createProjectFixture({ prefix: "FILTER-APPOINTMENT", name: "Appointment Filter Project" });
    await createAppointmentFixture({ projectId: project.id });

    await loginAsAdmin(page);
    await page.getByTestId("nav-termine").click();

    const table = page.getByTestId("table-appointments-list");
    const filteredMessage = tableEmptyMessage(table, "Keine Treffer gefunden.");
    const orderNumberFilter = page.locator("#appointments-filter-order-number");

    await orderNumberFilter.fill("NO-HIT");
    await expect(filteredMessage).toBeVisible();

    await orderNumberFilter.fill("");
    await expect(filteredMessage).not.toBeVisible();
  });
});
