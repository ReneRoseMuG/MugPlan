/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der neue Tourenplan-Report nutzt echte Tour-, Termin-, Artikel- und Notizdaten im Browser.
 * - Tagfaelle Reklamation, Sondermass, Messe und Neutral erscheinen als eigene Karten.
 * - Shortcodes, schmale Seitenchrome sowie Admin-Optionen fuer Druckmodus und Orientierung wirken auf die Vorschau.
 *
 * Fehlerfaelle:
 * - Der Tourenplan-Block fehlt oder kann mit echten Daten keine Vorschau laden.
 * - Produkt-/Komponentenlisten, Tags oder printNotes werden im Vorschau-Workflow nicht korrekt angezeigt.
 * - Seitenchrome, Druckmodus oder Orientierung bleiben wirkungslos.
 *
 * Ziel:
 * Den neuen Tourenplan-Report Ende-zu-Ende mit echten Testdaten regressionssicher absichern.
 */
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../server/db";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import * as customerNotesService from "../../server/services/customerNotesService";
import * as projectNotesService from "../../server/services/projectNotesService";
import {
  MANAGED_MESSE_TAG_NAME,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
} from "../../shared/appointmentCancellation";
import { tags, type Tag } from "../../shared/schema";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixtureWithOverrides,
  createProjectOrderItemFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function ensureTag(name: string, color: string): Promise<Tag> {
  const [existing] = await db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  const created = await createExactTagFixture(name, color);
  const [resolved] = await db
    .select()
    .from(tags)
    .where(eq(tags.id, created.id))
    .limit(1);

  if (!resolved) {
    throw new Error(`Expected tag ${name} to exist.`);
  }

  return resolved;
}

