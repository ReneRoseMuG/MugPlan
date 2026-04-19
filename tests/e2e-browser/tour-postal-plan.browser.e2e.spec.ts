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
  await expect(page.getByTestId(`tour-postal-plan-week-preview-${appointmentWeekStartDate}-tour-${tour.id}`)).toBeVisible();

  await page.getByTestId(`button-tour-postal-plan-create-${appointmentDate}-tour-${tour.id}`).click();

  await expect(page.getByTestId("input-start-date")).toHaveValue(appointmentDate);
  await expect(page.getByText(tour.name, { exact: false }).first()).toBeVisible();
});

test("filters to weeks with a free weekday when the checkbox is enabled", async ({ page }) => {
  const fullCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TPLZ-FULL",
    postalCode: "26135",
    city: "Oldenburg",
  });
  const freeCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TPLZ-FREE",
    postalCode: "26135",
    city: "Oldenburg",
  });
  const fullProject = await createProjectFixtureWithOverrides({
    prefix: "TPLZ-FULL",
    customerId: fullCustomer.id,
    name: "Tour PLZ Voll",
  });
  const freeProject = await createProjectFixtureWithOverrides({
    prefix: "TPLZ-FREE",
    customerId: freeCustomer.id,
    name: "Tour PLZ Frei",
  });
  const fullTour = await createTourFixture("#1d4ed8");
  const freeTour = await createTourFixture("#15803d");
  const weekStart = startOfISOWeek(parseISO(getRelativeBerlinDate(0)));
  const nextWeekStart = addDays(weekStart, 7);

  for (const offset of [0, 1, 2, 3, 4]) {
    await createAppointmentFixture({
      projectId: fullProject.id,
      startDate: format(addDays(nextWeekStart, offset), "yyyy-MM-dd"),
      startTime: "08:30:00",
      tourId: fullTour.id,
    });
  }
  for (const offset of [0, 1, 2, 3]) {
    await createAppointmentFixture({
      projectId: freeProject.id,
      startDate: format(addDays(nextWeekStart, offset), "yyyy-MM-dd"),
      startTime: "08:30:00",
      tourId: freeTour.id,
    });
  }

  await loginAsAdmin(page);
  await page.getByTestId("nav-tour-plz-plan").click();
  await expect(page.getByTestId("tour-postal-plan-view")).toBeVisible();

  await page.getByTestId("input-tour-postal-plan-postal-code").fill("26135");
  await page.getByTestId("button-tour-postal-plan-search").click();

  await expect(page.getByText(fullTour.name, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(freeTour.name, { exact: false }).first()).toBeVisible();

  await page.getByTestId("checkbox-tour-postal-plan-has-free-appointments").check();

  await expect(page.getByText(freeTour.name, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(fullTour.name, { exact: false })).toHaveCount(0);
});
