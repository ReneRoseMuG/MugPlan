/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Leser sehen in Wochen- und Monatskalender keine UI-Einstiege zur Terminanlage.
 * - Leser können bestehende Kalendereinträge weiter öffnen.
 * - Das Terminformular bleibt für Leser ein reiner Lesedialog ohne Mutationsaktionen.
 *
 * Fehlerfälle:
 * - Kalender zeigen für Leser weiterhin `+`-Buttons zur Terminanlage.
 * - Bestehende Termine lassen sich aus dem Kalender nicht mehr öffnen.
 * - Das Terminformular zeigt für Leser weiterhin Save-/Delete-/Park-/Storno- oder Sidebar-Mutationen.
 *
 * Ziel:
 * Die Leser-Readonly-Regeln für Kalender und Terminformular browserseitig gegen sichtbare Regressionspfade absichern.
 */
import { expect, test } from "@playwright/test";

import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import * as customerAttachmentsService from "../../server/services/customerAttachmentsService";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
import {
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

function buildAttachmentPayload(prefix: string, label: string) {
  return {
    filename: `${prefix}.pdf`,
    originalName: `${label}-${prefix}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `reader-appointment/${prefix}.pdf`,
    version: 1,
  };
}

test.describe("Reader appointments and calendars readonly", () => {
  test.describe.configure({ mode: "serial" });

  let appointmentId: number;
  let appointmentDate: string;
  let customerNumber = "";
  let projectName = "";
  let employeeId = 0;
  let appointmentTagId = 0;
  let customerAttachmentName = "";
  let projectAttachmentName = "";
  let appointmentAttachmentName = "";

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts");

    appointmentDate = getRelativeBerlinDate(2);
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-CAL-CUST",
      firstName: "Lena",
      lastName: "Lesertermin",
      fullName: "Lena Lesertermin",
      company: "Reader Termin GmbH",
      city: "Oldenburg",
      country: "Deutschland",
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: "READER-CAL-PROJ",
      customerId: customer.id,
      name: "Reader Kalender Projekt",
      descriptionMd: "<p>Readonly appointment project</p>",
    });
    const employee = await createEmployeeFixtureWithOverrides({
      prefix: "READER-CAL-EMP",
      firstName: "Mara",
      lastName: "Montage",
    });
    const appointmentTag = await createExactTagFixture("Reader Termin Tag Fokus");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: appointmentDate,
      employeeIds: [employee.id],
    });
    await attachAppointmentTagFixture(appointment.id, appointmentTag.id);
    await appointmentNotesService.createAppointmentNote(appointment.id, {
      title: "Reader Terminnotiz Fokus",
      body: "<p>Diese Notiz muss sichtbar bleiben.</p>",
      print: false,
      cardColor: null,
    });
    const customerAttachment = buildAttachmentPayload("reader-appointment-customer", "kundendokument");
    customerAttachmentName = customerAttachment.originalName;
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });
    const projectAttachment = buildAttachmentPayload("reader-appointment-project", "projektdokument");
    projectAttachmentName = projectAttachment.originalName;
    await projectAttachmentsService.createProjectAttachment({ projectId: project.id, ...projectAttachment });
    const appointmentAttachment = buildAttachmentPayload("reader-appointment-self", "termindokument");
    appointmentAttachmentName = appointmentAttachment.originalName;
    await appointmentAttachmentsService.createAppointmentAttachment({ appointmentId: appointment.id, ...appointmentAttachment });

    appointmentId = appointment.id;
    customerNumber = customer.customerNumber;
    projectName = project.name;
    employeeId = employee.id;
    appointmentTagId = appointmentTag.id;
  });

  test("hides create entrypoints in week and month calendar views for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-wochenuebersicht").click();
    await expect(page.getByTestId(`week-appointment-panel-${appointmentId}`).first()).toBeVisible();
    await expect(page.locator('[data-testid^="button-new-appointment-week-"]')).toHaveCount(0);

    await page.getByTestId("nav-monatsuebersicht").click();
    await expect(page.getByTestId("month-sheet-container")).toBeVisible();
    await expect(page.locator('[data-testid^="button-new-appointment-month-sheet-"]')).toHaveCount(0);
  });

  test("opens existing appointments from the week calendar in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-wochenuebersicht").click();
    const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`).first();
    await expect(appointmentPanel).toBeVisible();

    await appointmentPanel.dblclick();

    await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-cancel-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-park-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-add-employee")).toHaveCount(0);
    await expect(page.getByTestId("appointment-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("button-add-document-header")).toHaveCount(0);
    await expect(page.getByTestId("input-start-date")).toBeDisabled();
    await expect(page.getByTestId("input-start-date")).toHaveValue(appointmentDate);
    await expect(page.getByTestId("badge-project")).toContainText(projectName);
    await expect(page.getByTestId("badge-customer-number")).toContainText(customerNumber.slice(0, 10));
    await expect(page.getByTestId(`appointment-tag-picker-tag-${appointmentTagId}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Terminnotiz Fokus");
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(customerAttachmentName);
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(projectAttachmentName);
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(appointmentAttachmentName);
    await expect(page.getByTestId(`badge-employee-${employeeId}`)).toBeVisible();
  });
});
