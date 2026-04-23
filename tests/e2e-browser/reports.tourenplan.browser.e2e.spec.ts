/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der neue Tourenplan-Report nutzt echte Tour-, Termin-, Artikel- und Notizdaten im Browser.
 * - Tagfaelle Reklamation, Sondermass, Messe und Neutral erscheinen als eigene Karten.
 * - Shortcodes, schmale Seitenchrome sowie Admin-Optionen fuer Druckmodus, Schriftgröße und Orientierung wirken auf Vorschau und dedizierten Browser-Print-Pfad identisch.
 *
 * Fehlerfaelle:
 * - Der Tourenplan-Block fehlt oder kann mit echten Daten keine Vorschau laden.
 * - Produkt-/Komponentenlisten, Tags oder printNotes werden im Vorschau-Workflow nicht korrekt angezeigt.
 * - Browser-Print-Root weicht in Inhalt, Orientierung oder KW-Markern von der sichtbaren Vorschauseite ab.
 *
 * Ziel:
 * Den neuen Tourenplan-Report Ende-zu-Ende inklusive Paritaet zwischen sichtbarer Vorschau und echtem Browser-Print regressionssicher absichern.
 */
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../server/db";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import * as customerNotesService from "../../server/services/customerNotesService";
import * as projectNotesService from "../../server/services/projectNotesService";
import {
  MANAGED_MESSE_TAG_NAME,
  MANAGED_COMPLAINT_TAG_NAME,
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

async function readPageSnapshot(locator: ReturnType<import("@playwright/test").Page["locator"]>) {
  return locator.evaluate((element) => {
    const normalize = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
    const markers = Array.from(element.querySelectorAll<HTMLElement>('[data-testid*="-kw-marker-"]')).map((marker) => ({
      testId: marker.getAttribute("data-testid") ?? "",
      top: marker.style.top,
      text: normalize(marker.textContent),
    }));

    return {
      orientation: element.getAttribute("data-print-orientation"),
      text: normalize(element.textContent),
      markers,
    };
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts");
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
  const reklamationTag = await ensureTag(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
  const sondermassTag = await ensureTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
  const messeTag = await ensureTag(MANAGED_MESSE_TAG_NAME, "#4a7c3f");

  const employeeA = await createEmployeeFixtureWithOverrides({ firstName: "Roy", lastName: "Herold" });
  const employeeB = await createEmployeeFixtureWithOverrides({ firstName: "Dirk", lastName: "Winter" });
  const employeeC = await createEmployeeFixtureWithOverrides({ firstName: "Mira", lastName: "Beck" });

  const monday = getRelativeBerlinDate(1);
  const tuesday = getRelativeBerlinDate(2);
  const nextMonday = getRelativeBerlinDate(8);
  const finalPreviewDate = getRelativeBerlinDate(9);

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
    startDate: monday,
    endDate: monday,
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
    employeeIds: [employeeC.id],
  });
  await attachAppointmentTagFixture(messeAppointment!.id, messeTag.id);

  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();

  await expect(page.getByTestId("reports-tourenplan-config-panel")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-print-mode-farbdruck")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-print-mode-spardruck")).toBeVisible();
  await expect(page.getByTestId("select-reports-tourenplan-font-size")).toBeVisible();

  await page.getByTestId("checkbox-reports-tourenplan-all-tours").click();
  await page.getByTestId(`checkbox-reports-tourenplan-tour-${tour.id}`).click();
  await page.getByTestId("reports-tourenplan-from-date").fill(monday);
  await page.getByTestId("reports-tourenplan-to-date").fill(finalPreviewDate);

  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const firstPage = page.getByTestId("tourenplan-print-preview-active-page-shell").getByTestId("tourenplan-print-page-1");
  await expect(page.locator('[data-testid="print-document-root"]')).toHaveCount(1);
  const printRootFirstPage = page.locator('[data-testid="print-document-root"] [data-testid="tourenplan-print-page-1"]').first();
  await expect(firstPage).toContainText(tour.name);
  await expect(firstPage).toContainText("Seite 1");
  await expect(firstPage).not.toContainText("Tourenplan");

  await expect(firstPage.getByTestId(`tourenplan-print-page-1-appointment-${specialAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "sondermass");
  await expect(firstPage.getByTestId(`tourenplan-print-page-1-appointment-${reklAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "reklamation");
  await expect(firstPage.getByTestId(`tourenplan-print-page-1-appointment-${messeAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "messe");
  await expect(firstPage.getByTestId(`tourenplan-print-page-1-appointment-${neutralAppointment!.id}`)).toHaveAttribute("data-tourenplan-tag-kind", "neutral");

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

  const landscapeScreenSnapshot = await readPageSnapshot(firstPage);
  const landscapePrintSnapshot = await readPageSnapshot(printRootFirstPage);
  expect(landscapePrintSnapshot).toEqual(landscapeScreenSnapshot);

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeHidden();

  await page.getByTestId("checkbox-reports-tourenplan-use-shortcodes").click();
  await page.getByTestId("button-reports-tourenplan-print-mode-spardruck").click();
  await page.getByTestId("select-reports-tourenplan-font-size").click();
  await page.getByRole("option", { name: "Large" }).click();
  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const firstPageShortcodes = page.getByTestId("tourenplan-print-preview-active-page-shell").getByTestId("tourenplan-print-page-1");
  await expect(firstPageShortcodes).toContainText("H20");
  await expect(firstPageShortcodes).toContainText("X3");
  await expect(firstPageShortcodes).toContainText("FD");
  await expect(firstPageShortcodes).toContainText("PF");
  await expect(firstPageShortcodes).toContainText("GT");
  await expect(firstPageShortcodes).not.toContainText("Harvia 20");
  await expect(firstPageShortcodes).not.toContainText("Xenio 3");
  await expect(firstPageShortcodes.getByTestId(`tourenplan-print-page-1-appointment-${specialAppointment!.id}`)).toHaveAttribute("data-tourenplan-print-mode", "spardruck");
  await expect(firstPageShortcodes.getByTestId(`tourenplan-print-page-1-appointment-${specialAppointment!.id}`)).toHaveAttribute("data-tourenplan-font-size", "large");

  await expect(page.getByTestId("button-reports-tourenplan-orientation-landscape")).toBeVisible();
  await expect(page.getByTestId("button-reports-tourenplan-orientation-portrait")).toBeVisible();
  await page.getByTestId("button-reports-tourenplan-orientation-portrait").click();
  const portraitPreviewPage = page.getByTestId("tourenplan-print-preview-active-page-shell").getByTestId("tourenplan-print-page-1");
  await expect(portraitPreviewPage).toHaveAttribute("data-print-orientation", "portrait");

  const portraitScreenSnapshot = await readPageSnapshot(portraitPreviewPage);
  const portraitPrintSnapshot = await readPageSnapshot(printRootFirstPage);
  expect(portraitPrintSnapshot).toEqual(portraitScreenSnapshot);

  await page.emulateMedia({ media: "print" });
  await expect(printRootFirstPage).toHaveAttribute("data-print-orientation", "portrait");
  const printRootDisplay = await printRootFirstPage.evaluate((element) => {
    const printRoot = element.closest('[data-testid="print-document-root"]');
    if (!(printRoot instanceof HTMLElement)) {
      throw new Error("Expected dedicated print root for Tourenplan page.");
    }
    return getComputedStyle(printRoot).display;
  });
  expect(printRootDisplay).toBe("block");
  const portraitPrintMediaSnapshot = await readPageSnapshot(printRootFirstPage);
  expect(portraitPrintMediaSnapshot).toEqual(portraitScreenSnapshot);
  await page.emulateMedia({ media: "screen" });
});

test("builds a multi-tour print preview with hard page breaks between tour sections", async ({ page }) => {
  const tourA = await createTourFixture("#335577");
  const tourB = await createTourFixture("#775533");
  const reportDate = getRelativeBerlinDate(15);

  const customerA = await createCustomerFixtureWithOverrides({
    prefix: "TP-MULTI-A-CUST",
    fullName: "Tourabschnitt, Anna",
    postalCode: "26135",
    city: "Oldenburg",
    country: "Deutschland",
  });
  const projectA = await createProjectFixtureWithOverrides({
    prefix: "TP-MULTI-A-PROJ",
    customerId: customerA.id,
    name: "Tourenplan Multi Tour A",
    descriptionMd: "<p>Abschnitt A darf nicht mit Abschnitt B gemischt werden.</p>",
  });
  const appointmentA = await createAppointmentFixture({
    projectId: projectA.id,
    customerId: customerA.id,
    startDate: reportDate,
    tourId: tourA.id,
  });

  const customerB = await createCustomerFixtureWithOverrides({
    prefix: "TP-MULTI-B-CUST",
    fullName: "Tourabschnitt, Bernd",
    postalCode: "28201",
    city: "Bremen",
    country: "Deutschland",
  });
  const projectB = await createProjectFixtureWithOverrides({
    prefix: "TP-MULTI-B-PROJ",
    customerId: customerB.id,
    name: "Tourenplan Multi Tour B",
    descriptionMd: "<p>Abschnitt B muss auf einer neuen Seite beginnen.</p>",
  });
  const appointmentB = await createAppointmentFixture({
    projectId: projectB.id,
    customerId: customerB.id,
    startDate: reportDate,
    tourId: tourB.id,
  });

  const customerWithoutTour = await createCustomerFixtureWithOverrides({
    prefix: "TP-MULTI-OHNE-CUST",
    fullName: "Ohnetour, Carla",
    postalCode: "10115",
    city: "Berlin",
    country: "Deutschland",
  });
  const projectWithoutTour = await createProjectFixtureWithOverrides({
    prefix: "TP-MULTI-OHNE-PROJ",
    customerId: customerWithoutTour.id,
    name: "Tourenplan Multi Ohne Tour",
    descriptionMd: "<p>Ohne Tour steht am Ende der Druckmappe.</p>",
  });
  const appointmentWithoutTour = await createAppointmentFixture({
    projectId: projectWithoutTour.id,
    customerId: customerWithoutTour.id,
    startDate: reportDate,
    tourId: null,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-tourenplan-config-panel")).toBeVisible();

  await page.getByTestId("checkbox-reports-tourenplan-all-tours").click();
  await page.getByTestId(`checkbox-reports-tourenplan-tour-${tourA.id}`).click();
  await page.getByTestId(`checkbox-reports-tourenplan-tour-${tourB.id}`).click();
  await page.getByTestId("checkbox-reports-tourenplan-without-tour").click();
  await page.getByTestId("reports-tourenplan-from-date").fill(reportDate);
  await page.getByTestId("reports-tourenplan-to-date").fill(reportDate);

  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const printPages = page.locator('[data-testid="print-document-root"] [data-testid="print-document-page"]');
  await expect(printPages).toHaveCount(3);
  const pageOne = page.locator('[data-testid="print-document-root"] [data-testid="tourenplan-print-page-1"]').first();
  const pageTwo = page.locator('[data-testid="print-document-root"] [data-testid="tourenplan-print-page-2"]').first();
  const pageThree = page.locator('[data-testid="print-document-root"] [data-testid="tourenplan-print-page-3"]').first();

  await expect(pageOne).toContainText(tourA.name);
  await expect(pageOne.getByTestId(`tourenplan-print-page-1-appointment-${appointmentA!.id}`)).toBeVisible();
  await expect(pageOne).not.toContainText(projectB.name);
  await expect(pageOne).not.toContainText(projectWithoutTour.name);

  await expect(pageTwo).toContainText(tourB.name);
  await expect(pageTwo.getByTestId(`tourenplan-print-page-2-appointment-${appointmentB!.id}`)).toBeVisible();
  await expect(pageTwo).not.toContainText(projectA.name);
  await expect(pageTwo).not.toContainText(projectWithoutTour.name);

  await expect(pageThree).toContainText("Ohne Tour");
  await expect(pageThree.getByTestId(`tourenplan-print-page-3-appointment-${appointmentWithoutTour!.id}`)).toBeVisible();
  await expect(pageThree).not.toContainText(projectA.name);
  await expect(pageThree).not.toContainText(projectB.name);

  await expect(pageOne).toContainText("Seite 1");
  await expect(pageTwo).toContainText("Seite 2");
  await expect(pageThree).toContainText("Seite 3");
});
