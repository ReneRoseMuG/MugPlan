/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Tour-PLZ-Plan ist über die Sidebar erreichbar und lädt Vorschläge für eine eingegebene PLZ.
 * - Die Vorschlagsansicht zeigt die passende Tour und ihre Wochenkarte sichtbar an.
 * - Ein Klick auf die Tagesspalte öffnet die Terminerstellung mit vorbelegtem Datum und vorbelegter Tour.
 *
 * Fehlerfälle:
 * - Der neue Navigationseintrag fehlt oder die Vorschlagsansicht lädt nicht.
 * - Passende Tour-Vorschläge bleiben trotz planbarer Daten unsichtbar.
 * - Die Terminanlage übernimmt Datum oder Tour aus dem Vorschlag nicht korrekt.
 *
 * Ziel:
 * Den zentralen Nutzerfluss des Tour-PLZ-Plans browserseitig absichern.
 */
import { expect, test } from "@playwright/test";
import { addDays, format, parseISO, startOfISOWeek } from "date-fns";

import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

test("loads PLZ suggestions and opens appointment creation with date and tour prefill", async ({ page }) => {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "TPLZ-BR",
    postalCode: "26135",
    city: "Oldenburg",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "TPLZ-BR",
    customerId: customer.id,
    name: "Tour PLZ Browser Projekt",
  });
  const tour = await createTourFixture("#225588");
  const appointmentDate = format(
    addDays(startOfISOWeek(parseISO(getRelativeBerlinDate(0))), 8),
    "yyyy-MM-dd",
  );
  const appointmentWeekStartDate = format(startOfISOWeek(parseISO(appointmentDate)), "yyyy-MM-dd");

  await createAppointmentFixture({
    projectId: project.id,
    startDate: appointmentDate,
    startTime: "08:30:00",
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-tour-plz-plan").click();
  await expect(page.getByTestId("tour-postal-plan-view")).toBeVisible();

  await page.getByTestId("input-tour-postal-plan-postal-code").fill("26135");
  await page.getByTestId("button-tour-postal-plan-search").click();

  await expect(page.getByText(tour.name, { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId(`tour-postal-plan-week-${appointmentWeekStartDate}`)).toBeVisible();

  await page.getByTestId(`button-tour-postal-plan-create-${appointmentDate}-tour-${tour.id}`).click();

  await expect(page.getByTestId("input-start-date")).toHaveValue(appointmentDate);
  await expect(page.getByText(tour.name, { exact: false }).first()).toBeVisible();
});
