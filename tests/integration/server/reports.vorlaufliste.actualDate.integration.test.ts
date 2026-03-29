/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - actualDate wird aus der aktuellen Repository-Logik nur aus Terminen innerhalb des abgefragten Zeitfensters abgeleitet.
 * - Bei mehreren aktiven Terminen im Zeitfenster gewinnt der frueheste aktive Termin.
 * - Ein spaeterer Zukunftstermin ausserhalb des Zeitfensters beeinflusst actualDate nicht.
 *
 * Fehlerfaelle:
 * - actualDate folgt versehentlich einer Heute-oder-Zukunft-Regel statt der aktuellen Fensterlogik.
 * - Ein spaeterer Termin ueberschreibt den fruehesten aktiven Termin im abgefragten Fenster.
 * - Termine ausserhalb des Reportfensters fliessen in actualDate ein.
 *
 * Ziel:
 * Das aktuelle Ist-Verhalten der actualDate-Berechnung der Vorlaufliste dokumentieren und regressionssicher absichern.
 */
/*
 * Beobachtetes Ist-Verhalten aus getVorlauflistePaged():
 * a) Mehrere aktive Termine im Zeitfenster liefern als actualDate den fruehesten aktiven Termin im Zeitfenster.
 * b) Liegen ein vergangener und ein zukuenftiger Termin vor, aber nur der vergangene im Zeitfenster,
 *    dann liefert actualDate den vergangenen Termin.
 * c) Liegen vergangener und zukuenftiger Termin beide aktiv im Zeitfenster,
 *    dann liefert actualDate den vergangenen Termin als fruehesten aktiven Termin im Zeitfenster.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProjectFixture,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createReportProjectWithAppointments(params: {
  prefix: string;
  appointmentDates: string[];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    firstName: "Actual",
    lastName: `${params.prefix} Kunde`,
  });

  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });

  for (const startDate of params.appointmentDates) {
    await createAppointmentFixture({
      projectId: project.id,
      startDate,
    });
  }

  return project;
}

describe("FT26 integration: report vorlaufliste actualDate", () => {
  it("uses the earliest active appointment when multiple active appointments are inside the report window", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createReportProjectWithAppointments({
      prefix: "FT26-ACTUAL-A",
      appointmentDates: ["2099-12-18", "2099-12-12", "2099-12-25"],
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-12-01&toDate=2099-12-31&page=1&pageSize=100")
      .expect(200);

    const row = (response.body.items as Array<{ projectId: number; actualDate: string }>).find((item) => item.projectId === project.id);
    expect(row?.actualDate).toBe("2099-12-12");
  });

  it("keeps a past appointment as actualDate when only that appointment is inside the report window", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createReportProjectWithAppointments({
      prefix: "FT26-ACTUAL-B",
      appointmentDates: ["2099-02-10", "2099-03-15"],
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-02-01&toDate=2099-02-28&page=1&pageSize=100")
      .expect(200);

    const row = (response.body.items as Array<{ projectId: number; actualDate: string }>).find((item) => item.projectId === project.id);
    expect(row?.actualDate).toBe("2099-02-10");
  });

  it("uses the earlier past appointment when past and future appointments are both inside the report window", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createReportProjectWithAppointments({
      prefix: "FT26-ACTUAL-C",
      appointmentDates: ["2099-04-10", "2099-04-20"],
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-04-01&toDate=2099-04-30&page=1&pageSize=100")
      .expect(200);

    const row = (response.body.items as Array<{ projectId: number; actualDate: string }>).find((item) => item.projectId === project.id);
    expect(row?.actualDate).toBe("2099-04-10");
  });
});
