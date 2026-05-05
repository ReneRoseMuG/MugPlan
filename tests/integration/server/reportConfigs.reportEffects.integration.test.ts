/**
 * Test Scope:
 *
 * Feature: Report-Presets mit Wirkung auf echte Reportdaten
 *
 * Abgedeckte Regeln:
 * - Jeder Report kann ein USER-Preset speichern, laden und mit echten Fixture-Daten ausführen.
 * - KW-basierte Presets unterstützen Start aktuelle KW, Start kommende KW und die Anzahl der KW als Zeitraum.
 * - Produktionsplanung-Presets dürfen ein Kategorie-Layout enthalten.
 * - Produktionsplanung erzeugt Projektkacheln nur noch über Sondermaß-Tags.
 * - Tourenplan-Presets wirken auf den bestehenden Druckvorschau-Endpunkt.
 *
 * Fehlerfälle:
 * - Preset-Konfigurationen werden gespeichert, beeinflussen aber den konkreten Report nicht.
 * - Kategorie-, Tag-, Tour- oder Shortcode-Filter gehen beim Preset-Roundtrip verloren.
 * - Gespeicherte Produktionsplanung-Layouts verschwinden aus Presets.
 * - Nicht-Sondermaß-Tags erzeugen weiterhin Produktionsplanung-Projektkacheln.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";

import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { resolveReportPresetRange } from "../../../server/services/reportConfigsService";
import {
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags } from "../../../shared/schema";
import type { ReportConfigReportKey, ReportPreset, ReportPresetConfig, ReportPresetRange } from "../../../shared/routes";
import { createApiTestApp, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTourFixture,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;
let presetCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "READER" | "DISPATCHER"): Promise<SuperAgentTest> {
  const token = `${roleCode.toLowerCase()}-report-effects-${authCounter}`;
  authCounter += 1;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: `test-${token}`,
    email: `test-${token}@local.test`,
    firstName: "Test",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return loginAgent(app, { username: `test-${token}`, password });
}

function nextPresetId(reportKey: ReportConfigReportKey): string {
  const presetId = `ft26-${reportKey}-effect-${presetCounter}`;
  presetCounter += 1;
  return presetId;
}

async function ensureExactTag(name: string, color = "#2563eb") {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) return existing;
  return createExactTagFixture(name, color);
}

async function saveUserPresetAndLoad(params: {
  agent: SuperAgentTest;
  reportKey: ReportConfigReportKey;
  presetId: string;
  name: string;
  config: ReportPresetConfig;
  actions?: Array<"GENERATE_REPORT" | "OPEN_PRINT_PREVIEW">;
}): Promise<ReportPreset> {
  await params.agent
    .put(`/api/report-configs/${params.reportKey}/presets/${params.presetId}`)
    .send({
      name: params.name,
      scope: "USER",
      config: params.config,
      actions: params.actions ?? ["GENERATE_REPORT"],
    })
    .expect(200);

  const presetsResponse = await params.agent.get(`/api/report-configs/${params.reportKey}`).expect(200);
  const preset = (presetsResponse.body.presets as ReportPreset[]).find((candidate) => candidate.id === params.presetId);
  expect(preset).toEqual(expect.objectContaining({
    id: params.presetId,
    reportKey: params.reportKey,
    scope: "USER",
    config: params.config,
  }));

  if (!preset) {
    throw new Error(`Preset ${params.presetId} was not returned.`);
  }
  return preset;
}

function orderNumberOf(project: Awaited<ReturnType<typeof createProjectFixture>>): string {
  const orderNumber = project.projectOrder?.orderNumber ?? project.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected project order number.");
  }
  return orderNumber;
}

async function createProjectWithAppointment(params: {
  prefix: string;
  appointmentDate: string;
  tourId?: number | null;
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    fullName: `${params.prefix} Kunde`,
  });
  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: params.appointmentDate,
    tourId: params.tourId ?? null,
  });

  return { customer, project, appointment };
}

describe("integration: report presets affect concrete reports", () => {
  it("applies a Vorlaufliste preset to real report rows", async () => {
    const reader = await createRoleAgent("READER");
    const range: ReportPresetRange = { mode: "calendarWeek", start: "current", weeks: 1 };
    const resolvedRange = resolveReportPresetRange(range, new Date("2110-03-03T12:00:00"));
    const fixture = await createProjectWithAppointment({
      prefix: "PRESET-VL",
      appointmentDate: resolvedRange.fromDate,
    });
    const product = await createProductFixture({
      categoryName: "Preset Vorlauf Produkte",
      name: "Preset Vorlauf Sauna",
      shortCode: "PVL-S",
    });
    await createProjectOrderItemFixture({
      projectId: fixture.project.id,
      orderNumber: orderNumberOf(fixture.project),
      productId: product.id,
      quantity: 1,
    });

    const preset = await saveUserPresetAndLoad({
      agent: reader,
      reportKey: "vorlaufliste",
      presetId: nextPresetId("vorlaufliste"),
      name: "Vorlauf aktuelle KW",
      config: {
        range,
        activeTab: "calendarWeek",
        useShortCodes: true,
        columnOrder: ["projectName", "actualDate", "articleValues"],
        hiddenColumns: ["notesCount"],
      },
      actions: ["GENERATE_REPORT", "OPEN_PRINT_PREVIEW"],
    });
    const appliedRange = resolveReportPresetRange(preset.config.range, new Date("2110-03-03T12:00:00"));

    const reportResponse = await reader
      .get("/api/reports/vorlaufliste")
      .query({
        fromDate: appliedRange.fromDate,
        toDate: appliedRange.toDate,
        useShortCodes: preset.config.useShortCodes,
        page: 1,
        pageSize: 100,
      })
      .expect(200);

    const row = reportResponse.body.items.find((item: { projectId: number }) => item.projectId === fixture.project.id);
    expect(row).toEqual(expect.objectContaining({
      projectId: fixture.project.id,
      customerFullName: fixture.customer.fullName,
      actualDate: resolvedRange.fromDate,
    }));
    expect(row.articleValues).toEqual(expect.arrayContaining([
      { categoryId: product.categoryId, value: "PVL-S" },
    ]));
  });

  it("applies a Produktionsplanung preset with layout and Sondermaß-only project cards", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const specialMeasureTag = await ensureExactTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, MANAGED_SPECIAL_MEASURE_TAG_COLOR);
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#888780");
    const range: ReportPresetRange = { mode: "calendarWeek", start: "next", weeks: 2 };
    const resolvedRange = resolveReportPresetRange(range, new Date("2110-04-06T12:00:00"));
    const product = await createProductFixture({
      categoryName: "Preset Produktion Produkte",
      name: "Preset Produktion Sauna",
      shortCode: "PPP-S",
    });
    const component = await createComponentFixture({
      categoryName: "Preset Produktion Komponenten",
      name: "Preset Produktion Fenster",
      shortCode: "PPP-F",
    });
    const specialProject = await createProjectWithAppointment({
      prefix: "PRESET-PP-SPECIAL",
      appointmentDate: resolvedRange.fromDate,
    });
    const remarksOnlyProject = await createProjectWithAppointment({
      prefix: "PRESET-PP-REMARKS",
      appointmentDate: resolvedRange.fromDate,
    });
    await attachProjectTagFixture(specialProject.project.id, specialMeasureTag.id);
    await attachProjectTagFixture(remarksOnlyProject.project.id, remarksTag.id);

    for (const fixture of [specialProject, remarksOnlyProject]) {
      await createProjectOrderItemFixture({
        projectId: fixture.project.id,
        orderNumber: orderNumberOf(fixture.project),
        productId: product.id,
        quantity: 1,
      });
      await createProjectOrderItemFixture({
        projectId: fixture.project.id,
        orderNumber: orderNumberOf(fixture.project),
        componentId: component.id,
        quantity: 1,
      });
    }

    const categoryLayout = [
      { categoryId: product.categoryId, block: 1, columns: 2 },
      { categoryId: component.categoryId, block: 2, columns: 1 },
    ];
    const preset = await saveUserPresetAndLoad({
      agent: dispatcher,
      reportKey: "produktionsplanung",
      presetId: nextPresetId("produktionsplanung"),
      name: "Produktion kommende KW",
      config: {
        range,
        activeTab: "columns",
        useShortCodes: true,
        productCategoryIds: [product.categoryId],
        componentCategoryIds: [component.categoryId],
        categoryLayout,
      },
    });
    expect(preset.config.categoryLayout).toEqual(categoryLayout);
    const appliedRange = resolveReportPresetRange(preset.config.range, new Date("2110-04-06T12:00:00"));

    const reportResponse = await dispatcher
      .get("/api/reports/produktionsplanung")
      .query({
        fromDate: appliedRange.fromDate,
        toDate: appliedRange.toDate,
        productCategoryIds: [product.categoryId],
        componentCategoryIds: [component.categoryId],
        useShortCodes: preset.config.useShortCodes,
      })
      .expect(200);

    expect(reportResponse.body.productCategoryGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoryId: product.categoryId }),
    ]));
    const projectIds = reportResponse.body.projectRows.map((row: { projectId: number }) => row.projectId);
    expect(projectIds).toContain(specialProject.project.id);
    expect(projectIds).not.toContain(remarksOnlyProject.project.id);

    const cardRow = reportResponse.body.projectRows.find((row: { projectId: number }) => row.projectId === specialProject.project.id);
    expect(cardRow.reportCardReasonTags).toEqual([
      expect.objectContaining({ id: specialMeasureTag.id, name: MANAGED_SPECIAL_MEASURE_TAG_NAME }),
    ]);
  });

  it("applies an Auftragsliste preset with tag, model and shortcode filters", async () => {
    const reader = await createRoleAgent("READER");
    const range: ReportPresetRange = { mode: "calendarWeek", start: "current", weeks: 2 };
    const resolvedRange = resolveReportPresetRange(range, new Date("2110-05-10T12:00:00"));
    const filterTag = await ensureExactTag("Preset Auftragsliste Filter", "#0f766e");
    const modelAlpha = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "Preset Modell Alpha",
      shortCode: "PMA",
    });
    const modelBeta = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "Preset Modell Beta",
      shortCode: "PMB",
    });
    const matchingProject = await createProjectWithAppointment({
      prefix: "PRESET-AL-MATCH",
      appointmentDate: resolvedRange.fromDate,
    });
    const filteredProject = await createProjectWithAppointment({
      prefix: "PRESET-AL-FILTERED",
      appointmentDate: resolvedRange.fromDate,
    });
    await attachProjectTagFixture(matchingProject.project.id, filterTag.id);
    await createProjectOrderItemFixture({
      projectId: matchingProject.project.id,
      orderNumber: orderNumberOf(matchingProject.project),
      productId: modelAlpha.id,
      quantity: 1,
    });
    await createProjectOrderItemFixture({
      projectId: filteredProject.project.id,
      orderNumber: orderNumberOf(filteredProject.project),
      productId: modelBeta.id,
      quantity: 1,
    });

    const preset = await saveUserPresetAndLoad({
      agent: reader,
      reportKey: "auftragsliste",
      presetId: nextPresetId("auftragsliste"),
      name: "Aufträge gefiltert",
      config: {
        range,
        activeTab: "calendarWeek",
        useShortCodes: true,
        productCategoryIds: [modelAlpha.categoryId],
        tagIds: [filterTag.id],
        saunaModels: [modelAlpha.name],
      },
    });
    const appliedRange = resolveReportPresetRange(preset.config.range, new Date("2110-05-10T12:00:00"));

    const reportResponse = await reader
      .get("/api/reports/auftragsliste")
      .query({
        fromDate: appliedRange.fromDate,
        toDate: appliedRange.toDate,
        productCategoryIds: [modelAlpha.categoryId],
        tagIds: [filterTag.id],
        saunaModels: [modelAlpha.name],
        useShortCodes: preset.config.useShortCodes,
      })
      .expect(200);

    const projectIds = reportResponse.body.items.map((item: { projectId: number }) => item.projectId);
    expect(projectIds).toContain(matchingProject.project.id);
    expect(projectIds).not.toContain(filteredProject.project.id);
    const row = reportResponse.body.items.find((item: { projectId: number }) => item.projectId === matchingProject.project.id);
    expect(row.articleValues).toEqual(expect.arrayContaining([
      { categoryId: modelAlpha.categoryId, value: "PMA" },
    ]));
  });

  it("applies a Tourenplan preset to the real print preview", async () => {
    const reader = await createRoleAgent("READER");
    const range: ReportPresetRange = { mode: "calendarWeek", start: "next", weeks: 1 };
    const resolvedRange = resolveReportPresetRange(range, new Date("2110-06-08T12:00:00"));
    const tour = await createTourFixture("#2266aa");
    const fixture = await createProjectWithAppointment({
      prefix: "PRESET-TP",
      appointmentDate: resolvedRange.fromDate,
      tourId: tour.id,
    });

    const preset = await saveUserPresetAndLoad({
      agent: reader,
      reportKey: "tourenplan",
      presetId: nextPresetId("tourenplan"),
      name: "Tourenplan kommende KW",
      config: {
        range,
        activeTab: "calendarWeek",
        allToursSelected: false,
        selectedTourIds: [tour.id],
        includeWithoutTour: false,
        printMode: "spardruck",
        fontSize: "large",
        orientation: "landscape",
      },
      actions: ["GENERATE_REPORT", "OPEN_PRINT_PREVIEW"],
    });
    expect(preset.config).toEqual(expect.objectContaining({
      selectedTourIds: [tour.id],
      printMode: "spardruck",
      fontSize: "large",
      orientation: "landscape",
    }));
    if (preset.config.range.mode !== "calendarWeek") {
      throw new Error("Expected calendarWeek range.");
    }
    const appliedRange = resolveReportPresetRange(preset.config.range, new Date("2110-06-08T12:00:00"));

    const previewResponse = await reader
      .get(`/api/tours/${tour.id}/print-preview`)
      .query({
        fromDate: appliedRange.fromDate,
        weekCount: preset.config.range.weeks,
      })
      .expect(200);

    expect(previewResponse.body.tour).toEqual(expect.objectContaining({ id: tour.id }));
    expect(previewResponse.body.appointments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: fixture.appointment.id,
        projectId: fixture.project.id,
        projectName: fixture.project.name,
      }),
    ]));
  });
});
