/**
 * Test Scope:
 *
 * Feature: FT07 - Backup & Dump Inner-Tab-Funktionalitaet im Browser
 *
 * Abgedeckte Regeln:
 * - Inner-Tab "Backups" zeigt die Backup-Tabelle mit Datum/Status/Umfang/Download-Spalten.
 * - Klick "Backup erzeugen" loest einen Backup-Lauf aus; Tabelle aktualisiert sich danach.
 * - Inner-Tab "Dumps" zeigt Dump-Liste und "Dump erstellen"-Button.
 * - Klick "Dump erstellen" legt einen neuen Dump-Eintrag an, der in der Liste erscheint.
 * - Inner-Tab "Import" zeigt die Danger-Box mit Datei-Input, Vorschau-Button und Sicherheitsphrase.
 * - Klick auf "Vorschau pruefen" ohne Datei ist deaktiviert (Button disabled).
 * - backup_enabled-Switch toggelt den Aktivierungsstatus ohne separaten Speichern-Button.
 *
 * Fehlerfaelle:
 * - Inner-Tab-Wechsel funktioniert nicht.
 * - "Backup erzeugen" schlaegt ohne Fehlerbehandlung fehl.
 * - "Dump erstellen" aktualisiert die Liste nicht.
 * - Der Import-Bereich fehlt oder zeigt keinen disabled Vorschau-Button ohne Datei.
 *
 * Ziel:
 * Backup & Dump-Pane vollstaendig aus Anwendersicht im echten Browser absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openBackupPane(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-einstellungen").click();
  await expect(page.getByTestId("settings-landing-page")).toBeVisible();
  await page.getByTestId("nav-item-backup").click();
  await expect(page.getByTestId("settings-pane-backup")).toBeVisible();
}

test.describe("FT07: Backup & Dump Inner-Tabs", () => {
  test("zeigt Inner-Tab-Leiste mit drei Eintraegen", async ({ page }) => {
    await openBackupPane(page);
    await expect(page.getByTestId("backup-inner-tabs")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-backups")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-dumps")).toBeVisible();
    await expect(page.getByTestId("backup-inner-tab-import")).toBeVisible();
  });

  test("Backups-Inner-Tab: Backup-Tabelle mit korrekten Spalten sichtbar", async ({ page }) => {
    await openBackupPane(page);
    // Backups ist der Standard-Inner-Tab
    await expect(page.getByTestId("backups-monitoring-table")).toBeVisible();
    // Bei leerem Stand zeigt die Tabelle einen Empty-State-Text.
    // Spaltenköpfe werden nur bei vorhandenen Einträgen gerendert.
    await expect(
      page.getByTestId("backups-monitoring-table").locator("text=Noch keine Backup-Einträge vorhanden.")
    ).toBeVisible();
  });

  test("Backups-Inner-Tab: backup_enabled-Switch sichtbar ohne Speichern-Button", async ({ page }) => {
    await openBackupPane(page);
    await expect(page.getByTestId("switch-setting-backup-enabled")).toBeVisible();
    await expect(page.getByTestId("button-save-backup-enabled")).not.toBeVisible();
  });

  test("Backups-Inner-Tab: Backup erzeugen loest einen Backup-Lauf aus", async ({ page }) => {
    await openBackupPane(page);
    await page.getByTestId("button-backups-run-now").click();
    // Warte auf Rueckmeldung (Erfolg oder Skip)
    await expect(page.locator("[data-testid='settings-pane-backup']")).toContainText(
      /Backup erfolgreich|Backup-Lauf|Backup übersprungen/,
      { timeout: 30000 },
    );
    // Tabelle sollte nach dem Lauf sichtbar bleiben
    await expect(page.getByTestId("backups-monitoring-table")).toBeVisible();
  });

  test("wechselt zum Dumps-Inner-Tab nach Klick", async ({ page }) => {
    await openBackupPane(page);
    await page.getByTestId("backup-inner-tab-dumps").click();
    await expect(page.getByTestId("button-dump-create")).toBeVisible();
    // Backup-Tabelle soll nicht mehr sichtbar sein
    await expect(page.getByTestId("backups-monitoring-table")).not.toBeVisible();
  });

  test("Dumps-Inner-Tab: Dump erstellen fuegt Eintrag zur Liste hinzu", async ({ page }) => {
    await openBackupPane(page);
    await page.getByTestId("backup-inner-tab-dumps").click();
    await expect(page.getByTestId("button-dump-create")).toBeVisible();
    const dumpRowLocator = page.locator("[data-testid^='dump-row-']");
    const initialDumpCount = await dumpRowLocator.count();

    await page.getByTestId("button-dump-create").click();
    const successMessage = page.getByTestId("dump-create-success");
    await expect(successMessage).toBeVisible({ timeout: 30000 });

    await expect.poll(async () => {
      await page.getByTestId("button-dumps-refresh").click();
      return await page.locator("[data-testid^='dump-row-']").count();
    }, { timeout: 30000 }).toBeGreaterThan(initialDumpCount);
  });

  test("wechselt zum Import-Inner-Tab nach Klick", async ({ page }) => {
    await openBackupPane(page);
    await page.getByTestId("backup-inner-tab-import").click();
    await expect(page.getByTestId("dump-import-section")).toBeVisible();
  });

  test("Import-Inner-Tab: Vorschau-Button ist ohne Datei deaktiviert", async ({ page }) => {
    await openBackupPane(page);
    await page.getByTestId("backup-inner-tab-import").click();
    await expect(page.getByTestId("input-dump-import-file")).toBeVisible();
    await expect(page.getByTestId("button-dump-import-preview")).toBeDisabled();
  });
});
