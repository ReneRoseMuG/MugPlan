/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Terminlisten-Zeitraum-Picker arbeitet gegen ein fest eingefrorenes Heute reproduzierbar.
 * - Alle/Geplante unterscheiden mit echten historischen, heutigen und zukünftigen Terminen korrekt.
 * - Datum-von/bis filtert die reale Ergebnismenge sichtbar.
 * - KW-Eingaben blockieren KW 0, KW 53 im 52-Wochen-Jahr und KW 70.
 * - KW 53 bleibt in einem echten 53-Wochen-Jahr zulässig.
 *
 * Fehlerfaelle:
 * - Der Picker driftet gegen das Laufzeitdatum und liefert je nach Tag andere Ergebnisse.
 * - Datum- oder KW-Eingaben lassen unzulässige Wochen still zu.
 * - KW 53 wird in Kurzjahren akzeptiert oder in Langjahren fälschlich verworfen.
 *
 * Ziel:
 * Den Terminlisten-Zeitraum mit festen Referenzdaten, echten Terminen und jahresabhängigen KW-Grenzen browserseitig regressionssicher absichern.
 */
import { expect, test, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createCustomerFixture,
  createProjectFixtureWithOverrides,
  createRawAppointmentFixture,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

async function freezeBrowserNow(page: Page, fixedIso: string) {
  await page.addInitScript(({ nowIso }) => {
    const fixedNow = new Date(nowIso).valueOf();
    const RealDate = Date;
    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(fixedNow);
          return;
        }
        super(...args);
      }

      static now() {
        return fixedNow;
      }

      static parse(value: string) {
        return RealDate.parse(value);
      }

      static UTC(...args: Parameters<typeof Date.UTC>) {
        return RealDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(MockDate, RealDate);
    // @ts-expect-error test-only Date override in browser context
    window.Date = MockDate;
  }, { nowIso: fixedIso });
}

async function ensurePeriodPickerOpen(page: Page) {
  const allScopeToggle = page.getByTestId("toggle-appointments-scope-all");
  if (await allScopeToggle.isVisible()) return;
  await page.getByTestId("button-appointment-period-picker").click();
  await expect(allScopeToggle).toBeVisible();
}

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts");
});

test("filters with a fixed 2024 reference date and rejects impossible kw values in a 52-week year", async ({ page }) => {
  await freezeBrowserNow(page, "2024-06-12T10:00:00.000Z");

  const customer = await createCustomerFixture("FT04-PERIOD-2024-CUST");
  const projectToken = "FT04 Period 2024";
  const pastProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-PERIOD-2024-PAST",
    customerId: customer.id,
    name: `${projectToken} Past`,
    orderNumber: "52401",
  });
  const todayProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-PERIOD-2024-TODAY",
    customerId: customer.id,
    name: `${projectToken} Today`,
    orderNumber: "52402",
  });
  const futureProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-PERIOD-2024-FUTURE",
    customerId: customer.id,
    name: `${projectToken} Future`,
    orderNumber: "52403",
  });
  const distractorProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-PERIOD-2024-OTHER",
    customerId: customer.id,
    name: "FT04 Other 2024 Control",
    orderNumber: "52499",
  });
  await createRawAppointmentFixture({
    projectId: pastProject.id,
    startDate: "2024-06-10",
    title: "FT04 Period 2024 Past",
  });
  await createRawAppointmentFixture({
    projectId: todayProject.id,
    startDate: "2024-06-12",
    title: "FT04 Period 2024 Today",
  });
  await createRawAppointmentFixture({
    projectId: futureProject.id,
    startDate: "2024-06-17",
    title: "FT04 Period 2024 Future",
  });
  await createRawAppointmentFixture({
    projectId: distractorProject.id,
    startDate: "2024-06-12",
    title: "FT04 Period 2024 Distractor",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();

  const rows = page.getByTestId("table-appointments-list").locator("tbody tr");
  await page.locator("#appointments-filter-project-title").fill(projectToken);
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: todayProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: distractorProject.name })).toHaveCount(0);

  await ensurePeriodPickerOpen(page);
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: todayProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);

  await page.getByTestId("input-appointment-period-from").fill("2024-06-12");
  await page.getByTestId("input-appointment-period-from").blur();
  await page.getByTestId("input-appointment-period-to").fill("2024-06-12");
  await page.getByTestId("input-appointment-period-to").blur();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: todayProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(0);

  await page.getByTestId("input-appointment-period-to").fill("2024-06-17");
  await page.getByTestId("input-appointment-period-to").blur();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: todayProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);

  await page.getByTestId("toggle-appointment-period-calendarWeek").click();
  const kwStartInput = page.getByTestId("input-appointment-period-kw-start");
  const initialKwValue = await kwStartInput.inputValue();

  await kwStartInput.fill("0");
  await expect(kwStartInput).toHaveValue(initialKwValue);

  await kwStartInput.fill("53");
  await expect(kwStartInput).toHaveValue(initialKwValue);

  await kwStartInput.fill("70");
  await expect(kwStartInput).toHaveValue(initialKwValue);
});

test("accepts kw 53 in a fixed 2026 reference date with a real 53-week year", async ({ page }) => {
  await freezeBrowserNow(page, "2026-12-28T10:00:00.000Z");

  const customer = await createCustomerFixture("FT04-PERIOD-2026-CUST");
  const project = await createProjectFixtureWithOverrides({
    prefix: "FT04-PERIOD-2026-PROJ",
    customerId: customer.id,
    name: "FT04 Period 2026",
    orderNumber: "55301",
  });

  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: "2026-12-28",
    title: "FT04 Period 2026 Start",
  });
  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: "2027-01-02",
    title: "FT04 Period 2026 End",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();

  const rows = page.getByTestId("table-appointments-list").locator("tbody tr");
  await page.locator("#appointments-filter-project-title").fill("FT04 Period 2026");
  await expect(rows).toHaveCount(2);

  await ensurePeriodPickerOpen(page);
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await page.getByTestId("toggle-appointment-period-calendarWeek").click();

  const kwStartInput = page.getByTestId("input-appointment-period-kw-start");
  await expect(kwStartInput).toHaveValue("53");

  await kwStartInput.fill("53");
  await expect(kwStartInput).toHaveValue("53");

  await page.getByTestId("button-appointment-period-kw-start-up").click();
  await expect(kwStartInput).toHaveValue("53");
  await expect(page.getByTestId("appointment-period-summary")).toContainText("KW 53");
});
