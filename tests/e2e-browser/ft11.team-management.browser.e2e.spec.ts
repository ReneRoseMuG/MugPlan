/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Entfernen von Team-Mitgliedern im Bearbeitungsformular wird beim Speichern persistiert.
 * - Die Hauptansicht der Team-Karte aktualisiert sich nach dem Speichern ohne stale Mitglieder.
 *
 * Fehlerfaelle:
 * - Entfernte Mitarbeiter erscheinen nach dem Speichern weiter auf der Team-Karte.
 * - Beim erneuten Oeffnen des Teamformulars tauchen bereits entfernte Mitarbeiter wieder auf.
 *
 * Ziel:
 * Den sichtbaren FT11-Workflow fuer Team-Mitglied entfernen -> speichern -> Hauptansicht erneut oeffnen browserseitig regressionssicher absichern.
 */
import { expect, test } from "@playwright/test";

import { assignEmployeesToTeam } from "../../server/services/teamEmployeesService";
import { createEmployeeFixture, createTeamFixture } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("removes team members persistently and refreshes the team card in the main view", async ({ page }) => {
  const team = await createTeamFixture("#2a7f62");
  const remainingEmployee = await createEmployeeFixture("FT11-BROWSER-KEEP");
  const removedEmployee = await createEmployeeFixture("FT11-BROWSER-REMOVE");

  await assignEmployeesToTeam(team.id, [
    { employeeId: remainingEmployee.id, version: remainingEmployee.version },
    { employeeId: removedEmployee.id, version: removedEmployee.version },
  ]);

  await loginAsAdmin(page);
  await page.getByTestId("nav-teams").click();

  const card = page.getByTestId(`card-team-${team.id}`);
  await expect(card.getByTestId(`text-team-member-${remainingEmployee.id}`)).toBeVisible();
  await expect(card.getByTestId(`text-team-member-${removedEmployee.id}`)).toBeVisible();

  await card.dblclick();
  await expect(page.getByTestId(`badge-team-member-${remainingEmployee.id}`)).toBeVisible();
  await expect(page.getByTestId(`badge-team-member-${removedEmployee.id}`)).toBeVisible();

  await page.getByTestId(`badge-team-member-${removedEmployee.id}-remove`).click();
  await expect(page.getByTestId(`badge-team-member-${removedEmployee.id}`)).toHaveCount(0);
  await page.getByTestId("button-save-team").click();

  await expect(page.getByTestId("button-new-team")).toBeVisible();
  await expect(card.getByTestId(`text-team-member-${remainingEmployee.id}`)).toBeVisible();
  await expect(card.getByTestId(`text-team-member-${removedEmployee.id}`)).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${removedEmployee.id}`);
    const payload = await response.json();
    return payload.employee.teamId;
  }).toBeNull();

  await card.dblclick();
  await expect(page.getByTestId(`badge-team-member-${remainingEmployee.id}`)).toBeVisible();
  await expect(page.getByTestId(`badge-team-member-${removedEmployee.id}`)).toHaveCount(0);
});
