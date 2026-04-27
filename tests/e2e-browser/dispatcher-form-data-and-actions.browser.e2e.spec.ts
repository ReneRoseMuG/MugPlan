import { Buffer } from "node:buffer";
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
import { loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";
import { applyTestSystemSeed } from "../helpers/resetDatabase";

function buildAttachmentPayload(prefix: string, label: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    filename: `${token}.pdf`,
    originalName: `${label}-${token}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `dispatcher-fixtures/${token}.pdf`,
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

async function loginAsDispatcher(page: Page) {
  await loginAsRole(page, "DISPATCHER");
}

async function createNoteViaDialog(page: Page, input: { title: string; body: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await dialog.getByTestId("button-save-note").click();
  await expect(page.getByTestId("list-notes")).toContainText(input.title);
}

async function uploadSidebarFile(sidebar: ReturnType<Page["getByTestId"]>, fileName: string, content: string) {
  const fileInput = sidebar.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from(content, "utf8"),
  });
  await expect(sidebar.getByText(fileName)).toBeVisible();
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

test.describe("Dispatcher form data and actions", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/dispatcher-form-data-and-actions.browser.e2e.spec.ts");
  });

  test("lets dispatchers work with appointment form data and sidebar actions", async ({ page }) => {
    const customer = await createCustomerFixture("DISPATCHER-APPT-CUST");
    const project = await createProjectFixture({
      prefix: "DISPATCHER-APPT-PROJ",
      customerId: customer.id,
      name: "Dispatcher Termin Projekt",
    });
    const appointmentTag = await createExactTagFixture("Dispatcher Termin Tag");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
    });
    await attachAppointmentTagFixture(appointment.id, appointmentTag.id);
    await appointmentNotesService.createAppointmentNote(appointment.id, {
      title: "Dispatcher Terminnotiz Bestand",
      body: "<p>Bestand</p>",
      print: false,
      cardColor: null,
    });
    const appointmentAttachment = buildAttachmentPayload("dispatcher-appointment", "termindokument");
    await appointmentAttachmentsService.createAppointmentAttachment({ appointmentId: appointment.id, ...appointmentAttachment });

    await loginAsDispatcher(page);
    await page.getByTestId("nav-wochenuebersicht").click();
    const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`).first();
    await expect(appointmentPanel).toBeVisible();
    await appointmentPanel.dblclick();

    await expect(page.getByTestId("button-save-appointment")).toBeVisible();
    await expect(page.getByTestId("button-delete-appointment")).toBeVisible();
    await expect(page.getByTestId("button-add-employee")).toBeVisible();
    await expect(page.getByTestId(`appointment-tag-picker-tag-${appointmentTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Dispatcher Terminnotiz Bestand");
    await expect(page.getByTestId("appointment-form-sidebar")).toContainText(appointmentAttachment.originalName);

    await createNoteViaDialog(page, {
      title: "Dispatcher Terminnotiz Neu",
      body: "Neu angelegt",
    });
    await uploadSidebarFile(page.getByTestId("appointment-form-sidebar"), "dispatcher-appointment-upload.txt", "appointment upload");
  });

  test("lets dispatchers edit project form data while keeping sidebar data visible", async ({ page }) => {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "DISPATCHER-PROJECT-CUST",
      firstName: "Dora",
      lastName: "Projektkunde",
      fullName: "Dora Projektkunde",
      company: "Dispatcher Projekt AG",
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: "DISPATCHER-PROJECT",
      customerId: customer.id,
      name: "Dispatcher Projekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(3),
    });
    const projectTag = await createExactTagFixture("Dispatcher Projekt Tag");
    await attachProjectTagFixture(project.id, projectTag.id);
    await projectNotesService.createProjectNote(project.id, {
      title: "Dispatcher Projektnotiz Bestand",
      body: "<p>Bestand</p>",
      print: false,
      cardColor: null,
    });
    const projectAttachment = buildAttachmentPayload("dispatcher-project", "projektdokument");
    await projectAttachmentsService.createProjectAttachment({ projectId: project.id, ...projectAttachment });

    await loginAsDispatcher(page);
    const entry = await openProjectEntry(page, project);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-project")).toBeVisible();
    await expect(page.getByTestId("button-delete-project")).toBeVisible();
    await expect(page.getByTestId("button-change-customer")).toBeVisible();
    await expect(page.getByTestId("button-new-appointment-from-project")).toBeVisible();
    await expect(page.getByTestId("project-tag-picker-button-add")).toBeVisible();
    await expect(page.getByTestId(`project-tag-picker-tag-${projectTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Dispatcher Projektnotiz Bestand");
    await expect(page.getByTestId("project-form-sidebar")).toContainText(projectAttachment.originalName);
    await expect(page.getByTestId(`project-appointment-${appointment.id}`)).toBeVisible();

    await createNoteViaDialog(page, {
      title: "Dispatcher Projektnotiz Neu",
      body: "Neu angelegt",
    });
    await uploadSidebarFile(page.getByTestId("project-form-sidebar"), "dispatcher-project-upload.txt", "project upload");
    const editedName = "Dispatcher Projekt geändert";
    await page.getByTestId("input-project-name").fill(editedName);
    const saveResponsePromise = page.waitForResponse((response) => (
      response.request().method() === "PATCH"
      && new URL(response.url()).pathname === `/api/projects/${project.id}`
    ));
    await page.getByTestId("button-save-project").click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
    await expect(page.getByTestId("input-project-name")).toHaveValue(editedName);
  });

  test("lets dispatchers edit customer forms and use sidebar note actions", async ({ page }) => {
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "DISPATCHER-CUSTOMER",
      firstName: "Karin",
      lastName: "Kundenblick",
      fullName: "Karin Kundenblick",
      company: "Dispatcher Customer GmbH",
      city: "Oldenburg",
    });
    const project = await createProjectFixture({
      prefix: "DISPATCHER-CUSTOMER-PROJ",
      customerId: customer.id,
      name: "Dispatcher Kundenprojekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });
    const customerTag = await createExactTagFixture("Dispatcher Kunden Tag");
    await attachCustomerTagFixture(customer.id, customerTag.id);
    await customerNotesService.createCustomerNote(customer.id, {
      title: "Dispatcher Kundennotiz Bestand",
      body: "<p>Bestand</p>",
      print: false,
      cardColor: null,
    });
    const customerAttachment = buildAttachmentPayload("dispatcher-customer", "kundendokument");
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });

    await loginAsDispatcher(page);
    const entry = await openCustomerEntry(page, customer);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-customer")).toBeVisible();
    await expect(page.getByTestId("customer-tag-picker-button-add")).toBeVisible();
    await expect(page.getByTestId(`customer-tag-picker-tag-${customerTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Dispatcher Kundennotiz Bestand");
    await expect(page.getByTestId("customer-form-sidebar")).toContainText(customerAttachment.originalName);
    await expect(page.getByTestId(`customer-appointment-${appointment.id}`)).toBeVisible();
    await expect(page.getByTestId("list-linked-projects")).toContainText(project.name);

    await createNoteViaDialog(page, {
      title: "Dispatcher Kundennotiz Neu",
      body: "Neu angelegt",
    });
    await uploadSidebarFile(page.getByTestId("customer-form-sidebar"), "dispatcher-customer-upload.txt", "customer upload");
    const editedFirstName = "Katrin";
    await page.getByTestId("input-firstname").fill(editedFirstName);
    const saveResponsePromise = page.waitForResponse((response) => (
      response.request().method() === "PATCH"
      && new URL(response.url()).pathname === `/api/customers/${customer.id}`
    ));
    await page.getByTestId("button-save-customer").click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
    await expect(page.getByTestId("button-save-customer")).toHaveCount(0);
    await expect(entry).toContainText(editedFirstName);
  });

  test("lets dispatchers edit employee forms and keep appointments and week plans actionable", async ({ page }) => {
    const employee = await createEmployeeFixtureWithOverrides({
      prefix: "DISPATCHER-EMPLOYEE",
      firstName: "Erika",
      lastName: "Einsatzplan",
      email: "erika.einsatzplan@example.test",
    });
    const customer = await createCustomerFixture("DISPATCHER-EMPLOYEE-CUST");
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      employeeIds: [employee.id],
      startDate: getRelativeBerlinDate(6),
    });
    const employeeTag = await createExactTagFixture("Dispatcher Mitarbeiter Tag");
    await attachEmployeeTagFixture(employee.id, employeeTag.id);
    await employeeNotesService.createEmployeeNote(employee.id, {
      title: "Dispatcher Mitarbeiternotiz Bestand",
      body: "<p>Bestand</p>",
      print: false,
      cardColor: null,
    }, "ADMIN");
    const employeeAttachment = buildAttachmentPayload("dispatcher-employee", "mitarbeiterdokument");
    await employeeAttachmentsService.createEmployeeAttachment({ employeeId: employee.id, ...employeeAttachment });

    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
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

    await loginAsDispatcher(page);
    const entry = await openEmployeeEntry(page, employee);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("button-save-employee")).toBeVisible();
    await expect(page.getByTestId("employee-tag-picker-button-add")).toBeVisible();
    await expect(page.getByTestId(`employee-tag-picker-tag-${employeeTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Dispatcher Mitarbeiternotiz Bestand");
    await expect(page.getByTestId("employee-form-sidebar")).toContainText(employeeAttachment.originalName);

    await createNoteViaDialog(page, {
      title: "Dispatcher Mitarbeiternotiz Neu",
      body: "Neu angelegt",
    });
    await uploadSidebarFile(page.getByTestId("employee-form-sidebar"), "dispatcher-employee-upload.txt", "employee upload");
    const editedEmail = "dispatcher-updated@example.test";
    await page.getByTestId("input-employee-email").fill(editedEmail);
    const saveResponsePromise = page.waitForResponse((response) => (
      response.request().method() === "PUT"
      && new URL(response.url()).pathname === `/api/employees/${employee.id}`
    ));
    await page.getByTestId("button-save-employee").click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
    await expect(page.getByTestId("button-save-employee")).toHaveCount(0);
    await expect(entry).toContainText(editedEmail);
    await entry.dblclick();

    await page.getByTestId("tab-employee-termine").click();
    await expect(page.getByTestId(`button-remove-employee-from-appointment-${appointment.id}`)).toBeVisible();
    await page.getByTestId("tab-employee-wochenplanung").click();
    await expect(page.getByTestId(`card-employee-week-plan-${assignmentId}`)).toBeVisible();
  });

  test("lets dispatchers use tour and week actions with visible existing data", async ({ page }) => {
    await applyTestSystemSeed();
    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
    const employee = await createEmployeeFixture("DISPATCHER-TOUR-EMP");
    const customer = await createCustomerFixture("DISPATCHER-TOUR-CUST");
    const project = await createProjectFixture({
      prefix: "DISPATCHER-TOUR-PROJ",
      customerId: customer.id,
      name: "Dispatcher Tour Projekt",
    });
    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: week.weekStartDate,
      title: "Dispatcher Tour Wochenauftrag",
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    await calendarWeekNotesService.createCalendarWeekNote(
      week.isoYear,
      week.isoWeek,
      tour.id,
      {
        title: "Dispatcher Wochennotiz Bestand",
        body: "<p>Bestand</p>",
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

    await loginAsDispatcher(page);
    await page.getByTestId("nav-touren").click();
    const tourCard = page.getByTestId(`card-tour-${tour.id}`);
    await expect(tourCard).toBeVisible();
    await tourCard.dblclick();

    await expect(page.getByTestId("button-save-tour")).toBeVisible();
    await page.getByTestId("tab-tour-wochenplanung").click();
    await expect(page.getByTestId("toggle-tour-week-picker")).toBeVisible();

    const weekCard = page.getByTestId(`card-tour-week-${week.isoYear}-${week.isoWeek}`);
    await expect(weekCard).toBeVisible();
    await expect(page.getByTestId(`badge-tour-week-member-${assignmentId}`)).toContainText(employee.fullName);
    await expect(page.getByTestId(`button-add-tour-week-member-${week.isoYear}-${week.isoWeek}`)).toBeVisible();
    await expect(page.getByTestId(`button-tour-week-menu-${week.isoYear}-${week.isoWeek}`)).toBeVisible();
    await weekCard.dblclick();

    await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
    await expect(page.getByTestId("tour-week-form-functions-panel")).toBeVisible();
    await expect(page.getByTestId("button-open-tour-week-employee-picker")).toBeVisible();
    await expect(page.getByTestId("button-block-tour-week")).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Dispatcher Wochennotiz Bestand");

    await createNoteViaDialog(page, {
      title: "Dispatcher Wochennotiz Neu",
      body: "Neu angelegt",
    });
    const blockResponsePromise = page.waitForResponse((response) => (
      response.request().method() === "POST"
      && new URL(response.url()).pathname === `/api/tours/${tour.id}/weeks/${week.isoYear}/${week.isoWeek}/block`
    ));
    await page.getByTestId("button-block-tour-week").click();
    const blockResponse = await blockResponsePromise;
    expect(blockResponse.ok(), await blockResponse.text()).toBeTruthy();
    await expect.poll(async () => page.getByTestId("button-unblock-tour-week").count()).toBe(1);

    const unblockResponsePromise = page.waitForResponse((response) => (
      response.request().method() === "POST"
      && new URL(response.url()).pathname === `/api/tours/${tour.id}/weeks/${week.isoYear}/${week.isoWeek}/unblock`
    ));
    await page.getByTestId("button-unblock-tour-week").click();
    const unblockResponse = await unblockResponsePromise;
    expect(unblockResponse.ok(), await unblockResponse.text()).toBeTruthy();
    await expect.poll(async () => page.getByTestId("button-block-tour-week").count()).toBe(1);
  });
});
