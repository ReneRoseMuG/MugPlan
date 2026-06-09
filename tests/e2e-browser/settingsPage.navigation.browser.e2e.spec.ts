/**
 * Test Scope:
 *
 * Feature: Settings Redesign - Sidebar-Navigation im Browser
 *
 * Abgedeckte Regeln:
 * - Als Admin ist die Einstellungsseite ueber den Sidebar-Link erreichbar.
 * - Die Sidebar-Navigation zeigt alle vier Eintraege.
 * - Klick auf "Kalender" zeigt den Kalender-Pane mit seinen Settings.
 * - Klick auf "Sicherheit" zeigt den Sicherheits-Pane mit dem 2FA-Toggle.
 * - Klick auf "Backup & Dump" zeigt den Backup-Pane mit Inner-Tab-Leiste.
 * - Zurueck zu "Oberflaeche" zeigt den Datei-Vorschau-Setting.
 * - Der allgemeine Settings-Einstieg bleibt fuer Browser-Tests ueber einen stabilen Test-Selector erreichbar.
 *
 * Fehlerfaelle:
 * - Ein Nav-Eintrag fehlt oder zeigt keinen Pane-Wechsel.
 * - Der falsche Pane wird nach einem Klick angezeigt.
 * - Sicherheits-Pane zeigt den 2FA-Toggle ohne Anzeige der richtigen Sektion.
 *
 * Ziel:
 * Interaktives Pane-Wechsel-Verhalten im echten Browser absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts");
});

async function openSettings(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-einstellungen").click();
  await expect(page.getByTestId("settings-landing-page")).toBeVisible();
}

test.describe("Settings Redesign: Sidebar-Navigation", () => {
  test("zeigt die Einstellungsseite mit Sidebar-Navigation fuer Admin", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId("settings-nav")).toBeVisible();
  });

  test("rendert alle vier Nav-Eintraege", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId("nav-item-oberflaeche")).toBeVisible();
    await expect(page.getByTestId("nav-item-kalender")).toBeVisible();
    await expect(page.getByTestId("nav-item-sicherheit")).toBeVisible();
    await expect(page.getByTestId("nav-item-backup")).toBeVisible();
  });

  test("zeigt initial den Oberflaeche-Pane mit Datei-Vorschau-Setting", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();
    await expect(page.getByTestId("setting-row-attachmentPreviewSize")).toBeVisible();
  });

  test("wechselt zum Kalender-Pane nach Klick auf Kalender", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-kalender").click();
    await expect(page.getByTestId("settings-pane-kalender")).toBeVisible();
    await expect(page.getByTestId("settings-pane-oberflaeche")).not.toBeVisible();
    await expect(page.getByTestId("setting-row-calendarWeekendColumnPercent")).toBeVisible();
  });

  test("wechselt zum Sicherheits-Pane nach Klick auf Sicherheit", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-sicherheit").click();
    await expect(page.getByTestId("settings-pane-sicherheit")).toBeVisible();
    await expect(page.getByTestId("switch-setting-auth-two-factor-enabled")).toBeVisible();
  });

  test("wechselt zum Backup-Pane nach Klick auf Backup & Dump", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-backup").click();
    await expect(page.getByTestId("settings-pane-backup")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tabs")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-backups")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-dumps")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-import")).toBeVisible();
  });

  test("kehrt zum Oberflaeche-Pane zurueck nach weiterem Klick", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-kalender").click();
    await expect(page.getByTestId("settings-pane-kalender")).toBeVisible();
    await page.getByTestId("nav-item-oberflaeche").click();
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();
    await expect(page.getByTestId("setting-row-attachmentPreviewSize")).toBeVisible();
  });
});
