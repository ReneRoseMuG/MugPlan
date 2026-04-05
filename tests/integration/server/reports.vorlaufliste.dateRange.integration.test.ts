/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - buildAppointmentConditions behandelt fromDate und toDate beide inklusiv (gte / lte).
 * - Ein Termin genau auf fromDate erscheint im Vorlaufliste-Report.
 * - Ein Termin einen Tag vor fromDate erscheint nicht im Vorlaufliste-Report.
 * - Ein Termin genau auf toDate erscheint im Vorlaufliste-Report.
 * - Ein Termin einen Tag nach toDate erscheint nicht im Vorlaufliste-Report.
 * - Ein Termin zwischen fromDate und toDate erscheint im Vorlaufliste-Report.
 * - Dasselbe Grenzwertverhalten gilt für den Produktionsplanung-Endpunkt.
 *
 * Fehlerfälle:
 * - fromDate oder toDate werden exklusiv statt inklusiv behandelt.
 * - Termine außerhalb des Fensters erscheinen im Report.
 *
 * Ziel:
 * Das Datums-Grenzwertverhalten von buildAppointmentConditions für beide Report-Endpunkte
 * end-to-end absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import {
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProjectFixture,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function ensureManagedSpecialMeasureTag() {
  const [existing] = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (existing) return existing;

  await db.insert(tags).values({
    name: MANAGED_SPECIAL_MEASURE_TAG_NAME,
    color: MANAGED_SPECIAL_MEASURE_TAG_COLOR,
    isDefault: true,
    version: 1,
  });

  const [created] = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (!created) throw new Error("Expected Sondermaß system tag.");
  return created;
}

async function createMinimalVorlauflisteFixture(prefix: string, appointmentDate: string) {
  const customer = await createCustomerFixtureWithOverrides({ prefix: `${prefix}-CUST` });
  const project = await createProjectFixture({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
  });
  await createAppointmentFixture({ projectId: project.id, startDate: appointmentDate });
  return { project };
}

async function createMinimalProduktionsplanungFixture(
  prefix: string,
  appointmentDate: string,
  sondermaßTag: { id: number },
) {
  const customer = await createCustomerFixtureWithOverrides({ prefix: `${prefix}-CUST` });
  const project = await createProjectFixture({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
  });
  const appointment = await createAppointmentFixture({ projectId: project.id, startDate: appointmentDate });
  await attachAppointmentTagFixture(appointment.id, sondermaßTag.id);
  return { project };
}

describe("FT26 integration: report vorlaufliste - Datums-Grenzwerte", () => {
  const FROM_DATE = "2098-05-01";
  const TO_DATE = "2098-05-31";

  it("zeigt Termin genau auf fromDate im Report", async () => {
    const admin = await loginAdminAgent(app);
    const fixture = await createMinimalVorlauflisteFixture("L1-VL-ON-FROM", FROM_DATE);

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=${FROM_DATE}&toDate=${TO_DATE}&page=1&pageSize=100`)
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((i) => i.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });

  it("schliesst Termin einen Tag vor fromDate aus dem Report aus", async () => {
    const admin = await loginAdminAgent(app);
    const fixture = await createMinimalVorlauflisteFixture("L1-VL-BEFORE-FROM", "2098-04-30");

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=${FROM_DATE}&toDate=${TO_DATE}&page=1&pageSize=100`)
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((i) => i.projectId);
    expect(projectIds).not.toContain(fixture.project.id);
  });

  it("zeigt Termin genau auf toDate im Report", async () => {
    const admin = await loginAdminAgent(app);
    const fixture = await createMinimalVorlauflisteFixture("L1-VL-ON-TO", TO_DATE);

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=${FROM_DATE}&toDate=${TO_DATE}&page=1&pageSize=100`)
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((i) => i.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });

  it("schliesst Termin einen Tag nach toDate aus dem Report aus", async () => {
    const admin = await loginAdminAgent(app);
    const fixture = await createMinimalVorlauflisteFixture("L1-VL-AFTER-TO", "2098-06-01");

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=${FROM_DATE}&toDate=${TO_DATE}&page=1&pageSize=100`)
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((i) => i.projectId);
    expect(projectIds).not.toContain(fixture.project.id);
  });

  it("zeigt Termin zwischen fromDate und toDate im Report", async () => {
    const admin = await loginAdminAgent(app);
    const fixture = await createMinimalVorlauflisteFixture("L1-VL-BETWEEN", "2098-05-15");

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=${FROM_DATE}&toDate=${TO_DATE}&page=1&pageSize=100`)
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((i) => i.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });
});

describe("FT26 integration: report produktionsplanung - Datums-Grenzwerte", () => {
  const FROM_DATE = "2098-07-01";
  const TO_DATE = "2098-07-31";

  it("zeigt Termin genau auf fromDate in projectRows", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();
    const fixture = await createMinimalProduktionsplanungFixture("L1-PP-ON-FROM", FROM_DATE, sondermaßTag);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=${FROM_DATE}&toDate=${TO_DATE}`)
      .expect(200);

    const projectIds = (response.body.projectRows as Array<{ projectId: number }>).map((r) => r.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });

  it("schliesst Termin einen Tag vor fromDate aus projectRows aus", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();
    const fixture = await createMinimalProduktionsplanungFixture("L1-PP-BEFORE-FROM", "2098-06-30", sondermaßTag);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=${FROM_DATE}&toDate=${TO_DATE}`)
      .expect(200);

    const projectIds = (response.body.projectRows as Array<{ projectId: number }>).map((r) => r.projectId);
    expect(projectIds).not.toContain(fixture.project.id);
  });

  it("zeigt Termin genau auf toDate in projectRows", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();
    const fixture = await createMinimalProduktionsplanungFixture("L1-PP-ON-TO", TO_DATE, sondermaßTag);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=${FROM_DATE}&toDate=${TO_DATE}`)
      .expect(200);

    const projectIds = (response.body.projectRows as Array<{ projectId: number }>).map((r) => r.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });

  it("schliesst Termin einen Tag nach toDate aus projectRows aus", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();
    const fixture = await createMinimalProduktionsplanungFixture("L1-PP-AFTER-TO", "2098-08-01", sondermaßTag);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=${FROM_DATE}&toDate=${TO_DATE}`)
      .expect(200);

    const projectIds = (response.body.projectRows as Array<{ projectId: number }>).map((r) => r.projectId);
    expect(projectIds).not.toContain(fixture.project.id);
  });

  it("zeigt Termin zwischen fromDate und toDate in projectRows", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();
    const fixture = await createMinimalProduktionsplanungFixture("L1-PP-BETWEEN", "2098-07-15", sondermaßTag);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=${FROM_DATE}&toDate=${TO_DATE}`)
      .expect(200);

    const projectIds = (response.body.projectRows as Array<{ projectId: number }>).map((r) => r.projectId);
    expect(projectIds).toContain(fixture.project.id);
  });
});
