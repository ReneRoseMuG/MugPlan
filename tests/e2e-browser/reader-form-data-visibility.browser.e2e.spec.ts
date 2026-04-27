import { expect, test, type Page } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { db } from "../../server/db";
import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import * as calendarWeekNotesService from "../../server/services/calendarWeekNotesService";
import * as customerAttachmentsService from "../../server/services/customerAttachmentsService";
import * as customerNotesService from "../../server/services/customerNotesService";
import * as employeeAttachmentsService from "../../server/services/employeeAttachmentsService";
import * as employeeNotesService from "../../server/services/employeeNotesService";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
import * as projectNotesService from "../../server/services/projectNotesService";
import { tourWeekEmployees } from "../../shared/schema";
import {
  attachAppointmentTagFixture,
  attachCustomerTagFixture,
  attachEmployeeTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixture,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixture,
  createProjectFixtureWithOverrides,
  createRawAppointmentFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

function buildAttachmentPayload(prefix: string, label: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    filename: `${token}.pdf`,
    originalName: `${label}-${token}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `reader-fixtures/${token}.pdf`,
    version: 1,
  };
}

function resolveNextReadableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

async function openProjectEntry(page: Page, project: { id: number; orderNumber?: string | null; name: string }) {
  await page.getByTestId("nav-projekte").click();
  if (project.orderNumber) {
    await page.locator("#project-filter-order-number").fill(project.orderNumber);
  }
  await page.locator("#project-filter-title").fill(project.name);

  const tableRow = page.getByTestId("table-projects").locator("tbody tr")
    .filter({ hasText: project.name })
    .filter({ hasText: project.orderNumber ?? "" })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`project-card-${project.id}`).first();
}

async function openCustomerEntry(
  page: Page,
  customer: { id: number; customerNumber: string; lastName?: string | null },
) {
  await page.getByTestId("nav-kunden").click();
  await page.locator("#customer-filter-number").fill(customer.customerNumber);
  if (customer.lastName) {
    await page.locator("#customer-filter-last-name").fill(customer.lastName);
  }

  const tableRow = page.getByTestId("table-customers").locator("tbody tr")
    .filter({ hasText: customer.customerNumber })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`customer-card-${customer.id}`).first();
}

async function openEmployeeEntry(page: Page, employee: { id: number; lastName: string }) {
  await page.goto("/standalone/employees");
  await page.locator("#employee-filter-last-name").fill(employee.lastName);

  const tableRow = page.getByTestId("table-employees").locator("tbody tr")
    .filter({ hasText: employee.lastName })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`employee-card-${employee.id}`).first();
}

test.describe("Reader form data visibility", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-form-data-visibility.browser.e2e.spec.ts");
  });

  test("shows existing appointment form data and sidebar content while staying readonly", async ({ page }) => {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-APPT-CUST",
      firstName: "Lena",
      lastName: "Lesertermin",
      fullName: "Lena Lesertermin",
      company: "Reader Termin GmbH",
      city: "Oldenburg",
      country: "Deutschland",
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: "READER-APPT-PROJ",
      customerId: customer.id,
      name: "Reader Termin Projekt",
      descriptionMd: "<p>Readonly appointment project</p>",
    });
    const employee = await createEmployeeFixtureWithOverrides({
      prefix: "READER-APPT-EMP",
      firstName: "Mara",
      lastName: "Montage",
    });
    const appointmentTag = await createExactTagFixture("Reader Termin Tag");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [employee.id],
    });
    await attachAppointmentTagFixture(appointment.id, appointmentTag.id);
    await appointmentNotesService.createAppointmentNote(appointment.id, {
      title: "Reader Terminnotiz",
      body: "<p>Diese Notiz muss sichtbar bleiben.</p>",
      print: false,
      cardColor: null,
    });
    const customerAttachment = buildAttachmentPayload("reader-appt-customer", "kundendokument");
    const projectAttachment = buildAttachmentPayload("reader-appt-project", "projektdokument");
    const appointmentAttachment = buildAttachmentPayload("reader-appt-appointment", "termindokument");
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });
    await projectAttachmentsService.createProjectAttachment({ projectId: project.id, ...projectAttachment });
    await appointmentAttachmentsService.createAppointmentAttachment({ appointmentId: appointment.id, ...appointmentAttachment });

    await loginAsReader(page);
    await page.getByTestId("nav-wochenuebersicht").click();
    const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`).first();
    await expect(appointmentPanel).toBeVisible();
    await appointmentPanel.dblclick();

    await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-cancel-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-add-employee")).toHaveCount(0);
    await expect(page.getByTestId("appointment-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);

    await expect(page.getByTestId("input-start-date")).toHaveValue(getRelativeBerlinDate(2));
    await expect(page.getByTestId("badge-project")).toContainText(project.name);
    await expect(page.getByTestId("badge-customer-number")).toContainText(customer.customerNumber.slice(0, 10));
    await expect(page.getByTestId(`appointment-tag-picker-tag-${appointmentTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Terminnotiz");
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(customerAttachment.originalName);
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(projectAttachment.originalName);
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(appointmentAttachment.originalName);
    await expect(page.getByTestId(`badge-employee-${employee.id}`)).toBeVisible();
  });

  test("shows existing project form data and sidebar panels for readers", async ({ page }) => {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-PROJ-CUST",
      firstName: "Paula",
      lastName: "Projektkunde",
      fullName: "Paula Projektkunde",
      company: "Reader Projekt AG",
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: "READER-PROJ",
      customerId: customer.id,
      name: "Reader Projekt Readonly",
      descriptionMd: "<p>Readonly project body</p>",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });
    const projectTag = await createExactTagFixture("Reader Projekt Tag");
    await attachProjectTagFixture(project.id, projectTag.id);
    await projectNotesService.createProjectNote(project.id, {
      title: "Reader Projektnotiz",
      body: "<p>Projekt bleibt sichtbar.</p>",
      print: false,
      cardColor: null,
    });
    const projectAttachment = buildAttachmentPayload("reader-project-project", "projektdokument");
    const customerAttachment = buildAttachmentPayload("reader-project-customer", "kundendokument");
    await projectAttachmentsService.createProjectAttachment({ projectId: project.id, ...projectAttachment });
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });

    await loginAsReader(page);
    const entry = await openProjectEntry(page, project);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-project")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-project")).toHaveCount(0);
    await expect(page.getByTestId("button-select-customer")).toHaveCount(0);
    await expect(page.getByTestId("button-new-appointment-from-project")).toHaveCount(0);
    await expect(page.getByTestId("project-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);

    await expect(page.getByTestId("input-project-name")).toHaveValue(project.name);
    await expect(page.getByTestId("input-project-order-number")).toHaveValue(project.orderNumber ?? "");
    await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);
    await expect(page.getByTestId(`project-tag-picker-tag-${projectTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Projektnotiz");
    await expect(page.getByTestId("project-form-sidebar")).toContainText(projectAttachment.originalName);
    await expect(page.getByTestId("project-form-sidebar")).toContainText(customerAttachment.originalName);
    await expect(page.getByTestId(`project-appointment-${appointment.id}`)).toBeVisible();
  });

  test("shows customer form values and linked sidebar data for readers", async ({ page }) => {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-CUSTOMER",
      firstName: "Clara",
      lastName: "Kundensicht",
      fullName: "Clara Kundensicht",
      company: "Clara Sichtbar GmbH",
      city: "Bremen",
      country: "Deutschland",
    });
    const project = await createProjectFixture({
      prefix: "READER-CUSTOMER-PROJ",
      customerId: customer.id,
      name: "Reader Kundenprojekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(5),
    });
    const customerTag = await createExactTagFixture("Reader Kunden Tag");
    await attachCustomerTagFixture(customer.id, customerTag.id);
    await customerNotesService.createCustomerNote(customer.id, {
      title: "Reader Kundennotiz",
      body: "<p>Kundennotiz sichtbar.</p>",
      print: false,
      cardColor: null,
    });
    const customerAttachment = buildAttachmentPayload("reader-customer", "kundendokument");
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });

    await loginAsReader(page);
    const entry = await openCustomerEntry(page, customer);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-customer")).toHaveCount(0);
    await expect(page.getByTestId("customer-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);

    await expect(page.getByTestId("input-firstname")).toHaveValue(customer.firstName ?? "");
    await expect(page.getByTestId("input-company")).toHaveValue(customer.company ?? "");
    await expect(page.getByTestId("input-city")).toHaveValue(customer.city ?? "");
    await expect(page.getByTestId("input-country")).toHaveValue(customer.country ?? "");
    await expect(page.getByTestId(`customer-tag-picker-tag-${customerTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Kundennotiz");
    await expect(page.getByTestId("customer-form-sidebar")).toContainText(customerAttachment.originalName);
    await expect(page.getByTestId(`customer-appointment-${appointment.id}`)).toBeVisible();
    await expect(page.getByTestId("list-linked-projects")).toContainText(project.name);
  });

  test("shows employee form values, notes, attachments and week data for readers", async ({ page }) => {
    const employee = await createEmployeeFixtureWithOverrides({
      prefix: "READER-EMPLOYEE",
      firstName: "Erik",
      lastName: "Einsatz",
      email: "erik.einsatz@example.test",
      phone: "0123456",
    });
    const customer = await createCustomerFixture("READER-EMPLOYEE-CUST");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      employeeIds: [employee.id],
      startDate: getRelativeBerlinDate(7),
    });
    const employeeTag = await createExactTagFixture("Reader Mitarbeiter Tag");
    await attachEmployeeTagFixture(employee.id, employeeTag.id);
    await employeeNotesService.createEmployeeNote(employee.id, {
      title: "Reader Mitarbeiternotiz",
      body: "<p>Mitarbeiternotiz sichtbar.</p>",
      print: false,
      cardColor: null,
    }, "ADMIN");
    const employeeAttachment = buildAttachmentPayload("reader-employee", "mitarbeiterdokument");
    await employeeAttachmentsService.createEmployeeAttachment({ employeeId: employee.id, ...employeeAttachment });

    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
    const colleague = await createEmployeeFixture("READER-EMPLOYEE-KOLLEGE");
    const insertResult = await db.insert(tourWeekEmployees).values([
      {
        tourId: tour.id,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        employeeId: employee.id,
      },
      {
        tourId: tour.id,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        employeeId: colleague.id,
      },
    ]);
    const ownAssignmentId = Number(
      (insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
        ?? (insertResult as { insertId?: number }).insertId,
    );

    await loginAsReader(page);
    const entry = await openEmployeeEntry(page, employee);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-employee")).toHaveCount(0);
    await expect(page.getByTestId("employee-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);

    await expect(page.getByTestId("input-employee-firstname")).toHaveValue(employee.firstName);
    await expect(page.getByTestId("input-employee-email")).toHaveValue(employee.email ?? "");
    await expect(page.getByTestId(`employee-tag-picker-tag-${employeeTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Mitarbeiternotiz");
    await expect(page.getByTestId("employee-form-sidebar")).toContainText(employeeAttachment.originalName);

    await page.getByTestId("tab-employee-termine").click();
    await expect(page.getByTestId(`button-remove-employee-from-appointment-${appointment.id}`)).toHaveCount(0);
    await expect(page.getByTestId("table-appointments-list")).toContainText(customer.customerNumber);

    await page.getByTestId("tab-employee-wochenplanung").click();
    const weekCard = page.getByTestId(`card-employee-week-plan-${ownAssignmentId}`);
    await expect(weekCard).toBeVisible();
    await expect(weekCard).toContainText(tour.name);
    await expect(weekCard).toContainText(employee.fullName);
    await expect(weekCard).toContainText(colleague.fullName);
  });

  test("shows tour and week data for readers while keeping week actions hidden", async ({ page }) => {
    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
    const employee = await createEmployeeFixture("READER-TOUR-EMP");
    const customer = await createCustomerFixture("READER-TOUR-CUST");
    const project = await createProjectFixture({
      prefix: "READER-TOUR-PROJ",
      customerId: customer.id,
      name: "Reader Tour Projekt",
    });
    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: week.weekStartDate,
      title: "Reader Tour Wochenauftrag",
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    await calendarWeekNotesService.createCalendarWeekNote(
      week.isoYear,
      week.isoWeek,
      tour.id,
      {
        title: "Reader Wochennotiz",
        body: "<p>Wochennotiz bleibt sichtbar.</p>",
        print: false,
        cardColor: null,
      },
    );

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      employeeId: employee.id,
    });
    const assignmentId = Number(
      (insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
        ?? (insertResult as { insertId?: number }).insertId,
    );

    await loginAsReader(page);
    await page.getByTestId("nav-touren").click();
    const tourCard = page.getByTestId(`card-tour-${tour.id}`);
    await expect(tourCard).toBeVisible();
    await tourCard.dblclick();

    await expect(page.getByTestId("button-save-tour")).toHaveCount(0);
    await expect(page.getByTestId("toggle-tour-week-picker")).toHaveCount(0);
    await expect(page.getByTestId("input-tour-name")).toHaveValue(tour.name);

    await page.getByTestId("tab-tour-wochenplanung").click();
    const weekCard = page.getByTestId(`card-tour-week-${week.isoYear}-${week.isoWeek}`);
    await expect(weekCard).toBeVisible();
    await expect(page.getByTestId(`badge-tour-week-member-${assignmentId}`)).toContainText(employee.fullName);
    await weekCard.dblclick();

    await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
    await expect(page.getByTestId("tour-week-form-functions-panel")).toHaveCount(0);
    await expect(page.getByTestId("button-open-tour-week-employee-picker")).toHaveCount(0);
    await expect(page.getByTestId("button-block-tour-week")).toHaveCount(0);
    await expect(page.getByTestId("button-unblock-tour-week")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("list-notes")).toContainText("Reader Wochennotiz");
    await page.getByTestId("tab-tour-week-termine").click();
    await expect(page.getByTestId("table-appointments-list")).toBeVisible();
    await expect(page.getByTestId("table-appointments-list")).toContainText(project.name);
  });
});
