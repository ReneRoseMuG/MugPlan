/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin sieht gesiedete Feiertage im Einstellungsbereich Feiertage.
 * - Bearbeiten, Deaktivieren und Reaktivieren wirken bis in Wochen- und Monatskalender.
 * - Der globale Visualisierungs-Toggle speichert und verändert die Hintergrundintensität.
 * - Kalender zeigen den Feiertagsnamen statt `FT`.
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

const suitePath = "tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts";

async function ensureHolidaySeed(page: Page) {
  const response = await page.request.post("/api/admin/system-seed", {
    data: { selectedKeys: ["calendarMarker:public-holidays"] },
  });
  expect(response.ok()).toBe(true);
}

async function openCalendarMarkersTab(page: Page) {
  await page.getByTestId("nav-einstellungen").click();
  await page.getByTestId("nav-item-feiertage").click();
  await expect(page.getByTestId("settings-pane-feiertage")).toBeVisible();
}

async function editHolidayActiveState(page: Page, expectedName: string, nextActive: boolean) {
  const row = page.getByRole("row").filter({ hasText: expectedName }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Bearbeiten" }).click();
  const switchControl = page.getByTestId("switch-calendar-marker-active");
  const isChecked = await switchControl.getAttribute("data-state") === "checked";
  if (isChecked !== nextActive) {
    await switchControl.click();
  }
  await page.getByTestId("button-save-calendar-marker").click();
}

async function setMarkerStyle(page: Page, value: "subtle" | "standard" | "highlighted") {
  const resolved = await page.request.get("/api/user-settings/resolved");
  const settings = await resolved.json() as Array<{ key: string; globalVersion?: number }>;
  const setting = settings.find((entry) => entry.key === "calendar.markerVisualizationStyle");
  await page.request.patch("/api/user-settings", {
    data: {
      key: "calendar.markerVisualizationStyle",
      scopeType: "GLOBAL",
      version: setting?.globalVersion ?? 1,
      value,
    },
  });
}

async function expectWeekHolidayVisible(page: Page, expectedName: string) {
  await page.goto("/standalone/calendar/week?kw=18&year=2026");
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  const dayHeader = page.getByTestId("week-day-header-2026-05-01");
  await expect(dayHeader).toBeVisible();
  const marker = page.getByTestId("calendar-marker-header-2026-05-01");
  await expect(marker).toBeVisible();
  const headerText = await dayHeader.textContent();
  if (!headerText?.includes(expectedName)) {
    await marker.hover();
    await expect(page.getByRole("dialog")).toContainText(new RegExp(expectedName));
  }
}

async function getVisibleMonthKey(page: Page) {
  const testId = await page.locator('section[data-testid^="month-sheet-"]').first().getAttribute("data-testid");
  if (!testId) {
    throw new Error("No visible month sheet found.");
  }
  return testId.replace("month-sheet-", "");
}

async function navigateStandaloneMonthToDate(page: Page, dateKey: string) {
  await page.goto("/standalone/calendar/month");
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();

  for (let step = 0; step < 20; step += 1) {
    const day = page.locator(`[data-testid="month-sheet-day-${dateKey}"][data-month-scope="current"]`);
    if (await day.count()) {
      await expect(day).toBeVisible();
      return;
    }

    const visibleMonth = (await getVisibleMonthKey(page)).slice(0, 7);
    const targetMonth = dateKey.slice(0, 7);
    await page.getByTestId(targetMonth < visibleMonth ? "button-prev" : "button-next").click();
  }

  throw new Error(`Month containing ${dateKey} was not reachable within 20 steps.`);
}

async function forceMarkerWidthAndExpectVariant(page: Page, dateKey: string, widthPx: number, variant: "full" | "ft" | "icon") {
  const marker = page.getByTestId(`calendar-marker-header-${dateKey}`);
  await expect(marker).toBeVisible();
  await marker.evaluate((node, width) => {
    (node as HTMLDivElement).style.width = `${String(width)}px`;
  }, widthPx);
  await expect.poll(async () => marker.getAttribute("data-marker-header-variant")).toBe(variant);
}

test.beforeEach(async () => {
  await resetBrowserSuiteState(suitePath);
});

test("Admin bearbeitet, deaktiviert und reaktiviert gesiedete Feiertage mit Kalenderwirkung", async ({ page }) => {
  await loginAsAdmin(page);
  await ensureHolidaySeed(page);
  await openCalendarMarkersTab(page);

  const row = page.getByRole("row").filter({ hasText: "Maifeiertag" }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByTestId("input-calendar-marker-name").fill("Maifeiertag Browser");
  await page.getByTestId("button-save-calendar-marker").click();
  await expect(page.getByRole("row").filter({ hasText: "Maifeiertag Browser" }).first()).toBeVisible();

  await editHolidayActiveState(page, "Maifeiertag Browser", false);
  await expect(page.getByRole("row").filter({ hasText: "Maifeiertag Browser" }).first()).toContainText("Inaktiv");

  await page.goto("/standalone/calendar/week?kw=18&year=2026");
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await expect(page.getByTestId("week-day-header-2026-05-01")).not.toContainText("Maifeiertag Browser");

  await page.goto("/");
  await openCalendarMarkersTab(page);
  await editHolidayActiveState(page, "Maifeiertag Browser", true);
  await expect(page.getByRole("row").filter({ hasText: "Maifeiertag Browser" }).first()).toContainText("Aktiv");

  await expectWeekHolidayVisible(page, "Maifeiertag Browser");

  await navigateStandaloneMonthToDate(page, "2026-05-01");
  const monthMarker = page.getByTestId("calendar-marker-header-2026-05-01");
  await expect.poll(async () => monthMarker.getAttribute("data-marker-header-variant")).toBe("ft");
  await monthMarker.hover();
  await expect(page.getByText("Maifeiertag Browser", { exact: true }).last()).toBeVisible();
});

test("Visualisierungs-Toggle steuert globale Hintergrundintensität", async ({ page }) => {
  await loginAsAdmin(page);
  await ensureHolidaySeed(page);
  await openCalendarMarkersTab(page);

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/user-settings") && response.request().method() === "PATCH"),
    page.getByTestId("button-calendar-marker-visualization-highlighted").click(),
  ]);

  await expectWeekHolidayVisible(page, "Maifeiertag");
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-400/);

  await setMarkerStyle(page, "subtle");
  await page.reload();
  await expectWeekHolidayVisible(page, "Maifeiertag");
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-200/);

  await setMarkerStyle(page, "standard");
  await page.reload();
  await expectWeekHolidayVisible(page, "Maifeiertag");
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-300/);
});

test("Adaptive Feiertagsanzeige schaltet zwischen Volltext, FT und Icon mit Hover um", async ({ page }) => {
  await loginAsAdmin(page);
  await ensureHolidaySeed(page);

  await navigateStandaloneMonthToDate(page, "2026-05-01");

  const marker = page.getByTestId("calendar-marker-header-2026-05-01");
  await forceMarkerWidthAndExpectVariant(page, "2026-05-01", 180, "full");

  await forceMarkerWidthAndExpectVariant(page, "2026-05-01", 44, "ft");
  await marker.hover();
  await expect(page.getByRole("dialog")).toContainText(/Maifeiertag/);

  await forceMarkerWidthAndExpectVariant(page, "2026-05-01", 20, "icon");
  await marker.hover();
  await expect(page.getByRole("dialog")).toContainText(/Maifeiertag/);
});
