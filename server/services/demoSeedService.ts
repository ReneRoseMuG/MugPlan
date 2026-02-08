import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { InsertAppointment } from "@shared/schema";
import {
  buildStoredFilename,
  resolveMimeType,
  sanitizeFilename,
  writeAttachmentBuffer,
} from "../lib/attachmentFiles";
import { renderTemplate } from "../lib/templateRender";
import { loadSaunaSeedData } from "../seed/csvLoader";
import type { OvenRow, SaunaModelRow } from "../seed/types";
import { createDemoDataFiller } from "./demoDataFiller";
import * as customersService from "./customersService";
import * as employeesService from "./employeesService";
import * as projectsService from "./projectsService";
import * as projectStatusService from "./projectStatusService";
import * as teamsService from "./teamsService";
import * as toursService from "./toursService";
import * as employeesRepository from "../repositories/employeesRepository";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as projectAttachmentsService from "./projectAttachmentsService";
import * as demoSeedRepository from "../repositories/demoSeedRepository";
import * as userSettingsService from "./userSettingsService";

const logPrefix = "[demo-seed-service]";

const TEMPLATE_KEYS = {
  projectTitle: "templates.project.title",
  projectDescription: "templates.project.description",
  mountTitle: "templates.appointment.mount.title",
  reklTitle: "templates.appointment.intraday.rekl.title",
} as const;

const allowedTemplateKeys = new Set<string>([
  "sauna_model_name",
  "sauna_art_nr",
  "sauna_gtin",
  "sauna_category",
  "sauna_shape",
  "sauna_has_vorraum",
  "sauna_l_cm",
  "sauna_w_cm",
  "sauna_h_cm",
  "sauna_wall_thickness_mm",
  "sauna_outer_wood",
  "sauna_interior_wood",
  "sauna_roof_variants",
  "sauna_roof_colors",
  "sauna_windows_doors",
  "sauna_dimensions_note",
  "sauna_product_page_url",
  "oven_name",
  "oven_type",
  "oven_power_kw",
  "oven_brand",
  "oven_price_eur",
]);

type SeedConfig = {
  employees: number;
  customers: number;
  projects: number;
  appointmentsPerProject: number;
  generateAttachments: boolean;
  randomSeed?: number;
  seedWindowDaysMin?: number;
  seedWindowDaysMax?: number;
  reklDelayDaysMin?: number;
  reklDelayDaysMax?: number;
  reklShare?: number;
  locale?: string;
};

type SeedSummary = {
  seedRunId: string;
  createdAt: string;
  requested: {
    employees: number;
    customers: number;
    projects: number;
    appointmentsPerProject: number;
    generateAttachments: boolean;
    seedWindowDaysMin: number;
    seedWindowDaysMax: number;
    reklDelayDaysMin: number;
    reklDelayDaysMax: number;
    reklShare: number;
    locale: string;
  };
  created: {
    employees: number;
    customers: number;
    projects: number;
    projectStatusRelations: number;
    appointments: number;
    mountAppointments: number;
    reklAppointments: number;
    teams: number;
    tours: number;
    attachments: number;
  };
  reductions: {
    appointments: number;
    reklMissingOven: number;
    reklSkippedConstraints: number;
  };
  warnings: string[];
};

type PurgeSummary = {
  seedRunId: string;
  deleted: {
    appointments: number;
    projects: number;
    customers: number;
    employees: number;
    teams: number;
    tours: number;
    projectStatusRelations: number;
    appointmentEmployees: number;
    attachments: number;
    mappingRows: number;
    seedRuns: number;
  };
  warnings: string[];
  noOp: boolean;
};

class DeterministicRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

function deriveSeed(seedRunId: string, explicitSeed?: number) {
  if (Number.isFinite(explicitSeed)) return Number(explicitSeed);
  const hash = crypto.createHash("sha256").update(seedRunId).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16);
}

function hashInt(input: string) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16);
}

