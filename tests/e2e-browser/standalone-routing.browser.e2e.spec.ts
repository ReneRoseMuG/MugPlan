/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die bestehende Sidebar-Navigation bleibt trotz zusätzlicher Standalone-Buttons im aktuellen Tab unverändert.
 * - Alle freigegebenen Standalone-Routen und echten "In Tab öffnen"-Popups rendern ohne Sidebar, aber mit schlankem Header.
 * - Jede Standalone-Ansicht zeigt ein frisch erzeugtes, gültiges Domänenobjekt statt auf Bestandsdaten zu vertrauen.
 * - Die Wochenroute synchronisiert KW- und Jahr-Parameter robust inklusive Jahreswechsel und Fallbacks.
 * - Projekte und Wochenkalender lassen sich im Standalone-Tab über sichtbare Domänenobjekte öffnen, bearbeiten und wieder in die Ansicht zurückschließen.
 * - Nicht existierende Standalone-Routen fallen sauber auf die 404-Seite zurück.
 *
 * Fehlerfälle:
 * - Die Sidebar-Navigation springt versehentlich auf `/standalone`-Routen.
 * - Ein neuer Tab landet trotz aktiver Session im Login oder in einer 404-/Fehleransicht.
 * - Standalone-Sichten rendern mit globalem Chrome oder ohne Header/Refresh.
 * - Edit-Dialoge öffnen im Standalone-Kontext nicht oder kehren nach dem Schließen nicht sauber in die Liste bzw. Kalenderansicht zurück.
 * - Die Kalenderwoche driftet bei Parameterlesung oder Navigation über Jahresgrenzen.
 *
 * Ziel:
 * Standalone-Tab-Routing browserseitig gegen Regressionen der bestehenden Navigation, gegen Login-/Fallback-Fehler im Popup-Flow und gegen kaputte Edit-Rückwege der Standalone-Ansichten absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { getISOWeek } from "date-fns";

import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

async function expectAnyVisible(page: Page, selectors: string[]) {
  const locator = page.locator(selectors.join(", "));
  await expect(locator.first()).toBeVisible();
}

function expectStandaloneChrome(page: Page) {
  return Promise.all([
    expect(page.getByTestId("standalone-header")).toBeVisible(),
    expect(page.getByTestId("sidebar")).toHaveCount(0),
  ]);
}

