/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein neuer Zweitagestermin kann im Browser aus dem Tour-Kontext mit Projekt-, Kunden- und Tourrelation angelegt werden.
 * - Das Terminformular rendert in Create und Edit innerhalb der EntityFormShell mit sichtbarer Sidebar.
 * - Nach dem Speichern rendert der Wochenkalender den Termin als sichtbare Mehrtageskachel mit stabilem `Tag 2`-Indikator.
 * - Beim erneuten Oeffnen bleiben Start- und Enddatum sowie Projekt-, Kunden- und Tourrelationen korrekt geladen.
 * - Eine gesetzte Tour weist keine Mitarbeiter automatisch zu; die Mitarbeiterliste bleibt leer, bis Nutzer aktiv zuweisen.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine zeigen nach Save keine belastbare Spanning-Tile-Darstellung fuer beide Tage.
 * - Create/Edit verlieren Shell-Struktur oder geladene Relationswerte.
 * - Edit-Formulare verlieren oder verfaelschen das gespeicherte Enddatum.
 * - Das Formular weist durch eine gesetzte Tour unerwartet Mitarbeiter automatisch zu.
 *
 * Ziel:
 * Den kompletten Create/Edit-Flow eines Mehrtagestermins im Wochenkalender gegen Datums- und Relationsverlust sowie gegen Render-Regressions absichern.
 */
import { expect, test, type Page } from "./fixtures";
import {
  createAppointmentBrowserFixture,
} from "../helpers/testDataFactory";
import { confirmAppointmentSaveReviewIfVisible, loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openWeekAppointment(page: Page, appointmentId: number, kind: "single" | "spanning") {
  const target = kind === "single"
    ? page.getByTestId(`week-appointment-panel-${appointmentId}`).first()
    : page.getByTestId(`week-spanning-tile-${appointmentId}`).filter({ hasText: "Tag 2" }).first();
  await expect(target).toBeVisible();
  await target.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

type AppointmentBrowserFixture = Awaited<ReturnType<typeof createAppointmentBrowserFixture>>;

async function openNewAppointmentFromTourLane(page: Page, tourId: number, targetDate: string) {
  await loginAsAdmin(page);
  const button = page.getByTestId(`button-new-appointment-week-${targetDate}-lane-tour-${tourId}`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function selectProjectWithoutAppointments(page: Page, fixture: AppointmentBrowserFixture) {
  await page.getByTestId("button-select-project").click();
  const table = page.getByTestId("table-projects");
  await expect(table).toBeVisible();
  await expect(page.getByTestId("toggle-project-scope-all")).toHaveAttribute("data-state", "on");
  await page.locator("#project-filter-order-number").fill(fixture.project.orderNumber ?? "");
  await page.locator("#project-filter-title").fill(fixture.project.name);
  const row = table.locator("tbody tr")
    .filter({ hasText: fixture.project.orderNumber ?? "" })
    .filter({ hasText: fixture.project.name })
    .filter({ hasText: fixture.customer.customerNumber })
    .first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(page.getByTestId("badge-project")).toBeVisible();
}

async function assertAppointmentFormShell(page: Page) {
  await expect(page.getByTestId("entity-form-shell")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-header")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-middle")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-main")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-main-inner")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-sidebar")).toBeVisible();
  await expect(page.getByTestId("entity-form-shell-footer")).toBeVisible();
}

async function assertAppointmentSidebar(page: Page) {
  await expect(page.getByTestId("appointment-form-sidebar")).toBeVisible();
  await expect(page.getByTestId("button-add-document-header")).toBeVisible();
  await expect(page.getByTestId("appointment-tag-picker-button-add")).toBeVisible();
  await expect(page.getByTestId("button-new-note")).toBeVisible();
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Dokumente");
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Tags");
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Notizen");
}

async function assertAppointmentFormLoaded(page: Page, fixture: AppointmentBrowserFixture, params: {
  startDate: string;
  endDate?: string;
  relationsLoaded?: boolean;
}) {
  await assertAppointmentFormShell(page);
  await assertAppointmentSidebar(page);
  await expect(page.getByTestId("input-start-date")).toHaveValue(params.startDate);
  if (params.endDate) {
    await expect(page.getByTestId("input-end-date")).toHaveValue(params.endDate);
  }
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId("badge-tour-remove")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);
  await expect(page.getByText("Keine Mitarbeiter zugewiesen")).toBeVisible();
  for (const employee of fixture.employees) {
    await expect(page.getByTestId(`badge-employee-${employee.id}`)).toHaveCount(0);
  }
  if (params.relationsLoaded === false) {
    await expect(page.getByTestId("slot-project-relation")).toContainText("Kein Projekt ausgewählt");
    await expect(page.getByTestId("slot-customer-relation")).toContainText("Kein Kunde ausgewählt");
    await expect(page.getByTestId("badge-project")).toHaveCount(0);
    await expect(page.getByTestId("badge-customer")).toHaveCount(0);
    return;
  }
  await expect(page.getByTestId("badge-project-name")).toContainText(fixture.project.name);
  await expect(page.getByTestId("badge-project-order-number")).toContainText(fixture.project.orderNumber ?? "");
  await expect(page.getByTestId("badge-customer-number")).toContainText(fixture.customer.customerNumber.slice(0, 10));
  await expect(page.getByTestId("badge-customer-postal-code")).toContainText(fixture.customer.postalCode ?? "");
  await expect(page.getByTestId("badge-customer-city")).toContainText(fixture.customer.city ?? "");
}

async function saveAppointmentAndResolveId(page: Page) {
  const createAppointmentResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/appointments"
  ));
  await page.getByTestId("button-save-appointment").click();
  await confirmAppointmentSaveReviewIfVisible(page);
  const response = await createAppointmentResponsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { id: number };
  expect(Number(body.id)).toBeGreaterThan(0);
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  return Number(body.id);
}

