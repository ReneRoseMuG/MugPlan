/**
 * Test Scope:
 *
 * Feature: Settings Redesign - Steuerelement-Persistenz im Browser
 *
 * Abgedeckte Regeln:
 * - Datei-Vorschau-Groesse auf "small" setzen, Speichern, Reload -> Wert bleibt "small".
 * - Formular-Sidebar-Breite aendern, Speichern, Reload -> Wert bleibt erhalten.
 * - 2FA-Toggle umschalten, Speichern, Reload -> Wert bleibt erhalten (Sicherheits-Pane).
 * - Kalender-Wochenende-Spaltenbreite aendern, Speichern, Reload -> Wert bleibt erhalten.
 * - Nach jedem Speichern erscheint eine "Gespeichert."-Meldung.
 *
 * Fehlerfaelle:
 * - Gespeicherte Werte verschwinden nach Reload.
 * - Die "Gespeichert."-Meldung erscheint nicht nach erfolgreicher Mutation.
 * - Das Speichern schlaegt mit einem Versionsfehler oder Netzwerkfehler fehl.
 *
 * Ziel:
 * End-to-End-Persistenz der wichtigsten Steuerelemente aus allen vier Panes absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openSettings(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-einstellungen").click();
  await expect(page.getByTestId("settings-landing-page")).toBeVisible();
}

test.describe("Settings Redesign: Steuerelement-Persistenz", () => {
  test("Oberflaeche: Datei-Vorschau-Groesse auf small setzen und persistieren", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();

    await page.getByTestId("select-setting-attachmentPreviewSize").selectOption("small");
    await page.getByTestId("button-save-attachmentPreviewSize").click();
    await expect(page.locator("[data-testid='setting-row-attachmentPreviewSize']")).toContainText("Gespeichert.");

    await page.reload();
    await page.getByTestId("nav-einstellungen").click();
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();
    await expect(page.getByTestId("select-setting-attachmentPreviewSize")).toHaveValue("small");

    // Zuruecksetzen auf large fuer Folgetests
    await page.getByTestId("select-setting-attachmentPreviewSize").selectOption("large");
    await page.getByTestId("button-save-attachmentPreviewSize").click();
    await expect(page.locator("[data-testid='setting-row-attachmentPreviewSize']")).toContainText("Gespeichert.");
  });

  test("Oberflaeche: Formular-Sidebar-Breite aendern und persistieren", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();

    await page.getByTestId("input-setting-entityFormShellSidebarWidthPx").fill("320");
    await page.getByTestId("button-save-entityFormShellSidebarWidthPx").click();
    await expect(page.locator("[data-testid='setting-row-entityFormShellSidebarWidthPx']")).toContainText("Gespeichert.");

    await page.reload();
    await page.getByTestId("nav-einstellungen").click();
    await expect(page.getByTestId("settings-pane-oberflaeche")).toBeVisible();
    await expect(page.getByTestId("input-setting-entityFormShellSidebarWidthPx")).toHaveValue("320");

    // Zuruecksetzen auf 360
    await page.getByTestId("input-setting-entityFormShellSidebarWidthPx").fill("360");
    await page.getByTestId("button-save-entityFormShellSidebarWidthPx").click();
    await expect(page.locator("[data-testid='setting-row-entityFormShellSidebarWidthPx']")).toContainText("Gespeichert.");
  });

  test("Sicherheit: 2FA-Toggle umschalten und persistieren", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-sicherheit").click();
    await expect(page.getByTestId("settings-pane-sicherheit")).toBeVisible();

    const toggle = page.getByTestId("switch-setting-auth-two-factor-enabled");
    const initialChecked = await toggle.isChecked();
    await toggle.click();
    await page.getByTestId("button-save-auth-two-factor-enabled").click();
    await expect(page.locator("[data-testid='setting-row-auth-two-factor-enabled']")).toContainText("Gespeichert.");

    await page.reload();
    await page.getByTestId("nav-einstellungen").click();
    await page.getByTestId("nav-item-sicherheit").click();
    await expect(page.getByTestId("settings-pane-sicherheit")).toBeVisible();
    await expect(page.getByTestId("switch-setting-auth-two-factor-enabled")).toBeChecked({ checked: !initialChecked });

    // Zuruecksetzen auf initialen Wert
    await page.getByTestId("switch-setting-auth-two-factor-enabled").click();
    await page.getByTestId("button-save-auth-two-factor-enabled").click();
    await expect(page.locator("[data-testid='setting-row-auth-two-factor-enabled']")).toContainText("Gespeichert.");
  });

  test("Kalender: Wochenende-Spaltenbreite aendern und persistieren", async ({ page }) => {
    await openSettings(page);
    await page.getByTestId("nav-item-kalender").click();
    await expect(page.getByTestId("settings-pane-kalender")).toBeVisible();

    await page.getByTestId("input-setting-calendarWeekendColumnPercent").fill("25");
    await page.getByTestId("button-save-calendarWeekendColumnPercent").click();
    await expect(page.locator("[data-testid='setting-row-calendarWeekendColumnPercent']")).toContainText("Gespeichert.");

    await page.reload();
    await page.getByTestId("nav-einstellungen").click();
    await page.getByTestId("nav-item-kalender").click();
    await expect(page.getByTestId("settings-pane-kalender")).toBeVisible();
    await expect(page.getByTestId("input-setting-calendarWeekendColumnPercent")).toHaveValue("25");

    // Zuruecksetzen auf 33
    await page.getByTestId("input-setting-calendarWeekendColumnPercent").fill("33");
    await page.getByTestId("button-save-calendarWeekendColumnPercent").click();
    await expect(page.locator("[data-testid='setting-row-calendarWeekendColumnPercent']")).toContainText("Gespeichert.");
  });
});