async function expectNoStandaloneFallbacks(page: Page) {
  await expect(page.getByLabel("Benutzername oder E-Mail")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anmelden" })).toHaveCount(0);
  await expect(page.getByText("404 Page Not Found")).toHaveCount(0);
}

async function expectStandaloneViewLoaded(page: Page, locator: Locator) {
  await expectStandaloneChrome(page);
  await expectNoStandaloneFallbacks(page);
  await expect(locator).toBeVisible();
}

async function openStandalonePopup(page: Page, buttonTestId: string) {
  const popupPromise = page.waitForEvent("popup");
  await page.getByTestId(buttonTestId).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  return popup;
}

async function findProjectEntry(page: Page, project: { orderNumber?: string | null; name: string }) {
  if (project.orderNumber) {
    await page.locator("#project-filter-order-number").fill(project.orderNumber);
  }
  await page.locator("#project-filter-title").fill(project.name);

  const tableRow = page.getByTestId("table-projects").locator("tbody tr")
    .filter({ hasText: project.name })
    .filter({ hasText: project.orderNumber ?? "" })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  const boardCard = page.getByTestId("list-projects").locator(":scope > *")
    .filter({ hasText: project.name })
    .first();

  await expect(boardCard).toBeVisible();
  return boardCard;
}

async function findEmployeeEntry(page: Page, employee: { firstName: string; lastName: string }) {
  await page.locator("#employee-filter-last-name").fill(employee.lastName);

  const tableRow = page.getByTestId("table-employees").locator("tbody tr")
    .filter({ hasText: employee.lastName })
    .filter({ hasText: employee.firstName })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  const boardCard = page.getByTestId("list-employees").locator(":scope > *")
    .filter({ hasText: employee.lastName })
    .filter({ hasText: employee.firstName })
    .first();

  await expect(boardCard).toBeVisible();
  return boardCard;
}

function weekJumpInput(page: Page): Locator {
  return page.getByTestId("input-calendar-kw-jump");
}

test.describe("Sidebar navigation stays unchanged", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/standalone-routing.browser.e2e.spec.ts");
  });

  test("opens the week calendar in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-wochenuebersicht").click();

    await expect(page.getByTestId("calendar-week-view")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens the month overview in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-monatsuebersicht").click();

    await expect(page.getByTestId("month-sheet-container")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens appointments in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-termine").click();

    await expect(page.getByTestId("table-appointments-list")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens projects in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-projekte").click();

    await expectAnyVisible(page, ['[data-testid="table-projects"]', '[data-testid="list-projects"]']);
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens customers in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-kunden").click();

    await expectAnyVisible(page, ['[data-testid="table-customers"]', '[data-testid="list-customers"]']);
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens employees in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-mitarbeiter").click();

    await expectAnyVisible(page, ['[data-testid="table-employees"]', '[data-testid="list-employees"]']);
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens tours in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-touren").click();

    await expect(page.getByTestId("list-tours")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("opens teams in the same tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId("nav-teams").click();

    await expect(page.getByTestId("list-teams")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });

  test("keeps sequential navigation stable across views", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByTestId("nav-wochenuebersicht").click();
    await expect(page.getByTestId("calendar-week-view")).toBeVisible();

    await page.getByTestId("nav-monatsuebersicht").click();
    await expect(page.getByTestId("month-sheet-container")).toBeVisible();

    await page.getByTestId("nav-termine").click();
    await expect(page.getByTestId("table-appointments-list")).toBeVisible();

    await page.getByTestId("nav-projekte").click();
    await expectAnyVisible(page, ['[data-testid="table-projects"]', '[data-testid="list-projects"]']);

    await page.getByTestId("nav-wochenuebersicht").click();
    await expect(page.getByTestId("calendar-week-view")).toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/standalone).*$/);
  });
});

test.describe("Sidebar standalone buttons", () => {
  test.describe.configure({ mode: "serial" });

  test("shows all nine standalone buttons in the sidebar", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByTestId("nav-wochenuebersicht-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-monatsuebersicht-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-termine-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-projekte-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-kunden-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-mitarbeiter-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-touren-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-teams-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-monitoring-open-tab")).toBeVisible();
  });

  test("uses the expected tooltip on the week standalone button", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByTestId("nav-wochenuebersicht-open-tab")).toHaveAttribute("title", "In neuem Tab öffnen");
  });

  test("opens the week calendar in a new tab and shows the created appointment", async ({ page }) => {
    const customer = await createCustomerFixture("STR-WEEK-CUST");
    const project = await createProjectFixture({
      prefix: "STR-WEEK-PROJ",
      customerId: customer.id,
      name: "Standalone Woche Objekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-wochenuebersicht-open-tab");

    await expectStandaloneViewLoaded(popup, popup.getByTestId(`week-appointment-panel-${appointment.id}`));
    await popup.close();
  });

  test("opens the month overview in a new tab and shows the created appointment", async ({ page }) => {
    const customer = await createCustomerFixture("STR-MONTH-CUST");
    const project = await createProjectFixture({
      prefix: "STR-MONTH-PROJ",
      customerId: customer.id,
      name: "Standalone Monat Objekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-monatsuebersicht-open-tab");

    await expectStandaloneViewLoaded(popup, popup.getByTestId(`appointment-bar-${appointment.id}`));
    await popup.close();
  });

  test("opens appointments in a new tab and shows the created appointment row", async ({ page }) => {
    const customer = await createCustomerFixture("STR-APPT-CUST");
    const project = await createProjectFixture({
      prefix: "STR-APPT-PROJ",
      customerId: customer.id,
      name: "Standalone Termine Objekt",
    });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-termine-open-tab");

    await expectStandaloneViewLoaded(
      popup,
      popup.getByTestId("table-appointments-list").locator("tbody tr")
        .filter({ hasText: project.name })
        .filter({ hasText: customer.customerNumber })
        .first(),
    );
    await popup.close();
  });

  test("opens monitoring in a new tab and shows the under-staffed appointment row", async ({ page }) => {
    const customer = await createCustomerFixture("STR-MON-CUST");
    const project = await createProjectFixture({
      prefix: "STR-MON-PROJ",
      customerId: customer.id,
      name: "Standalone Monitoring Objekt",
    });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
      employeeIds: [],
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-monitoring-open-tab");

    await expectStandaloneViewLoaded(
      popup,
      popup.getByTestId("table-monitoring").locator("tbody tr")
        .filter({ hasText: project.name })
        .filter({ hasText: "Mindestzahl Mitarbeiter" })
        .first(),
    );
    await popup.close();
  });

  test("opens projects in a new tab and shows the created project", async ({ page }) => {
    const customer = await createCustomerFixture("STR-PROJ-CUST");
    const project = await createProjectFixture({
      prefix: "STR-PROJ",
      customerId: customer.id,
      name: "Standalone Projekt Objekt",
    });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(5),
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-projekte-open-tab");
    const projectRow = await findProjectEntry(popup, project);

    await expectStandaloneViewLoaded(popup, projectRow);
    await popup.close();
  });

  test("opens customers in a new tab and shows the created customer", async ({ page }) => {
    const customer = await createCustomerFixture("STR-CUSTOMER");

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-kunden-open-tab");

    await expectStandaloneViewLoaded(popup, popup.getByText(customer.customerNumber, { exact: false }).first());
    await popup.close();
  });

  test("opens employees in a new tab and shows the created employee", async ({ page }) => {
    const employee = await createEmployeeFixture("STR-EMPLOYEE");

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-mitarbeiter-open-tab");
    const employeeEntry = await findEmployeeEntry(popup, employee);

    await expectStandaloneViewLoaded(popup, employeeEntry);
    await popup.close();
  });

  test("opens tours in a new tab and shows the created tour", async ({ page }) => {
    const tour = await createTourFixture("#335577");

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-touren-open-tab");

    await expectStandaloneViewLoaded(popup, popup.getByText(tour.name, { exact: false }).first());
    await popup.close();
  });

  test("opens teams in a new tab and shows the created team", async ({ page }) => {
    const team = await createTeamFixture("#663399");

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-teams-open-tab");

    await expectStandaloneViewLoaded(popup, popup.getByText(team.name, { exact: false }).first());
    await popup.close();
  });
});