test("creates a multi-day appointment from a tour lane and keeps start and end dates stable on reopen", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT01-BROWSER-MULTIDAY", targetDayOffset: 2 });

  await openNewAppointmentFromTourLane(page, fixture.tour.id, fixture.targetDate);
  await assertAppointmentFormLoaded(page, fixture, { startDate: fixture.targetDate, relationsLoaded: false });

  await selectProjectWithoutAppointments(page, fixture);
  await assertAppointmentFormLoaded(page, fixture, { startDate: fixture.targetDate });

  await page.getByTestId("button-enable-end-date").click();
  await page.getByTestId("input-end-date").fill(fixture.nextDate);
  await assertAppointmentFormLoaded(page, fixture, {
    startDate: fixture.targetDate,
    endDate: fixture.nextDate,
  });

  const appointmentId = await saveAppointmentAndResolveId(page);

  const spanningTile = page.getByTestId(`week-spanning-tile-${appointmentId}`).filter({ hasText: "Tag 2" }).first();
  await expect(spanningTile).toBeVisible();
  await expect(spanningTile.getByTestId(`week-spanning-tile-header-${appointmentId}`)).toContainText("Tag 2");
  await expect(spanningTile).toContainText("Tag 2");
  await expect(spanningTile.getByTestId("week-project-header")).toContainText(fixture.project.orderNumber ?? "");
  await expect(spanningTile.getByTestId("week-project-header")).toContainText(fixture.project.name);
  await expect(spanningTile).toContainText(`K: ${fixture.customer.customerNumber}`);
  await expect(spanningTile).toContainText(`PLZ: ${fixture.customer.postalCode}`);
  await expect(spanningTile.getByText("Keine MA")).toBeVisible();

  await openWeekAppointment(page, appointmentId, "spanning");
  await assertAppointmentFormLoaded(page, fixture, {
    startDate: fixture.targetDate,
    endDate: fixture.nextDate,
  });
});
