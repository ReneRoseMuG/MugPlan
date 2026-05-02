/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin sieht gesiedete Feiertage im Stammdaten-Tab Feiertage.
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
  await page.getByTestId("nav-stammdaten").click();
  await page.getByTestId("tab-trigger-calendar-markers").click();
  await expect(page.getByTestId("tab-content-calendar-markers")).toBeVisible();
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
  await expect(page.getByTestId("week-day-header-2026-05-01")).toContainText(expectedName);
  await expect(page.getByTestId("week-day-header-2026-05-01")).not.toContainText("FT");
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

  await page.goto("/standalone/calendar/month");
  await expect(page.getByTestId("month-sheet-day-2026-05-01")).toContainText("Maifeiertag Browser");
  await expect(page.getByTestId("month-sheet-day-2026-05-01")).not.toContainText("FT");
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
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-200/);

  await setMarkerStyle(page, "subtle");
  await page.reload();
  await expectWeekHolidayVisible(page, "Maifeiertag");
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-50/);

  await setMarkerStyle(page, "standard");
  await page.reload();
  await expectWeekHolidayVisible(page, "Maifeiertag");
  await expect(page.getByTestId("week-day-header-2026-05-01").locator("> div")).toHaveClass(/bg-red-100/);
});