test.describe("Standalone routes", () => {
  test.describe.configure({ mode: "serial" });

  test("loads the week calendar without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week");

    await expectStandaloneViewLoaded(page, page.getByTestId("calendar-week-view"));
  });

  test("loads the week calendar from kw and year query parameters", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week?kw=1&year=2025");

    await expectStandaloneViewLoaded(page, page.getByTestId("calendar-week-view"));
    await expect(weekJumpInput(page)).toHaveValue("1");
    await expect(page).toHaveURL(/kw=1/);
    await expect(page).toHaveURL(/year=2025/);
  });

  test("falls back from invalid week query parameters without crashing", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week?kw=99&year=abc");

    await expectStandaloneViewLoaded(page, page.getByTestId("calendar-week-view"));
    await expect(weekJumpInput(page)).toHaveValue(String(getISOWeek(new Date())));
    await expect(page.url()).not.toContain("kw=99");
    await expect(page.url()).not.toContain("year=abc");
  });

  test("writes week navigation back into the URL", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week?kw=10&year=2025");

    await page.getByTestId("button-next").click();
    await expect(page).toHaveURL(/kw=11/);
    await expect(page).toHaveURL(/year=2025/);

    await page.getByTestId("button-prev").click();
    await expect(page).toHaveURL(/kw=10/);
    await expect(page).toHaveURL(/year=2025/);
  });

  test("updates the URL correctly across an ISO year change", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week?kw=52&year=2024");

    await page.getByTestId("button-next").click();
    await expect(page).toHaveURL(/kw=1/);
    await expect(page).toHaveURL(/year=2025/);
  });

  test("loads the standalone month overview without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/month");

    await expectStandaloneViewLoaded(page, page.getByTestId("month-sheet-container"));
  });

  test("loads the standalone appointments view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/appointments");

    await expectStandaloneViewLoaded(page, page.getByTestId("table-appointments-list"));
  });

  test("loads the standalone projects view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/projects");

    await expectStandaloneChrome(page);
    await expectNoStandaloneFallbacks(page);
    await expectAnyVisible(page, ['[data-testid="table-projects"]', '[data-testid="list-projects"]']);
  });

  test("loads the standalone customers view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/customers");

    await expectStandaloneChrome(page);
    await expectNoStandaloneFallbacks(page);
    await expectAnyVisible(page, ['[data-testid="table-customers"]', '[data-testid="list-customers"]']);
  });

  test("loads the standalone employees view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/employees");

    await expectStandaloneChrome(page);
    await expectNoStandaloneFallbacks(page);
    await expectAnyVisible(page, ['[data-testid="table-employees"]', '[data-testid="list-employees"]']);
  });

  test("loads the standalone tours view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/tours");

    await expectStandaloneViewLoaded(page, page.getByTestId("list-tours"));
  });

  test("loads the standalone teams view without the sidebar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/teams");

    await expectStandaloneViewLoaded(page, page.getByTestId("list-teams"));
  });
});