test("renders the Tourenplan report with real tag, shortcode and print-note data", async ({ page }) => {
  const tour = await createTourFixture("#2266aa");
  const reklamationTag = await ensureTag(MANAGED_REPORT_EXCLUSION_TAG_NAME, "#f97316");
  const sondermassTag = await ensureTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
  const messeTag = await ensureTag(MANAGED_MESSE_TAG_NAME, "#4a7c3f");

  const employeeA = await createEmployeeFixtureWithOverrides({ firstName: "Roy", lastName: "Herold" });
  const employeeB = await createEmployeeFixtureWithOverrides({ firstName: "Dirk", lastName: "Winter" });

  const monday = getRelativeBerlinDate(1);
  const tuesday = getRelativeBerlinDate(2);
  const nextMonday = getRelativeBerlinDate(8);
  const nextTuesday = getRelativeBerlinDate(9);

  const neutralCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TP-NEUTRAL",
    fullName: "Marschak, Beate",
    phone: "+49 340 1000",
    postalCode: "06809",
    city: "Roitzsch",
    country: "Deutschland",
  });
  const neutralProject = await createProjectFixtureWithOverrides({
    prefix: "TP-NEUTRAL-PROJ",
    customerId: neutralCustomer.id,
    name: "XL Vorraum",
    descriptionMd: "<p>—</p>",
  });
  const neutralAppointment = await createAppointmentFixture({
    projectId: neutralProject.id,
    startDate: monday,
    endDate: monday,
    tourId: tour.id,
    employeeIds: [employeeA.id],
  });

  const specialCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TP-SONDER",
    fullName: "Syring, Rene",
    phone: "+49 340 2000",
    postalCode: "06842",
    city: "Dessau-Rosslau",
    country: "Deutschland",
  });
  const specialProject = await createProjectFixtureWithOverrides({
    prefix: "TP-SONDER-PROJ",
    customerId: specialCustomer.id,
    name: "Premium IV",
    descriptionMd: "<p>Bitte Einfahrt freihalten. Kran erforderlich.</p>",
  });
  const specialOrderNumber = specialProject.projectOrder?.orderNumber ?? specialProject.orderNumber;
  if (!specialOrderNumber) {
    throw new Error("Expected order number for Tourenplan special-measure fixture.");
  }
  const sauna = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "Fasssauna 230",
    shortCode: "FS230",
  });
  const oven = await createComponentFixture({
    categoryName: "Ofen",
    name: "Harvia 20",
    shortCode: "H20",
  });
  const control = await createComponentFixture({
    categoryName: "Steuerung",
    name: "Xenio 3",
    shortCode: "X3",
  });
  const roof = await createComponentFixture({
    categoryName: "Dachvarianten",
    name: "Flachdach",
    shortCode: "FD",
  });
  const window = await createComponentFixture({
    categoryName: "Fenster",
    name: "Panoramafenster",
    shortCode: "PF",
  });
  const door = await createComponentFixture({
    categoryName: "Tuer",
    name: "Glastuer",
    shortCode: "GT",
  });

  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, productId: sauna.id, quantity: 1 });
  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, componentId: oven.id, quantity: 1 });
  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, componentId: control.id, quantity: 1 });
  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, componentId: roof.id, quantity: 1 });
  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, componentId: window.id, quantity: 1 });
  await createProjectOrderItemFixture({ projectId: specialProject.id, orderNumber: specialOrderNumber, componentId: door.id, quantity: 1 });

  await attachProjectTagFixture(specialProject.id, sondermassTag.id);
  const specialAppointment = await createAppointmentFixture({
    projectId: specialProject.id,
    startDate: tuesday,
    endDate: nextMonday,
    tourId: tour.id,
    employeeIds: [employeeA.id, employeeB.id],
  });

  await customerNotesService.createCustomerNote(specialCustomer.id, {
    title: "Vorbesprechung Kunde",
    body: "<p>Kundin erwartet Rueckruf bis Montag.</p>",
    print: true,
    cardColor: "#f97316",
  });
  await projectNotesService.createProjectNote(specialProject.id, {
    title: "Interne Notiz",
    body: "<p>Abnahme durch Herrn Gerber.</p>",
    print: true,
    cardColor: "#94a3b8",
  });
  await appointmentNotesService.createAppointmentNote(specialAppointment!.id, {
    title: "Montagehinweis",
    body: "<p>Scharnierkit mitbringen.</p>",
    print: true,
    cardColor: "#4a7c3f",
  });

  const reklCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TP-REKL",
    fullName: "Herfurth, Julia",
    phone: "+49 3375 3000",
    postalCode: "15712",
    city: "Koenigs Wusterhausen",
    country: "Deutschland",
  });
  const reklProject = await createProjectFixtureWithOverrides({
    prefix: "TP-REKL-PROJ",
    customerId: reklCustomer.id,
    name: "Reklamationsprojekt",
    descriptionMd: "<p>Tuer klemmt nach Montage.</p>",
  });
  const reklAppointment = await createAppointmentFixture({
    projectId: reklProject.id,
    startDate: nextTuesday,
    endDate: nextTuesday,
    tourId: tour.id,
    employeeIds: [employeeB.id],
  });
  await attachAppointmentTagFixture(reklAppointment!.id, reklamationTag.id);
  await appointmentNotesService.createAppointmentNote(reklAppointment!.id, {
    title: "Reklamationsnotiz",
    body: "<p>Bereits telefonisch besprochen.</p>",
    print: true,
    cardColor: "#f97316",
  });

  const messeCustomer = await createCustomerFixtureWithOverrides({
    prefix: "TP-MESSE",
    fullName: "Meise, Cornelia",
    phone: "+49 30 4000",
    postalCode: "12209",
    city: "Berlin",
    country: "Deutschland",
  });
  const messeProject = await createProjectFixtureWithOverrides({
    prefix: "TP-MESSE-PROJ",
    customerId: messeCustomer.id,
    name: "Messestand Berlin",
    descriptionMd: "<p>Aufbau Halle 3, Stand B-14.</p>",
  });
  const messeAppointment = await createAppointmentFixture({
    projectId: messeProject.id,
    startDate: nextMonday,
    endDate: nextMonday,
    tourId: tour.id,
    employeeIds: [employeeA.id],
  });
  await attachAppointmentTagFixture(messeAppointment!.id, messeTag.id);

  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();

  await expect(page.getByTestId("reports-tourenplan-config-panel")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-print-mode-farbdruck")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-print-mode-spardruck")).toBeVisible();

  await page.getByTestId("select-reports-tourenplan-tour").click();
  await page.getByRole("option", { name: tour.name }).click();
  await page.getByTestId("reports-tourenplan-from-date").fill(monday);
  await page.getByTestId("reports-tourenplan-to-date").fill(nextTuesday);

  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const firstPage = page.getByTestId("tourenplan-print-page-1");
  await expect(firstPage).toContainText("Tour Alpha");
  await expect(firstPage).toContainText("Seite 1");
  await expect(firstPage).not.toContainText("Tourenplan");

  await expect(page.getByTestId(`tourenplan-print-page-1-appointment-${specialAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "sondermass");
  await expect(page.getByTestId(`tourenplan-print-page-1-appointment-${reklAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "reklamation");
  await expect(page.getByTestId(`tourenplan-print-page-1-appointment-${messeAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "messe");
  await expect(page.getByTestId(`tourenplan-print-page-1-appointment-${neutralAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "neutral");

  await expect(firstPage).toContainText("Harvia 20");
  await expect(firstPage).toContainText("Xenio 3");
  await expect(firstPage).toContainText("Flachdach");
  await expect(firstPage).toContainText("Panoramafenster");
  await expect(firstPage).toContainText("Glastuer");
  await expect(firstPage).not.toContainText("Fasssauna 230");
  await expect(firstPage).toContainText("Vorbesprechung Kunde");
  await expect(firstPage).toContainText("Interne Notiz");
  await expect(firstPage).toContainText("Montagehinweis");
  await expect(firstPage).toContainText("Roy H.");
  await expect(firstPage).toContainText("Dirk W.");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeHidden();

  await page.getByTestId("checkbox-reports-tourenplan-use-shortcodes").click();
  await page.getByTestId("button-reports-tourenplan-print-mode-spardruck").click();
  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const firstPageShortcodes = page.getByTestId("tourenplan-print-page-1");
  await expect(firstPageShortcodes).toContainText("H20");
  await expect(firstPageShortcodes).toContainText("X3");
  await expect(firstPageShortcodes).toContainText("FD");
  await expect(firstPageShortcodes).toContainText("PF");
  await expect(firstPageShortcodes).toContainText("GT");
  await expect(firstPageShortcodes).not.toContainText("Harvia 20");
  await expect(firstPageShortcodes).not.toContainText("Xenio 3");
  await expect(page.getByTestId(`tourenplan-print-page-1-appointment-${specialAppointment!.id}`)).toHaveAttribute("data-tourenplan-print-mode", "spardruck");

  await expect(page.getByTestId("button-reports-tourenplan-orientation-landscape")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-orientation-portrait")).toBeVisible();
  await page.getByTestId("button-reports-tourenplan-orientation-portrait").click();
  await expect(page.getByTestId("tourenplan-print-page-1")).toHaveAttribute("data-print-orientation", "portrait");
});
