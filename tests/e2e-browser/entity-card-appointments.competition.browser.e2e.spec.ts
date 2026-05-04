/**
 * Test Scope:
 *
 * Isolationsklasse: B
 * Baseline: core
 * Storage: none
 *
 * Abgedeckte Regeln:
 * - Kunden- und Projektkarten zeigen im Termin-Badge nur die wirklich verknüpften Termine.
 * - Der Hover-Preview zeigt die Zieltermine des fokussierten Cards, nicht die Termine gleichartig aussehender Konkurrenzdaten.
 * - Konkurrenzkarten bleiben gleichzeitig sichtbar, damit die Negativprüfung nicht durch Wegfiltern vorgetäuscht wird.
 *
 * Fehlerfälle:
 * - Terminzähler laufen über ähnliche Fremddaten hinweg zusammen.
 * - Hover-Previews zeigen Termine eines anderen Kunden oder Projekts.
 * - Listenfilter blenden die Konkurrenz aus und verschleiern dadurch eine falsche Badge-Zuordnung.
 *
 * Ziel:
 * Die schwachen Kunden-/Projekt-Footer-Wiring-Tests durch echte Browser-Nachweise mit konkurrierenden Karten ergänzen.
 */
import { expect, test } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { formatDisplayDate } from "../../client/src/lib/date-display-format";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/entity-card-appointments.competition.browser.e2e.spec.ts");
});

test("Kundenkarte zeigt nur eigene Termine trotz gleichnamiger Konkurrenz", async ({ page }) => {
  const targetCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FT31-CUST-TARGET",
    firstName: "Klara",
    lastName: "Kartenkonkurrenz",
    email: "klara.kartenkonkurrenz@example.test",
  });
  const distractorCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FT31-CUST-DISTRACTOR",
    firstName: "Dora",
    lastName: "Kartenkonkurrenz",
    email: "dora.kartenkonkurrenz@example.test",
  });
  const targetProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-CUST-PROJ-TARGET",
    customerId: targetCustomer.id,
    name: "Kartenkunden Projekt",
  });
  const distractorProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-CUST-PROJ-DISTRACTOR",
    customerId: distractorCustomer.id,
    name: "Kartenkunden Projekt",
  });

  const targetAppointmentA = await createAppointmentFixture({
    projectId: targetProject.id,
    startDate: getRelativeBerlinDate(1),
  });
  const targetAppointmentB = await createAppointmentFixture({
    projectId: targetProject.id,
    startDate: getRelativeBerlinDate(3),
  });
  const distractorAppointment = await createAppointmentFixture({
    projectId: distractorProject.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await page.locator("#customer-filter-last-name").fill(targetCustomer.lastName ?? "");

  const targetCard = page.getByTestId(`customer-card-${targetCustomer.id}`);
  const distractorCard = page.getByTestId(`customer-card-${distractorCustomer.id}`);
  await expect(targetCard).toBeVisible({ timeout: 10_000 });
  await expect(distractorCard).toBeVisible({ timeout: 10_000 });

  await expect(targetCard.getByTestId(`text-customer-planned-appointments-${targetCustomer.id}`)).toContainText("2");
  await expect(distractorCard.getByTestId(`text-customer-planned-appointments-${distractorCustomer.id}`)).toContainText("1");

  await targetCard.getByTestId(`text-customer-planned-appointments-${targetCustomer.id}`).hover();
  await expect(page.getByTestId(`customer-appointment-preview-${targetAppointmentA.id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`customer-appointment-preview-${targetAppointmentB.id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`customer-appointment-preview-${distractorAppointment.id}`)).toHaveCount(0);
});

test("Projektkarte zeigt den nächsten eigenen Termin trotz gleichnamiger Konkurrenz", async ({ page }) => {
  const targetCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FT31-PROJ-CUST-TARGET",
    firstName: "Paula",
    lastName: "Projektkonkurrenz",
    email: "paula.projektkonkurrenz@example.test",
  });
  const distractorCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FT31-PROJ-CUST-DISTRACTOR",
    firstName: "Nina",
    lastName: "Projektkonkurrenz",
    email: "nina.projektkonkurrenz@example.test",
  });
  const targetProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-PROJ-TARGET",
    customerId: targetCustomer.id,
    name: "Kartenprojekt Gleichklang",
  });
  const distractorProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-PROJ-DISTRACTOR",
    customerId: distractorCustomer.id,
    name: "Kartenprojekt Gleichklang",
  });

  const targetNextDate = getRelativeBerlinDate(1);
  const targetLaterDate = getRelativeBerlinDate(4);
  const distractorDate = getRelativeBerlinDate(2);

  await createAppointmentFixture({
    projectId: targetProject.id,
    startDate: targetNextDate,
  });
  await createAppointmentFixture({
    projectId: targetProject.id,
    startDate: targetLaterDate,
  });
  await createAppointmentFixture({
    projectId: distractorProject.id,
    startDate: distractorDate,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.locator("#project-filter-title").fill(targetProject.name);

  const targetCard = page.getByTestId(`project-card-${targetProject.id}`);
  const distractorCard = page.getByTestId(`project-card-${distractorProject.id}`);
  await expect(targetCard).toBeVisible({ timeout: 10_000 });
  await expect(distractorCard).toBeVisible({ timeout: 10_000 });

  await expect(targetCard.getByTestId(`text-project-next-appointment-${targetProject.id}`)).toContainText(formatDisplayDate(targetNextDate));
  await expect(distractorCard.getByTestId(`text-project-next-appointment-${distractorProject.id}`)).toContainText(formatDisplayDate(distractorDate));
  await expect(targetCard.getByTestId(`text-project-next-appointment-${targetProject.id}`)).not.toContainText(formatDisplayDate(targetLaterDate));

  await expect(targetCard.getByTestId(`text-project-planned-appointments-${targetProject.id}`)).toHaveCount(0);
  await expect(distractorCard.getByTestId(`text-project-planned-appointments-${distractorProject.id}`)).toHaveCount(0);
});