test.describe("Standalone layout", () => {
  test.describe.configure({ mode: "serial" });

  test("shows the app title and the current view title in the header", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/calendar/week");

    await expect(page.getByTestId("standalone-header")).toContainText("MuG Plan");
    await expect(page.getByTestId("standalone-header")).toContainText("Wochenübersicht");
  });

  test("refreshes appointments data from the standalone header", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/appointments");

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/appointments/list")
      && response.request().method() === "GET",
    );

    await page.getByTestId("standalone-refresh").click();
    await responsePromise;
    await expect(page.getByTestId("table-appointments-list")).toBeVisible();
  });
});

test.describe("Standalone edit flows", () => {
  test.describe.configure({ mode: "serial" });

  test("opens and closes project edit from a standalone tab using the created project row", async ({ page }) => {
    const customer = await createCustomerFixture("STR-EDIT-PROJ-CUST");
    const project = await createProjectFixture({
      prefix: "STR-EDIT-PROJ",
      customerId: customer.id,
      name: "Standalone Projekt Editierbar",
    });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(6),
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-projekte-open-tab");
    const projectRow = await findProjectEntry(popup, project);

    await expectStandaloneViewLoaded(popup, projectRow);
    await projectRow.dblclick();

    await expect(popup.getByTestId("project-form-main-column")).toBeVisible();
    await expect(popup.getByTestId("input-project-name")).toHaveValue(project.name);
    await expect(popup.getByTestId("input-project-order-number")).toHaveValue(project.orderNumber ?? "");

    await popup.getByTestId("button-close-project").click();

    await expect(popup.getByTestId("project-form-main-column")).toHaveCount(0);
    await expect(projectRow).toBeVisible();
    await expectNoStandaloneFallbacks(popup);
    await popup.close();
  });

  test("opens and closes appointment edit from a standalone week tab using the created appointment card", async ({ page }) => {
    const customer = await createCustomerFixture("STR-EDIT-WEEK-CUST");
    const project = await createProjectFixture({
      prefix: "STR-EDIT-WEEK-PROJ",
      customerId: customer.id,
      name: "Standalone Kalender Editierbar",
    });
    const targetDate = getRelativeBerlinDate(2);
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: targetDate,
    });

    await loginAsAdmin(page);
    const popup = await openStandalonePopup(page, "nav-wochenuebersicht-open-tab");
    const appointmentCard = popup.getByTestId(`week-appointment-panel-${appointment.id}`);

    await expectStandaloneViewLoaded(popup, appointmentCard);
    await appointmentCard.dblclick();

    await expect(popup.getByTestId("appointment-form-main-column")).toBeVisible();
    await expect(popup.getByTestId("input-start-date")).toHaveValue(targetDate);

    await popup.getByTestId("button-close-appointment").click();

    await expect(popup.getByTestId("appointment-form-main-column")).toHaveCount(0);
    await expect(appointmentCard).toBeVisible();
    await expectNoStandaloneFallbacks(popup);
    await popup.close();
  });
});

test.describe("Standalone not found", () => {
  test.describe.configure({ mode: "serial" });

  test("falls back to the 404 page for unknown standalone routes", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/standalone/unknown");

    await expect(page.getByText("404 Page Not Found")).toBeVisible();
  });
});