function addDays(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function nextWorkday(date: Date) {
  const adjusted = new Date(date);
  while (isWeekend(adjusted)) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaults(config: SeedConfig) {
  return {
    employees: config.employees,
    customers: config.customers,
    projects: config.projects,
    appointmentsPerProject: config.appointmentsPerProject,
    generateAttachments: config.generateAttachments,
    randomSeed: config.randomSeed,
    seedWindowDaysMin: config.seedWindowDaysMin ?? 60,
    seedWindowDaysMax: config.seedWindowDaysMax ?? 90,
    reklDelayDaysMin: config.reklDelayDaysMin ?? 14,
    reklDelayDaysMax: config.reklDelayDaysMax ?? 42,
    reklShare: config.reklShare ?? 0.33,
    locale: config.locale ?? "de",
  };
}

function createSaunaContext(model: SaunaModelRow, oven: OvenRow | null) {
  return {
    sauna_model_name: model.saunaModelName,
    sauna_art_nr: model.saunaArtNr,
    sauna_gtin: model.saunaGtin,
    sauna_category: model.saunaCategory,
    sauna_shape: model.saunaShape,
    sauna_has_vorraum: model.saunaHasVorraum,
    sauna_l_cm: model.saunaLCm,
    sauna_w_cm: model.saunaWCm,
    sauna_h_cm: model.saunaHCm,
    sauna_wall_thickness_mm: model.saunaWallThicknessMm,
    sauna_outer_wood: model.saunaOuterWood,
    sauna_interior_wood: model.saunaInteriorWood,
    sauna_roof_variants: model.saunaRoofVariants,
    sauna_roof_colors: model.saunaRoofColors,
    sauna_windows_doors: model.saunaWindowsDoors,
    sauna_dimensions_note: model.saunaDimensionsNote,
    sauna_product_page_url: model.saunaProductPageUrl,
    oven_name: oven?.ovenName,
    oven_type: oven?.ovenType,
    oven_power_kw: oven?.ovenPowerKw,
    oven_brand: oven?.ovenBrand,
    oven_price_eur: oven?.ovenPriceEur,
  } satisfies Record<string, string | undefined>;
}

function resolveSelectedOven(
  seedRunId: string,
  modelId: string,
  ovenById: Map<string, OvenRow>,
  ovenIdsForModel: string[],
) {
  if (ovenIdsForModel.length === 0) return null;
  const index = hashInt(`${seedRunId}:${modelId}`) % ovenIdsForModel.length;
  const selectedId = ovenIdsForModel[index];
  return ovenById.get(selectedId) ?? null;
}

async function resolveSeedTemplates(warnings: string[]) {
  const defaultTemplates = {
    [TEMPLATE_KEYS.projectTitle]: "{sauna_model_name}",
    [TEMPLATE_KEYS.projectDescription]: `- Modell: {sauna_model_name}
- Art.-Nr.: {sauna_art_nr}
- GTIN: {sauna_gtin}
- Kategorie: {sauna_category}
- Form: {sauna_shape}
- Vorraum: {sauna_has_vorraum}
- Maße (L×B×H): {sauna_l_cm}×{sauna_w_cm}×{sauna_h_cm} cm
- Wandstärke: {sauna_wall_thickness_mm} mm
- Außenholz: {sauna_outer_wood}
- Innenholz: {sauna_interior_wood}
- Dach: {sauna_roof_variants}
- Dachfarben: {sauna_roof_colors}
- Fenster/Türen: {sauna_windows_doors}
- Hinweise: {sauna_dimensions_note}
- Ofen: {oven_name}
- Quelle: {sauna_product_page_url}`,
    [TEMPLATE_KEYS.mountTitle]: "Montage: {sauna_model_name}",
    [TEMPLATE_KEYS.reklTitle]: "Rekl. {oven_name}",
  };

  const userId = Number(process.env.SETTINGS_USER_ID ?? "1");
  if (!Number.isFinite(userId) || userId <= 0) {
    warnings.push("SETTINGS_USER_ID ungueltig; verwende Template-Defaults.");
    return defaultTemplates;
  }

  try {
    const resolved = await userSettingsService.getResolvedSettingsForUser(userId);
    const byKey = new Map(resolved.map((row) => [row.key, row.resolvedValue]));
    return {
      [TEMPLATE_KEYS.projectTitle]:
        typeof byKey.get(TEMPLATE_KEYS.projectTitle) === "string"
          ? String(byKey.get(TEMPLATE_KEYS.projectTitle))
          : defaultTemplates[TEMPLATE_KEYS.projectTitle],
      [TEMPLATE_KEYS.projectDescription]:
        typeof byKey.get(TEMPLATE_KEYS.projectDescription) === "string"
          ? String(byKey.get(TEMPLATE_KEYS.projectDescription))
          : defaultTemplates[TEMPLATE_KEYS.projectDescription],
      [TEMPLATE_KEYS.mountTitle]:
        typeof byKey.get(TEMPLATE_KEYS.mountTitle) === "string"
          ? String(byKey.get(TEMPLATE_KEYS.mountTitle))
          : defaultTemplates[TEMPLATE_KEYS.mountTitle],
      [TEMPLATE_KEYS.reklTitle]:
        typeof byKey.get(TEMPLATE_KEYS.reklTitle) === "string"
          ? String(byKey.get(TEMPLATE_KEYS.reklTitle))
          : defaultTemplates[TEMPLATE_KEYS.reklTitle],
    };
  } catch {
    warnings.push("Template-Settings konnten nicht aufgeloest werden; verwende Defaults.");
    return defaultTemplates;
  }
}

function buildPdfBuffer(seedRunId: string, projectId: number): Buffer {
  const content = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R >>
endobj
4 0 obj << /Length 66 >>
stream
BT /F1 12 Tf 20 120 Td (Demo Seed ${seedRunId} Project ${projectId}) Tj ET
endstream
endobj
trailer << /Root 1 0 R >>
%%EOF`;
  return Buffer.from(content, "utf8");
}

function buildDocxLikeBuffer(seedRunId: string, projectId: number): Buffer {
  return Buffer.from(`Demo DOCX placeholder for ${seedRunId} / project ${projectId}\n`, "utf8");
}

async function createProjectAttachmentFromBuffer(
  projectId: number,
  originalName: string,
  buffer: Buffer,
) {
  const safeName = sanitizeFilename(originalName);
  const filename = buildStoredFilename(safeName);
  const storagePath = writeAttachmentBuffer(filename, buffer);
  return projectAttachmentsService.createProjectAttachment({
    projectId,
    filename,
    originalName: safeName,
    mimeType: resolveMimeType(safeName, null),
    fileSize: buffer.length,
    storagePath,
  });
}

function createMountDate(index: number, count: number, startDate: Date, minDays: number, maxDays: number) {
  const span = Math.max(0, maxDays - minDays);
  const offset = count <= 1 ? minDays : minDays + Math.floor((index * span) / (count - 1));
  return nextWorkday(addDays(startDate, offset));
}

function createReklDate(
  seedRunId: string,
  projectId: number,
  mountDate: Date,
  minDays: number,
  maxDays: number,
) {
  const span = Math.max(0, maxDays - minDays + 1);
  const startOffset = span <= 1 ? minDays : minDays + (hashInt(`${seedRunId}:delay:${projectId}`) % span);
  for (let i = 0; i < span; i += 1) {
    const offset = minDays + ((startOffset - minDays + i) % span);
    const candidate = addDays(mountDate, offset);
    if (!isWeekend(candidate)) {
      return candidate;
    }
  }
  return nextWorkday(addDays(mountDate, startOffset));
}

async function createAppointmentRecord(
  data: InsertAppointment,
  employeeIds: number[],
) {
  return appointmentsRepository.createAppointment(data, employeeIds);
}

export async function createSeedRun(inputConfig: SeedConfig): Promise<SeedSummary> {
  const config = defaults(inputConfig);
  const seedRunId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const warnings: string[] = [];
  const random = new DeterministicRandom(deriveSeed(seedRunId, config.randomSeed));
  const filler = createDemoDataFiller(deriveSeed(seedRunId, config.randomSeed));

  await demoSeedRepository.createSeedRun(seedRunId, config);
  console.info(`${logPrefix} create start`, { seedRunId, config });

  const templates = await resolveSeedTemplates(warnings);
  const saunaData = loadSaunaSeedData();
  warnings.push(...saunaData.warnings);

  const created = {
    employees: 0,
    customers: 0,
    projects: 0,
    projectStatusRelations: 0,
    appointments: 0,
    mountAppointments: 0,
    reklAppointments: 0,
    teams: 0,
    tours: 0,
    attachments: 0,
  };
  const reductions = {
    appointments: 0,
    reklMissingOven: 0,
    reklSkippedConstraints: 0,
  };

  const teams: number[] = [];
  const tours: number[] = [];
  const employees: number[] = [];
  const customers: number[] = [];

  for (let i = 0; i < 2; i += 1) {
    const team = await teamsService.createTeam({ color: random.pick(["#0f766e", "#0369a1", "#be123c", "#4d7c0f"]) });
    teams.push(team.id);
    created.teams += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "team", team.id);
  }

  for (let i = 0; i < 3; i += 1) {
    const tour = await toursService.createTour({ color: random.pick(["#1d4ed8", "#7c3aed", "#b91c1c", "#0f766e"]) });
    tours.push(tour.id);
    created.tours += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "tour", tour.id);
  }

  const seedPrefix = seedRunId.slice(0, 8);
  for (let i = 0; i < config.employees; i += 1) {
    const employee = await employeesService.createEmployee(filler.nextEmployee(i, seedPrefix));
    employees.push(employee.id);
    created.employees += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "employee", employee.id);
  }

  for (const employeeId of employees) {
    await employeesRepository.setEmployeeTeam(employeeId, random.pick(teams));
    await employeesRepository.setEmployeeTour(employeeId, random.pick(tours));
  }

  for (let i = 0; i < config.customers; i += 1) {
    const customer = await customersService.createCustomer(filler.nextCustomer(i, seedPrefix));
    customers.push(customer.id);
    created.customers += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "customer", customer.id);
  }

  const maxProjects = Math.min(config.projects, saunaData.saunaModels.length);
  if (maxProjects < config.projects) {
    warnings.push(`Nur ${maxProjects} Projekte erzeugbar, da CSV nur ${saunaData.saunaModels.length} Modelle enthaelt.`);
  }

  const ovenById = new Map(saunaData.ovens.map((oven) => [oven.ovenId, oven]));
  const ovenIdsByModelId = new Map<string, string[]>();
  for (const mapping of saunaData.mappings) {
    if (!mapping.modelId || !mapping.ovenId) continue;
    const list = ovenIdsByModelId.get(mapping.modelId) ?? [];
    list.push(mapping.ovenId);
    ovenIdsByModelId.set(mapping.modelId, list);
  }

  const statuses = await projectStatusService.listProjectStatuses("active");
  if (statuses.length === 0) {
    warnings.push("Keine aktiven Projektstatus gefunden; Status-Zuordnungen wurden uebersprungen.");
  }

  const startDate = addDays(new Date(), 1);
  const employeeDaySlots = new Map<number, Set<string>>();
  for (const employeeId of employees) {
    employeeDaySlots.set(employeeId, new Set<string>());
  }

  const mountRecords: Array<{ projectId: number; model: SaunaModelRow; mountDate: Date; selectedOven: OvenRow | null; tourId: number }> = [];

  for (let i = 0; i < maxProjects; i += 1) {
    const model = saunaData.saunaModels[i];
    const customerId = customers.length > 0 ? random.pick(customers) : null;
    if (!customerId) {
      warnings.push("Keine Kunden erzeugt; Projektanlage uebersprungen.");
      break;
    }

    const possibleOvenIds = ovenIdsByModelId.get(model.modelId) ?? [];
    const selectedOven = resolveSelectedOven(seedRunId, model.modelId, ovenById, possibleOvenIds);
    const ctx = createSaunaContext(model, selectedOven);

    const project = await projectsService.createProject({
      name: renderTemplate(templates[TEMPLATE_KEYS.projectTitle], ctx, { allowedKeys: allowedTemplateKeys }) || model.saunaModelName || `Sauna ${i + 1}`,
      customerId,
      descriptionMd: renderTemplate(templates[TEMPLATE_KEYS.projectDescription], ctx, { allowedKeys: allowedTemplateKeys }),
    });
    created.projects += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "project", project.id);

    if (statuses.length > 0) {
      const statusId = random.pick(statuses).id;
      await projectStatusService.addProjectStatus(project.id, statusId);
      created.projectStatusRelations += 1;
    }

    const mountDate = createMountDate(i, maxProjects, startDate, config.seedWindowDaysMin, config.seedWindowDaysMax);
    const tourId = random.pick(tours);
    const dateKey = toDateString(mountDate);

    const employeesForTour = employees.filter((employeeId) => {
      const set = employeeDaySlots.get(employeeId);
      return !(set?.has(dateKey));
    });
    if (employeesForTour.length === 0) {
      reductions.appointments += 1;
      warnings.push(`Montage fuer Projekt ${project.id} nicht erzeugt (keine verfuegbaren Mitarbeiter).`);
      continue;
    }

    const selectedEmployeeCount = Math.min(employeesForTour.length, random.int(1, 3));
    const selectedEmployeeIds = employeesForTour.slice(0, selectedEmployeeCount);

    const mountAppointment = await createAppointmentRecord(
      {
        projectId: project.id,
        tourId,
        title:
          renderTemplate(templates[TEMPLATE_KEYS.mountTitle], ctx, { allowedKeys: allowedTemplateKeys }) ||
          `Montage: ${model.saunaModelName}`,
        description: null,
        startDate: mountDate,
        startTime: null,
        endDate: null,
        endTime: null,
      },
      selectedEmployeeIds,
    );
    created.appointments += 1;
    created.mountAppointments += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "appointment_mount", mountAppointment.id);
    for (const employeeId of selectedEmployeeIds) {
      employeeDaySlots.get(employeeId)?.add(dateKey);
    }

    mountRecords.push({
      projectId: project.id,
      model,
      mountDate,
      selectedOven,
      tourId,
    });
  }

  let forcedReklProjectId: number | null = null;
  if (config.reklShare > 0) {
    const ovenBackedProjects = mountRecords.filter((record) => record.selectedOven !== null);
    const sharePercent = Math.round(config.reklShare * 100);
    const selectedByShare = ovenBackedProjects.filter(
      (record) => (hashInt(`${seedRunId}:rekl:${record.projectId}`) % 100) < sharePercent,
    );
    if (ovenBackedProjects.length > 0 && selectedByShare.length === 0) {
      const idx = hashInt(`${seedRunId}:force-rekl`) % ovenBackedProjects.length;
      forcedReklProjectId = ovenBackedProjects[idx]?.projectId ?? null;
      if (forcedReklProjectId !== null) {
        warnings.push(
          "Rekla-Share haette keine Termine erzeugt; ein Rekla-Termin wurde deterministisch erzwungen.",
        );
      }
    }
  }

  for (const record of mountRecords) {
    const sharePercent = Math.round(config.reklShare * 100);
    const shouldCreateRekl =
      (hashInt(`${seedRunId}:rekl:${record.projectId}`) % 100) < sharePercent ||
      record.projectId === forcedReklProjectId;
    if (!shouldCreateRekl) continue;

    if (!record.selectedOven) {
      reductions.reklMissingOven += 1;
      continue;
    }

    const reklDate = createReklDate(
      seedRunId,
      record.projectId,
      record.mountDate,
      config.reklDelayDaysMin,
      config.reklDelayDaysMax,
    );
    const dateKey = toDateString(reklDate);

    const availableEmployees = employees.filter((employeeId) => !employeeDaySlots.get(employeeId)?.has(dateKey));
    if (availableEmployees.length === 0) {
      reductions.reklSkippedConstraints += 1;
      continue;
    }

    const ctx = createSaunaContext(record.model, record.selectedOven);
    const selectedEmployeeIds = availableEmployees.slice(0, Math.min(availableEmployees.length, 2));
    const reklAppointment = await createAppointmentRecord(
      {
        projectId: record.projectId,
        tourId: record.tourId,
        title:
          renderTemplate(templates[TEMPLATE_KEYS.reklTitle], ctx, { allowedKeys: allowedTemplateKeys }) ||
          `Rekl. ${record.selectedOven.ovenName}`,
        description: null,
        startDate: reklDate,
        startTime: "11:00:00",
        endDate: null,
        endTime: null,
      },
      selectedEmployeeIds,
    );
    created.appointments += 1;
    created.reklAppointments += 1;
    await demoSeedRepository.addSeedRunEntity(seedRunId, "appointment_rekl", reklAppointment.id);
    for (const employeeId of selectedEmployeeIds) {
      employeeDaySlots.get(employeeId)?.add(dateKey);
    }
  }

  if (config.generateAttachments && mountRecords.length > 0) {
    const attachProjectCount = Math.max(1, Math.floor(mountRecords.length * 0.3));
    const selectedProjects = mountRecords.slice(0, attachProjectCount);
    for (const record of selectedProjects) {
      const pdfAttachment = await createProjectAttachmentFromBuffer(
        record.projectId,
        `seed-${seedRunId.slice(0, 8)}-project-${record.projectId}.pdf`,
        buildPdfBuffer(seedRunId, record.projectId),
      );
      created.attachments += 1;
      await demoSeedRepository.addSeedRunEntity(seedRunId, "project_attachment", pdfAttachment.id);

      const docxAttachment = await createProjectAttachmentFromBuffer(
        record.projectId,
        `seed-${seedRunId.slice(0, 8)}-project-${record.projectId}.docx`,
        buildDocxLikeBuffer(seedRunId, record.projectId),
      );
      created.attachments += 1;
      await demoSeedRepository.addSeedRunEntity(seedRunId, "project_attachment", docxAttachment.id);
    }
  }

  const summary: SeedSummary = {
    seedRunId,
    createdAt,
    requested: {
      employees: config.employees,
      customers: config.customers,
      projects: config.projects,
      appointmentsPerProject: config.appointmentsPerProject,
      generateAttachments: config.generateAttachments,
      seedWindowDaysMin: config.seedWindowDaysMin,
      seedWindowDaysMax: config.seedWindowDaysMax,
      reklDelayDaysMin: config.reklDelayDaysMin,
      reklDelayDaysMax: config.reklDelayDaysMax,
      reklShare: config.reklShare,
      locale: config.locale,
    },
    created,
    reductions,
    warnings,
  };

  await demoSeedRepository.updateSeedRunSummary(seedRunId, summary);
  console.info(`${logPrefix} create finish`, {
    seedRunId,
    durationMs: Date.now() - new Date(createdAt).getTime(),
    created,
    reductions,
    warnings: warnings.length,
  });

  return summary;
}

export async function listSeedRuns() {
  const runs = await demoSeedRepository.listSeedRuns();
  return runs.map((run) => ({
    seedRunId: run.id,
    createdAt: run.createdAt.toISOString(),
    config: run.configJson as SeedConfig,
    summary: (run.summaryJson ?? {
      requested: {
        employees: 0,
        customers: 0,
        projects: 0,
        appointmentsPerProject: 1,
        generateAttachments: false,
        seedWindowDaysMin: 60,
        seedWindowDaysMax: 90,
        reklDelayDaysMin: 14,
        reklDelayDaysMax: 42,
        reklShare: 0.33,
        locale: "de",
      },
      created: {
        employees: 0,
        customers: 0,
        projects: 0,
        projectStatusRelations: 0,
        appointments: 0,
        mountAppointments: 0,
        reklAppointments: 0,
        teams: 0,
        tours: 0,
        attachments: 0,
      },
      reductions: {
        appointments: 0,
        reklMissingOven: 0,
        reklSkippedConstraints: 0,
      },
      warnings: [],
    }) as SeedSummary,
  }));
}

export async function purgeSeedRun(seedRunId: string): Promise<PurgeSummary> {
  const run = await demoSeedRepository.getSeedRun(seedRunId);
  if (!run) {
    return {
      seedRunId,
      deleted: {
        appointments: 0,
        projects: 0,
        customers: 0,
        employees: 0,
        teams: 0,
        tours: 0,
        projectStatusRelations: 0,
        appointmentEmployees: 0,
        attachments: 0,
        mappingRows: 0,
        seedRuns: 0,
      },
      warnings: [],
      noOp: true,
    };
  }

  const warnings: string[] = [];
  const entities = await demoSeedRepository.getSeedRunEntities(seedRunId);
  const idsByType: Record<string, number[]> = {};
  for (const entity of entities) {
    const list = idsByType[entity.entityType] ?? [];
    list.push(entity.entityId);
    idsByType[entity.entityType] = list;
  }

  const projectAttachmentIds = idsByType.project_attachment ?? [];
  const customerAttachmentIds = idsByType.customer_attachment ?? [];
  const employeeAttachmentIds = idsByType.employee_attachment ?? [];

  const [projectAttachmentRows, customerAttachmentRows, employeeAttachmentRows] = await Promise.all([
    demoSeedRepository.getProjectAttachmentsByIds(projectAttachmentIds),
    demoSeedRepository.getCustomerAttachmentsByIds(customerAttachmentIds),
    demoSeedRepository.getEmployeeAttachmentsByIds(employeeAttachmentIds),
  ]);

  const paths = [
    ...projectAttachmentRows.map((row) => row.storagePath),
    ...customerAttachmentRows.map((row) => row.storagePath),
    ...employeeAttachmentRows.map((row) => row.storagePath),
  ];

  for (const storagePath of paths) {
    try {
      fs.unlinkSync(path.resolve(storagePath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw err;
    }
  }

  const deleted = await demoSeedRepository.purgeSeedRun(seedRunId, idsByType);
  console.info(`${logPrefix} purge finish`, { seedRunId, deleted });

  return {
    seedRunId,
    deleted: {
      appointments: deleted.appointmentsDeleted,
      projects: deleted.projectsDeleted,
      customers: deleted.customersDeleted,
      employees: deleted.employeesDeleted,
      teams: deleted.teamsDeleted,
      tours: deleted.toursDeleted,
      projectStatusRelations: deleted.projectStatusRelationsDeleted,
      appointmentEmployees: deleted.appointmentEmployeesDeleted,
      attachments: deleted.attachmentsDeleted,
      mappingRows: deleted.mappingRows,
      seedRuns: deleted.seedRunsDeleted,
    },
    warnings,
    noOp: false,
  };
}
