import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PROJECT_ARTICLE_FIELDS } from "@shared/projectArticleList";
import type { Component, InsertAppointment, NoteTemplate, Product } from "@shared/schema";
import {
  buildStoredFilename,
  resolveMimeType,
  sanitizeFilename,
  writeAttachmentBuffer,
} from "../lib/attachmentFiles";
import { renderTemplate } from "../lib/templateRender";
import { assignDemoTags, ensureDemoTags } from "../seed/tagSeeder";
import { createDemoDataFiller } from "./demoDataFiller";
import * as customersService from "./customersService";
import * as projectsService from "./projectsService";
import * as teamsService from "./teamsService";
import * as toursService from "./toursService";
import * as customersRepository from "../repositories/customersRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as projectsRepository from "../repositories/projectsRepository";
import * as usersRepository from "../repositories/usersRepository";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as masterDataRepository from "../repositories/masterDataRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as notesRepository from "../repositories/notesRepository";
import * as projectAttachmentsService from "./projectAttachmentsService";
import * as demoSeedRepository from "../repositories/demoSeedRepository";
import * as userSettingsService from "./userSettingsService";
import { assignEmployeesToGroups } from "./demoSeedAssignments";
import { logError, logInfo } from "../lib/logger";
import { assertSafeDemoSeedPurgeTarget } from "./demoSeedPurgeSafety";

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

type SeedRunType = "base" | "appointments" | "legacy";

type SeedConfig = {
  runType?: SeedRunType;
  baseSeedRunId?: string;
  customers?: number;
  projects?: number;
  appointmentsPerProject?: number;
  generateAttachments?: boolean;
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
  runType: SeedRunType;
  baseSeedRunId?: string;
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
    appointments: number;
    mountAppointments: number;
    reklAppointments: number;
    notes: number;
    noteTemplates: number;
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
  meta?: {
    employeeIds?: number[];
    projectContexts: Array<{
      projectId: number;
      modelName: string;
      ovenName: string | null;
    }>;
  };
};

type PurgeSummary = {
  seedRunId: string;
  deleted: {
    appointments: number;
    projects: number;
    customers: number;
    employees: number;
    notes: number;
    noteTemplates: number;
    teams: number;
    tours: number;
    appointmentEmployees: number;
    customerNotes: number;
    projectNotes: number;
    appointmentNotes: number;
    attachments: number;
    mappingRows: number;
    seedRuns: number;
  };
  warnings: string[];
  noOp: boolean;
};

type DurationDays = 1 | 2;
type IntentKind = "mount" | "rekl";

type ProjectSeedContext = {
  projectId: number;
  modelName: string;
  ovenName: string | null;
};

type AppointmentIntent = {
  seq: number;
  kind: IntentKind;
  project: ProjectSeedContext;
  tourId: number;
  durationDays: DurationDays;
  weekIndex: number;
  isIntraday: boolean;
  delayDays?: number;
  baseDate?: Date;
};

type MaterializedAppointment = {
  id: number;
  kind: IntentKind;
  project: ProjectSeedContext;
  startDate: Date;
  tourId: number;
};

type InternalSeedConfig = ReturnType<typeof defaults>;

type TourDaySlotState = {
  totalCount: number;
  hasAllDay: boolean;
  intradayStartTimes: Set<string>;
};

type SeedRunLike = {
  id: string;
  createdAt: Date;
  configJson: unknown;
  summaryJson: unknown;
};

type SeedMasterData = {
  products: Product[];
  componentsByFieldKey: Map<string, Component[]>;
};

type DemoNoteTemplateSeed = {
  title: string;
  body: string;
  cardColor: string;
  sortOrder: number;
};

const DEMO_NOTE_TEMPLATES: DemoNoteTemplateSeed[] = [
  {
    title: "Anreise beachten",
    body: "Bitte Anreise, Zufahrt und Parkmoeglichkeiten vor dem Termin pruefen.",
    cardColor: "#1d4ed8",
    sortOrder: 10,
  },
  {
    title: "Aufbau Start beachten",
    body: "Aufbau-Start mit Team und Ansprechpartner verbindlich abstimmen.",
    cardColor: "#b45309",
    sortOrder: 20,
  },
  {
    title: "Messeaufbau",
    body: "Messeaufbau auf Standflaeche, Materialanlieferung und Freigaben abstimmen.",
    cardColor: "#0f766e",
    sortOrder: 30,
  },
];

function createBadRequestError(message: string) {
  const err = new Error(message) as Error & { status?: number };
  err.status = 400;
  return err;
}

function createConflictError(message: string, dependentRunIds: string[]) {
  const err = new Error(message) as Error & {
    status?: number;
    dependentRunIds?: string[];
  };
  err.status = 409;
  err.dependentRunIds = dependentRunIds;
  return err;
}

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

function chooseHalfIds(ids: number[], seedRunId: string, scope: string) {
  if (ids.length === 0) return [];
  const targetCount = Math.floor(ids.length / 2);
  if (targetCount === 0) return [];
  return [...ids]
    .sort((a, b) => (hashInt(`${seedRunId}:${scope}:${a}`) - hashInt(`${seedRunId}:${scope}:${b}`)))
    .slice(0, targetCount);
}

function shouldUseSeedNoteTemplate(seedRunId: string, scope: string, entityId: number) {
  return (hashInt(`${seedRunId}:seed-note-template:${scope}:${entityId}`) % 3) === 0;
}

function buildSeedNoteBody(scope: "customer" | "project" | "appointment", entityId: number) {
  if (scope === "customer") {
    return `Seed-Hinweis fuer Kunde ${entityId}: Kontaktdaten und Erreichbarkeit vor Terminstart pruefen.`;
  }
  if (scope === "project") {
    return `Seed-Hinweis fuer Projekt ${entityId}: Materialstatus, Ansprechpartner und Ablauf vor Ausfuehrung abstimmen.`;
  }
  return `Seed-Hinweis fuer Termin ${entityId}: Zeitfenster, Team und Einsatzdetails vor Start gegenpruefen.`;
}

async function seedScopedNotes(params: {
  seedRunId: string;
  scope: "customer" | "project" | "appointment";
  entityIds: number[];
  templatePool: Array<{ id: number; title: string; body: string; cardColor: string | null }>;
  addRelationTx: (tx: Parameters<Parameters<typeof notesRepository.withNotesTransaction>[0]>[0], entityId: number, noteId: number) => Promise<void>;
}) {
  const { seedRunId, scope, entityIds, templatePool, addRelationTx } = params;
  const selectedEntityIds = chooseHalfIds(entityIds, seedRunId, `${scope}-notes`);
  let createdNotes = 0;
  let templatedNotes = 0;

  for (const entityId of selectedEntityIds) {
    const useTemplate = templatePool.length > 0 && shouldUseSeedNoteTemplate(seedRunId, scope, entityId);
    const selectedTemplate = useTemplate
      ? templatePool[hashInt(`${seedRunId}:${scope}:template:${entityId}`) % templatePool.length]
      : null;
    await notesRepository.withNotesTransaction(async (tx) => {
      const noteId = await notesRepository.createNoteTx(tx, {
        title: selectedTemplate?.title ?? `Seed-Notiz ${scope} ${entityId}`,
        body: selectedTemplate?.body ?? buildSeedNoteBody(scope, entityId),
        cardColor: selectedTemplate?.cardColor ?? null,
        print: true,
        cardColorLocked: selectedTemplate?.cardColor != null,
      });
      await addRelationTx(tx, entityId, noteId);
      await demoSeedRepository.addSeedRunEntity(seedRunId, "note", noteId);
    });
    createdNotes += 1;
    if (selectedTemplate) templatedNotes += 1;
  }

  return {
    createdNotes,
    templatedNotes,
  };
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaults(config: SeedConfig) {
  const runType: SeedRunType = config.runType ?? "legacy";
  return {
    runType,
    baseSeedRunId: typeof config.baseSeedRunId === "string" ? config.baseSeedRunId : undefined,
    employees: 0,
    customers: runType === "appointments" ? 0 : (config.customers ?? 10),
    projects: runType === "appointments" ? 0 : (config.projects ?? 30),
    appointmentsPerProject:
      runType === "base"
        ? 0
        : (config.appointmentsPerProject ?? 1),
    generateAttachments:
      runType === "appointments"
        ? false
        : (config.generateAttachments ?? true),
    randomSeed: config.randomSeed,
    seedWindowDaysMin: config.seedWindowDaysMin ?? 60,
    seedWindowDaysMax: config.seedWindowDaysMax ?? 90,
    reklDelayDaysMin: config.reklDelayDaysMin ?? 14,
    reklDelayDaysMax: config.reklDelayDaysMax ?? 42,
    reklShare: config.reklShare ?? 0.33,
    locale: config.locale ?? "de",
    durationWeights: {
      1: 0.8,
      2: 0.2,
    } as const,
    tourScatter: 0.8,
  };
}

async function loadExistingSeedEmployees(): Promise<number[]> {
  const rows = await employeesRepository.getEmployees("active");
  return uniqueNumberList(rows.map((row) => Number(row.id)));
}

function isFriday(date: Date) {
  return date.getDay() === 5;
}

function buildStartTimeOptions(kind: IntentKind) {
  return kind === "rekl"
    ? (["10:00:00", "11:00:00", "13:00:00", "15:00:00"] as const)
    : (["07:00:00", "08:00:00", "09:00:00", "12:00:00"] as const);
}

function shouldUseIntraday(seedRunId: string, seq: number, kind: IntentKind) {
  return (hashInt(`${seedRunId}:intraday:${kind}:${seq}`) % 100) < 20;
}

function chooseStartTime(seedRunId: string, seq: number, kind: IntentKind, attempt: number) {
  const options = buildStartTimeOptions(kind);
  const baseIndex = hashInt(`${seedRunId}:start-time:${kind}:${seq}`) % options.length;
  return options[(baseIndex + attempt) % options.length] ?? options[0];
}

function extractRunType(configJson: unknown): SeedRunType {
  if (!configJson || typeof configJson !== "object") return "legacy";
  const runType = (configJson as Record<string, unknown>).runType;
  if (runType === "base" || runType === "appointments" || runType === "legacy") {
    return runType;
  }
  return "legacy";
}

function extractBaseSeedRunId(configJson: unknown): string | undefined {
  if (!configJson || typeof configJson !== "object") return undefined;
  const value = (configJson as Record<string, unknown>).baseSeedRunId;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function extractMetaEmployeeIds(summaryJson: unknown): number[] {
  if (!summaryJson || typeof summaryJson !== "object") return [];
  const meta = (summaryJson as Record<string, unknown>).meta;
  if (!meta || typeof meta !== "object") return [];
  const employeeIds = (meta as Record<string, unknown>).employeeIds;
  if (!Array.isArray(employeeIds)) return [];
  return uniqueNumberList(employeeIds.filter((value): value is number => typeof value === "number"));
}

function findDependentAppointmentRunIds(baseSeedRunId: string, runs: SeedRunLike[]) {
  const dependent = runs
    .filter((run) => {
      const runType = extractRunType(run.configJson);
      const candidateBaseRunId = extractBaseSeedRunId(run.configJson);
      return runType === "appointments" && candidateBaseRunId === baseSeedRunId;
    })
    .map((run) => run.id);
  return dependent;
}

async function getNextCustomerNumberStart() {
  const numbers = await customersRepository.listCustomerNumbers();
  let max = 0;
  for (const value of numbers) {
    if (!/^\d+$/.test(value)) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }
  return max + 1;
}

async function getNextSeedOrderNumberStart() {
  const orderNumbers = await projectsRepository.listProjectOrderNumbers();
  let max = 99999;

  for (const value of orderNumbers) {
    const match = /^A(\d{6})A$/.exec(value);
    if (!match) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }

  return max + 1;
}

function formatSeedOrderNumber(value: number) {
  return `A${String(value).padStart(6, "0")}A`;
}

function createProjectTemplateContext(modelName: string, ovenName: string | null) {
  return {
    sauna_model_name: modelName,
    sauna_art_nr: undefined,
    sauna_gtin: undefined,
    sauna_category: undefined,
    sauna_shape: undefined,
    sauna_has_vorraum: undefined,
    sauna_l_cm: undefined,
    sauna_w_cm: undefined,
    sauna_h_cm: undefined,
    sauna_wall_thickness_mm: undefined,
    sauna_outer_wood: undefined,
    sauna_interior_wood: undefined,
    sauna_roof_variants: undefined,
    sauna_roof_colors: undefined,
    sauna_windows_doors: undefined,
    sauna_dimensions_note: undefined,
    sauna_product_page_url: undefined,
    oven_name: ovenName ?? undefined,
    oven_type: undefined,
    oven_power_kw: undefined,
    oven_brand: undefined,
    oven_price_eur: undefined,
  } satisfies Record<string, string | undefined>;
}

async function loadSeedMasterData(): Promise<SeedMasterData> {
  const products = await masterDataRepository.listProducts("active");
  if (products.length === 0) {
    throw createBadRequestError("Keine aktiven Produkte fuer den Demo-Seed verfuegbar.");
  }

  const [components, componentCategories] = await Promise.all([
    masterDataRepository.listComponents("active"),
    masterDataRepository.listComponentCategories("active"),
  ]);
  const componentsByFieldKey = new Map<string, Component[]>();

  for (const field of PROJECT_ARTICLE_FIELDS) {
    if (field.source !== "component") continue;
    const matchingCategory = componentCategories.find((category) => {
      const normalizedName = category.name.trim().toLocaleLowerCase("de");
      return (field.categoryAliases ?? [field.categoryName]).some((alias) => alias.trim().toLocaleLowerCase("de") === normalizedName);
    });
    if (!matchingCategory) {
      throw createBadRequestError(`Keine aktive Komponenten-Kategorie fuer Seed-Slot "${field.label}" verfuegbar.`);
    }

    const matchingComponents = components.filter((component) => component.categoryId === matchingCategory.id);
    if (matchingComponents.length === 0) {
      throw createBadRequestError(`Keine aktiven Komponenten fuer Seed-Slot "${field.label}" verfuegbar.`);
    }
    componentsByFieldKey.set(field.key, matchingComponents);
  }

  return {
    products,
    componentsByFieldKey,
  };
}

function pickSeedMasterDataSelection(
  seedRunId: string,
  projectIndex: number,
  random: DeterministicRandom,
  masterData: SeedMasterData,
) {
  const selectedProduct = random.pick(masterData.products);
  const selectedComponents = new Map<string, Component>();

  for (const field of PROJECT_ARTICLE_FIELDS) {
    if (field.source !== "component") continue;
    const pool = masterData.componentsByFieldKey.get(field.key) ?? [];
    if (pool.length === 0) {
      throw createBadRequestError(`Keine aktiven Komponenten fuer Seed-Slot "${field.label}" verfuegbar.`);
    }
    const selected = pool[hashInt(`${seedRunId}:project:${projectIndex}:${field.key}`) % pool.length] ?? pool[0];
    selectedComponents.set(field.key, selected);
  }

  return { selectedProduct, selectedComponents };
}

function buildShortLoremDescription(random: DeterministicRandom) {
  const sentences = [
    "Lorem ipsum dolor sit amet.",
    "Sed do eiusmod tempor.",
    "Ut enim ad minim veniam.",
    "Quis nostrud exercitation ullamco.",
    "Duis aute irure dolor.",
    "Excepteur sint occaecat cupidatat.",
  ];
  return seededShuffle(sentences, random).slice(0, random.int(1, 2)).join(" ");
}

async function buildProjectSeedContextsFromBaseRun(
  baseRun: SeedRunLike,
  projectIds: number[],
) {
  const uniqueProjectIds = uniqueNumberList(projectIds);
  if (uniqueProjectIds.length === 0) return [] as ProjectSeedContext[];

  const summaryJson = (baseRun.summaryJson ?? {}) as Record<string, unknown>;
  const meta = (summaryJson.meta ?? {}) as Record<string, unknown>;
  const projectContextsMetaRaw = Array.isArray(meta.projectContexts) ? meta.projectContexts : [];
  const projectMetaByProjectId = new Map<
    number,
    {
      modelName: string;
      ovenName: string | null;
    }
  >();
  for (const item of projectContextsMetaRaw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const projectId = Number(record.projectId);
    const modelName = String(record.modelName ?? "");
    const ovenNameRaw = record.ovenName;
    const ovenName = ovenNameRaw == null ? null : String(ovenNameRaw);
    if (!Number.isFinite(projectId) || projectId <= 0 || modelName.trim().length === 0) continue;
    projectMetaByProjectId.set(projectId, { modelName, ovenName });
  }

  const contexts: ProjectSeedContext[] = [];
  for (const projectId of uniqueProjectIds) {
    const project = await projectsService.getProject(projectId);
    if (!project) continue;
    const metaItem = projectMetaByProjectId.get(projectId);
    contexts.push({
      projectId: Number(project.id),
      modelName: metaItem?.modelName?.trim() || project.name,
      ovenName: metaItem?.ovenName?.trim() || null,
    });
  }

  return contexts;
}

function uniqueNumberList(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
}

function templateKeyCandidates(baseKey: string, locale: string) {
  const normalizedLocale = locale.trim().toLowerCase();
  const candidates = [
    `${baseKey}.${normalizedLocale}`,
    `${baseKey}_${normalizedLocale}`,
    baseKey,
    `${baseKey}.default`,
    `${baseKey}_default`,
  ];
  return Array.from(new Set(candidates));
}

function pickTemplateValue(
  byKey: Map<string, unknown>,
  baseKey: string,
  locale: string,
  fallback: string,
) {
  for (const key of templateKeyCandidates(baseKey, locale)) {
    const value = byKey.get(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return String(value);
    }
  }
  return fallback;
}

async function resolveSeedTemplates(seedRunId: string, locale: string) {
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

  const fallbackUserIds = await usersRepository.listActiveUserIds(10);
  const candidateUserIds = uniqueNumberList(fallbackUserIds);

  for (const candidateUserId of candidateUserIds) {
    try {
      const resolved = await userSettingsService.getResolvedSettingsForUser(candidateUserId);
      const byKey = new Map(resolved.map((row) => [row.key, row.resolvedValue]));
      return {
        [TEMPLATE_KEYS.projectTitle]: pickTemplateValue(
          byKey,
          TEMPLATE_KEYS.projectTitle,
          locale,
          defaultTemplates[TEMPLATE_KEYS.projectTitle],
        ),
        [TEMPLATE_KEYS.projectDescription]: pickTemplateValue(
          byKey,
          TEMPLATE_KEYS.projectDescription,
          locale,
          defaultTemplates[TEMPLATE_KEYS.projectDescription],
        ),
        [TEMPLATE_KEYS.mountTitle]: pickTemplateValue(
          byKey,
          TEMPLATE_KEYS.mountTitle,
          locale,
          defaultTemplates[TEMPLATE_KEYS.mountTitle],
        ),
        [TEMPLATE_KEYS.reklTitle]: pickTemplateValue(
          byKey,
          TEMPLATE_KEYS.reklTitle,
          locale,
          defaultTemplates[TEMPLATE_KEYS.reklTitle],
        ),
      };
    } catch {
      // Try next candidate user context.
    }
  }

  logInfo(`${logPrefix} template settings fallback defaults`, {
    seedRunId,
    locale,
    candidateUserIds,
  });
  return defaultTemplates;
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
  const storagePath = await writeAttachmentBuffer(filename, buffer);
  return projectAttachmentsService.createProjectAttachment({
    projectId,
    filename,
    originalName: safeName,
    mimeType: resolveMimeType(safeName, null),
    fileSize: buffer.length,
    storagePath,
  });
}

function seededShuffle<T>(items: T[], random: DeterministicRandom): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = random.int(0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function largestRemainderDistribute(
  total: number,
  weights: number[],
  random: DeterministicRandom,
): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const safeWeights = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const sum = safeWeights.reduce((acc, value) => acc + value, 0);
  const normalized = sum <= 0 ? safeWeights.map(() => 1 / safeWeights.length) : safeWeights.map((value) => value / sum);
  const exact = normalized.map((value) => value * total);
  const base = exact.map((value) => Math.floor(value));
  let remainder = total - base.reduce((acc, value) => acc + value, 0);
  const order = exact
    .map((value, index) => ({
      index,
      fractional: value - Math.floor(value),
      tie: random.next(),
    }))
    .sort((a, b) => {
      if (b.fractional !== a.fractional) return b.fractional - a.fractional;
      return b.tie - a.tie;
    });
  for (let i = 0; i < order.length && remainder > 0; i += 1) {
    base[order[i].index] += 1;
    remainder -= 1;
  }
  return base;
}

function buildDurationQuotaList(
  totalAppointments: number,
  weights: InternalSeedConfig["durationWeights"],
  random: DeterministicRandom,
): DurationDays[] {
  if (totalAppointments <= 0) return [];
  const counts = largestRemainderDistribute(
    totalAppointments,
    [weights[1], weights[2]],
    random,
  );
  const out: DurationDays[] = [];
  for (let i = 0; i < counts[0]; i += 1) out.push(1);
  for (let i = 0; i < counts[1]; i += 1) out.push(2);
  return seededShuffle(out, random);
}

function getWeekBucketCount(config: InternalSeedConfig) {
  return Math.max(1, Math.floor((config.seedWindowDaysMax - config.seedWindowDaysMin) / 7) + 1);
}

function distributeAppointmentsPerTour(
  totalAppointments: number,
  tours: number[],
  scatter: number,
  random: DeterministicRandom,
) {
  if (tours.length === 0) return [];
  const p = 1 + Math.max(0, scatter) * 2;
  const weights = tours.map(() => Math.pow(Math.max(0.0001, random.next()), p));
  const counts = largestRemainderDistribute(totalAppointments, weights, random);
  return tours.map((tourId, idx) => ({ tourId, count: counts[idx] }));
}

function distributeCountsAcrossWeeks(
  total: number,
  weekBucketCount: number,
  random: DeterministicRandom,
) {
  if (total <= 0) return new Array<number>(weekBucketCount).fill(0);
  const weights = Array.from({ length: weekBucketCount }, () => 1 + random.next());
  return largestRemainderDistribute(total, weights, random);
}

function planMountAppointmentIntents(params: {
  random: DeterministicRandom;
  config: InternalSeedConfig;
  projects: ProjectSeedContext[];
  tours: number[];
}) {
  const { random, config, projects, tours } = params;
  const totalAppointments = projects.length * Math.max(1, config.appointmentsPerProject);
  if (totalAppointments <= 0 || projects.length === 0 || tours.length === 0) return [] as AppointmentIntent[];

  const durations = buildDurationQuotaList(totalAppointments, config.durationWeights, random);
  const weekBucketCount = getWeekBucketCount(config);
  const perTour = distributeAppointmentsPerTour(totalAppointments, tours, config.tourScatter, random);

  const projectPool: ProjectSeedContext[] = [];
  while (projectPool.length < totalAppointments) {
    projectPool.push(...seededShuffle(projects, random));
  }

  const intents: AppointmentIntent[] = [];
  let durationCursor = 0;
  let projectCursor = 0;
  let seq = 0;

  for (const tourPlan of perTour) {
    const weekCounts = distributeCountsAcrossWeeks(tourPlan.count, weekBucketCount, random);
    for (let weekIndex = 0; weekIndex < weekCounts.length; weekIndex += 1) {
      for (let c = 0; c < weekCounts[weekIndex]; c += 1) {
        const jitter = random.next() < 0.2 ? 1 : 0;
        const project = projectPool[(projectCursor + jitter) % projectPool.length];
        projectCursor += 1;
        intents.push({
          seq,
          kind: "mount",
          project,
          tourId: tourPlan.tourId,
          durationDays: durations[durationCursor % durations.length] ?? 1,
          weekIndex,
          isIntraday: shouldUseIntraday(`${project.projectId}:${tourPlan.tourId}`, seq, "mount"),
        });
        durationCursor += 1;
        seq += 1;
      }
    }
  }

  return intents;
}

function toMonday(date: Date) {
  const out = new Date(date);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function dateRangeKeys(startDate: Date, durationDays: number) {
  const keys: string[] = [];
  for (let i = 0; i < durationDays; i += 1) {
    keys.push(toDateString(addDays(startDate, i)));
  }
  return keys;
}

function touchesWeekend(startDate: Date, durationDays: number) {
  for (let i = 0; i < durationDays; i += 1) {
    if (isWeekend(addDays(startDate, i))) return true;
  }
  return false;
}

function durationMaxStartDay(duration: DurationDays) {
  if (duration === 2) return 4;
  return 5;
}

function prioritizeFridayCandidates(candidates: Date[], seedRunId: string, seq: number) {
  const preferred = candidates.filter((date) => !isFriday(date));
  const fridays = candidates.filter((date) => isFriday(date));
  if (fridays.length === 0) return preferred;
  if (preferred.length === 0) return fridays;
  const gatedFridays = fridays.filter(
    (date, index) => (hashInt(`${seedRunId}:friday:${seq}:${toDateString(date)}:${index}`) % 4) === 0,
  );
  return [...preferred, ...gatedFridays];
}

function buildCandidateDatesForIntent(params: {
  seedRunId: string;
  intent: AppointmentIntent;
  config: InternalSeedConfig;
  anchorDate: Date;
}) {
  const { seedRunId, intent, config, anchorDate } = params;
  const windowStart = addDays(anchorDate, config.seedWindowDaysMin);
  const windowEnd = addDays(anchorDate, config.seedWindowDaysMax);
  if (intent.kind === "rekl" && intent.baseDate && Number.isFinite(intent.delayDays)) {
    const reklWindowStart = addDays(anchorDate, config.seedWindowDaysMin);
    const reklWindowEnd = addDays(
      anchorDate,
      config.seedWindowDaysMax + Math.max(0, config.reklDelayDaysMax) + 7,
    );
    const targetDate = addDays(intent.baseDate, Number(intent.delayDays ?? 0));
    const shifts = [0, 1, -1, 2, -2];
    return shifts
      .map((shift) => addDays(targetDate, shift))
      .filter(
        (date) =>
          date >= reklWindowStart &&
          date <= reklWindowEnd &&
          !touchesWeekend(date, intent.durationDays),
      );
  }
  const base = addDays(windowStart, intent.weekIndex * 7);
  const baseMonday = toMonday(base);
  const maxWeek = getWeekBucketCount(config) - 1;
  const weekShifts = [0, 1, -1, 2, -2];
  const dayOrder = seededShuffle(
    Array.from({ length: durationMaxStartDay(intent.durationDays) }, (_, i) => i + 1),
    new DeterministicRandom(hashInt(`${seedRunId}:${intent.seq}:days`)),
  );

  const candidates: Date[] = [];
  for (const shift of weekShifts) {
    const targetWeek = Math.max(0, Math.min(maxWeek, intent.weekIndex + shift));
    const weekMonday = addDays(baseMonday, (targetWeek - intent.weekIndex) * 7);
    for (const weekday of dayOrder) {
      const candidate = addDays(weekMonday, weekday - 1);
      const endDate = addDays(candidate, intent.durationDays - 1);
      if (candidate < windowStart || candidate > windowEnd || endDate > windowEnd) continue;
      if (touchesWeekend(candidate, intent.durationDays)) continue;
      candidates.push(candidate);
    }
  }
  return prioritizeFridayCandidates(candidates, seedRunId, intent.seq);
}

function resolveCandidateWindowEndDate(params: {
  intent: AppointmentIntent;
  config: InternalSeedConfig;
  anchorDate: Date;
}) {
  const { intent, config, anchorDate } = params;
  if (intent.kind === "rekl") {
    return addDays(
      anchorDate,
      config.seedWindowDaysMax + Math.max(0, config.reklDelayDaysMax) + 7,
    );
  }
  return addDays(anchorDate, config.seedWindowDaysMax);
}

function resolveExtensionStartDate(params: {
  baseCandidates: Date[];
  intent: AppointmentIntent;
  config: InternalSeedConfig;
  anchorDate: Date;
}) {
  const { baseCandidates, intent, config, anchorDate } = params;
  const windowEnd = resolveCandidateWindowEndDate({ intent, config, anchorDate });
  if (baseCandidates.length === 0) {
    return addDays(windowEnd, 1);
  }
  const maxCandidateTime = baseCandidates.reduce((max, date) => Math.max(max, date.getTime()), Number.NEGATIVE_INFINITY);
  const maxCandidateDate = new Date(maxCandidateTime);
  const later = maxCandidateDate > windowEnd ? maxCandidateDate : windowEnd;
  return addDays(later, 1);
}

function getOrCreateTourDaySlotState(
  tourDaySlots: Map<string, TourDaySlotState>,
  key: string,
) {
  const existing = tourDaySlots.get(key);
  if (existing) return existing;
  const created: TourDaySlotState = {
    totalCount: 0,
    hasAllDay: false,
    intradayStartTimes: new Set<string>(),
  };
  tourDaySlots.set(key, created);
  return created;
}

function canPlaceOnTourDay(
  state: TourDaySlotState,
  startTime: string | null,
) {
  if (state.totalCount >= 2) return false;
  if (startTime == null) {
    return !state.hasAllDay;
  }
  if (state.intradayStartTimes.has(startTime)) return false;
  return true;
}

function canPlaceOnTourDays(params: {
  tourDaySlots: Map<string, TourDaySlotState>;
  tourId: number;
  startDate: Date;
  durationDays: number;
  startTime: string | null;
}) {
  const { tourDaySlots, tourId, startDate, durationDays, startTime } = params;
  for (const dateKey of dateRangeKeys(startDate, durationDays)) {
    const key = `${tourId}:${dateKey}`;
    const state = tourDaySlots.get(key) ?? {
      totalCount: 0,
      hasAllDay: false,
      intradayStartTimes: new Set<string>(),
    };
    if (!canPlaceOnTourDay(state, startTime)) {
      return false;
    }
  }
  return true;
}

function markTourDayPlacement(params: {
  tourDaySlots: Map<string, TourDaySlotState>;
  tourId: number;
  startDate: Date;
  durationDays: number;
  startTime: string | null;
}) {
  const { tourDaySlots, tourId, startDate, durationDays, startTime } = params;
  for (const dateKey of dateRangeKeys(startDate, durationDays)) {
    const key = `${tourId}:${dateKey}`;
    const state = getOrCreateTourDaySlotState(tourDaySlots, key);
    state.totalCount += 1;
    if (startTime == null) {
      state.hasAllDay = true;
    } else {
      state.intradayStartTimes.add(startTime);
    }
  }
}

function assignAvailableEmployees(params: {
  random: DeterministicRandom;
  employees: number[];
  employeeTourById: Map<number, number>;
  employeeDaySlots: Map<number, Set<string>>;
  strictTourBinding: boolean;
  tourId: number;
  startDate: Date;
  durationDays: number;
  minCount: number;
  maxCount: number;
}) {
  const {
    random,
    employees,
    employeeTourById,
    employeeDaySlots,
    strictTourBinding,
    tourId,
    startDate,
    durationDays,
    minCount,
    maxCount,
  } = params;
  const keys = dateRangeKeys(startDate, durationDays);
  const preferred = employees.filter((employeeId) => employeeTourById.get(employeeId) === tourId);
  if (preferred.length === 0 && strictTourBinding) return [];
  const fallback = strictTourBinding
    ? []
    : employees.filter((employeeId) => employeeTourById.get(employeeId) !== tourId);
  const ordered = [...seededShuffle(preferred, random), ...seededShuffle(fallback, random)];
  const available = ordered.filter((employeeId) => {
    const slots = employeeDaySlots.get(employeeId);
    return keys.every((key) => !slots?.has(key));
  });
  if (available.length === 0) return [];
  const desired = Math.min(
    available.length,
    Math.max(minCount, random.int(minCount, Math.max(minCount, maxCount))),
  );
  return available.slice(0, desired);
}

async function materializeAppointmentIntents(params: {
  seedRunId: string;
  intents: AppointmentIntent[];
  config: InternalSeedConfig;
  anchorDate: Date;
  employees: number[];
  employeeTourById: Map<number, number>;
  employeeDaySlots: Map<number, Set<string>>;
  tourDaySlots: Map<string, TourDaySlotState>;
  templates: Record<string, string>;
}) {
  const {
    seedRunId,
    intents,
    config,
    anchorDate,
    employees,
    employeeTourById,
    employeeDaySlots,
    tourDaySlots,
    templates,
  } = params;
  const out: MaterializedAppointment[] = [];
  const reductions = {
    appointments: 0,
    reklSkippedConstraints: 0,
  };
  const enforceAppointmentsRules = config.runType === "appointments";
  const localRandom = new DeterministicRandom(hashInt(`${seedRunId}:materialize`));

  for (const intent of intents) {
    const baseCandidates = buildCandidateDatesForIntent({
      seedRunId,
      intent,
      config,
      anchorDate,
    });
    const extensionStartDate = resolveExtensionStartDate({
      baseCandidates,
      intent,
      config,
      anchorDate,
    });
    let created: MaterializedAppointment | null = null;
    let attempt = 0;
    const maxAttempts = enforceAppointmentsRules ? Number.POSITIVE_INFINITY : baseCandidates.length;
    while (!created) {
      if (attempt >= maxAttempts) break;
      const startDate =
        attempt < baseCandidates.length
          ? baseCandidates[attempt]
          : addDays(extensionStartDate, attempt - baseCandidates.length);
      if (touchesWeekend(startDate, intent.durationDays)) {
        attempt += 1;
        continue;
      }
      if (isFriday(startDate) && (hashInt(`${seedRunId}:friday-extension:${intent.seq}:${attempt}`) % 4) !== 0) {
        attempt += 1;
        continue;
      }
      const startTime = intent.isIntraday
        ? chooseStartTime(seedRunId, intent.seq, intent.kind, attempt)
        : null;
      if (enforceAppointmentsRules && !canPlaceOnTourDays({
        tourDaySlots,
        tourId: intent.tourId,
        startDate,
        durationDays: intent.durationDays,
        startTime,
      })) {
        attempt += 1;
        continue;
      }
      const employeeIds = assignAvailableEmployees({
        random: localRandom,
        employees,
        employeeTourById,
        employeeDaySlots,
        strictTourBinding: enforceAppointmentsRules,
        tourId: intent.tourId,
        startDate,
        durationDays: intent.durationDays,
        minCount: intent.kind === "rekl" ? 1 : 1,
        maxCount: intent.kind === "rekl" ? 2 : 3,
      });
      if (employeeIds.length === 0) {
        attempt += 1;
        continue;
      }
      const ctx = createProjectTemplateContext(intent.project.modelName, intent.project.ovenName);
      const endDate = intent.durationDays > 1 ? addDays(startDate, intent.durationDays - 1) : null;
      const titleTemplate = intent.kind === "rekl" ? TEMPLATE_KEYS.reklTitle : TEMPLATE_KEYS.mountTitle;
      const fallbackTitle =
        intent.kind === "rekl"
          ? `Rekl. ${intent.project.ovenName ?? "Ofen"}`
          : `Montage: ${intent.project.modelName}`;
      const linkedProject = await projectsService.getProject(intent.project.projectId);
      if (!linkedProject) {
        attempt += 1;
        continue;
      }
      const appointment = await createAppointmentRecord(
        {
          projectId: intent.project.projectId,
          customerId: linkedProject.customerId,
          tourId: intent.tourId,
          title: renderTemplate(templates[titleTemplate], ctx, { allowedKeys: allowedTemplateKeys }) || fallbackTitle,
          description: null,
          startDate,
          startTime,
          endDate,
          endTime: null,
        },
        employeeIds,
      );
      for (const employeeId of employeeIds) {
        const slots = employeeDaySlots.get(employeeId) ?? new Set<string>();
        for (const key of dateRangeKeys(startDate, intent.durationDays)) {
          slots.add(key);
        }
        employeeDaySlots.set(employeeId, slots);
      }
      if (enforceAppointmentsRules) {
        markTourDayPlacement({
          tourDaySlots,
          tourId: intent.tourId,
          startDate,
          durationDays: intent.durationDays,
          startTime,
        });
      }
      created = {
        id: appointment.id,
        kind: intent.kind,
        project: intent.project,
        startDate,
        tourId: intent.tourId,
      };
      out.push(created);
      attempt += 1;
    }
    if (!created) {
      if (intent.kind === "rekl") {
        reductions.reklSkippedConstraints += 1;
      } else {
        reductions.appointments += 1;
      }
    }
  }

  return {
    createdAppointments: out,
    reductions,
  };
}

function buildReklIntents(params: {
  seedRunId: string;
  config: InternalSeedConfig;
  mountAppointments: MaterializedAppointment[];
}) {
  const { seedRunId, config, mountAppointments } = params;
  let seq = 1_000_000;
  const out: AppointmentIntent[] = [];
  let reklMissingOven = 0;
  let forcedProjectId: number | null = null;
  if (config.reklShare > 0) {
    const withOven = mountAppointments.filter((mount) => mount.project.ovenName !== null);
    const sharePercent = Math.round(config.reklShare * 100);
    const selected = withOven.filter(
      (mount) => (hashInt(`${seedRunId}:rekl:${mount.project.projectId}`) % 100) < sharePercent,
    );
    if (withOven.length > 0 && selected.length === 0) {
      forcedProjectId =
        withOven[hashInt(`${seedRunId}:force-rekl`) % withOven.length]?.project.projectId ?? null;
    }
  }

  for (const mount of mountAppointments) {
    const sharePercent = Math.round(config.reklShare * 100);
    const selectedByShare =
      (hashInt(`${seedRunId}:rekl:${mount.project.projectId}`) % 100) < sharePercent ||
      mount.project.projectId === forcedProjectId;
    if (!selectedByShare) continue;
    if (!mount.project.ovenName) {
      reklMissingOven += 1;
      continue;
    }
    const span = Math.max(0, config.reklDelayDaysMax - config.reklDelayDaysMin + 1);
    const delayCandidates = seededShuffle(
      Array.from({ length: span }, (_, idx) => config.reklDelayDaysMin + idx),
      new DeterministicRandom(hashInt(`${seedRunId}:delay:${mount.project.projectId}`)),
    );
    const delay =
      delayCandidates.find((candidate) => !isWeekend(addDays(mount.startDate, candidate))) ??
      config.reklDelayDaysMin;
    const weekIndex = Math.max(
      0,
      Math.floor((Math.max(config.seedWindowDaysMin, 0) + delay) / 7),
    );
    out.push({
      seq,
      kind: "rekl",
      project: mount.project,
      tourId: mount.tourId,
      durationDays: 1,
      weekIndex,
      isIntraday: true,
      delayDays: delay,
      baseDate: mount.startDate,
    });
    seq += 1;
  }
  return { intents: out, reklMissingOven };
}

async function createAppointmentRecord(
  data: InsertAppointment,
  employeeIds: number[],
) {
  const startTimeHour = data.startTime == null ? null : Number(data.startTime.slice(0, 2));
  const endDate = data.endDate ?? data.startDate;
  return appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
      employeeIds,
      startDate: data.startDate,
      endDate,
      startTimeHour,
    });
    if (conflictEmployees.length > 0) {
      throw createBadRequestError("Seed-Termin kollidiert mit bestehender Mitarbeiterzuweisung");
    }
    const appointmentId = await appointmentsRepository.createAppointmentTx(tx, data);
    await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, employeeIds);
    const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
    if (!appointment) {
      throw createBadRequestError("Seed-Termin konnte nicht geladen werden");
    }
    return appointment;
  });
}

export async function createSeedRun(inputConfig: SeedConfig): Promise<SeedSummary> {
  const config = defaults(inputConfig);
  const seedRunId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const warnings: string[] = [];
  const random = new DeterministicRandom(deriveSeed(seedRunId, config.randomSeed));
  const filler = createDemoDataFiller(deriveSeed(seedRunId, config.randomSeed));
  const templates = await resolveSeedTemplates(seedRunId, config.locale);

  let seedRunPersisted = false;
  try {
    await demoSeedRepository.createSeedRun(seedRunId, config);
    seedRunPersisted = true;
    logInfo(`${logPrefix} create start`, { seedRunId, config });

    let demoTags: Array<{ id: number; name: string; color: string }> = [];

    try {
      const tagSeedResult = await ensureDemoTags();
      demoTags = tagSeedResult.tags;
      logInfo(`${logPrefix} demo tag seed`, { seedRunId, ...tagSeedResult.result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(`${logPrefix} demo tag seed failed`, { seedRunId, message });
      warnings.push(`Tag-Seed fehlgeschlagen: ${message}`);
    }

    const created = {
      employees: 0,
      customers: 0,
      projects: 0,
      appointments: 0,
      mountAppointments: 0,
      reklAppointments: 0,
      notes: 0,
      noteTemplates: 0,
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
    const employeeTourById = new Map<number, number>();
    const customers: number[] = [];
    const projectSeedContexts: ProjectSeedContext[] = [];
    let seedNoteTemplatesPool: NoteTemplate[] = [];
    let seedMasterData: SeedMasterData | null = null;

    if (config.runType === "appointments") {
      seedNoteTemplatesPool = await noteTemplatesRepository.getNoteTemplates(true);
      if (!config.baseSeedRunId) {
        throw createBadRequestError("Fuer Termine-Seed ist baseSeedRunId erforderlich.");
      }
      const baseRun = (await demoSeedRepository.getSeedRun(config.baseSeedRunId)) as SeedRunLike | null;
      if (!baseRun) {
        throw createBadRequestError(`Basis-Run nicht gefunden: ${config.baseSeedRunId}`);
      }
      if (extractRunType(baseRun.configJson) !== "base") {
        throw createBadRequestError("Termine-Seed darf nur auf einem Basisdaten-Run aufsetzen.");
      }

      const baseEntities = await demoSeedRepository.getSeedRunEntities(baseRun.id);
      const idsByType: Record<string, number[]> = {};
      for (const entity of baseEntities) {
        const list = idsByType[entity.entityType] ?? [];
        list.push(Number(entity.entityId));
        idsByType[entity.entityType] = list;
      }

      const baseProjectIds = uniqueNumberList(idsByType.project ?? []);
      const baseEmployeeIds = uniqueNumberList([
        ...extractMetaEmployeeIds(baseRun.summaryJson),
        ...(idsByType.employee ?? []),
      ]);
      const baseTourIds = uniqueNumberList(idsByType.tour ?? []);
      if (baseProjectIds.length === 0) {
        throw createBadRequestError("Basis-Run enthaelt keine Projekte.");
      }
      if (baseEmployeeIds.length === 0) {
        throw createBadRequestError("Basis-Run enthaelt keine Mitarbeitenden.");
      }
      if (baseTourIds.length === 0) {
        throw createBadRequestError("Basis-Run enthaelt keine Touren.");
      }

      const availableTours = await toursService.listTours();
      tours.push(...availableTours.filter((tour) => baseTourIds.includes(Number(tour.id))).map((tour) => Number(tour.id)));
      if (tours.length === 0) {
        throw createBadRequestError("Keine gueltigen Touren aus dem Basis-Run verfuegbar.");
      }

      for (const employeeId of baseEmployeeIds) {
        const employee = await employeesRepository.getEmployee(employeeId);
        if (!employee) continue;
        if (!employee.tourId) continue;
        const assignedTourId = Number(employee.tourId);
        if (!baseTourIds.includes(assignedTourId)) continue;
        employees.push(Number(employee.id));
        employeeTourById.set(Number(employee.id), assignedTourId);
      }
      if (employees.length === 0) {
        throw createBadRequestError("Keine gueltigen Mitarbeitenden aus dem Basis-Run verfuegbar.");
      }

      const toursWithEmployees = new Set<number>(Array.from(employeeTourById.values()));
      const filteredTours = tours.filter((tourId) => toursWithEmployees.has(tourId));
      if (filteredTours.length === 0) {
        throw createBadRequestError("Keine Touren mit zugewiesenen Mitarbeitenden verfuegbar.");
      }
      if (filteredTours.length !== tours.length) {
        warnings.push("Touren ohne zugewiesene Mitarbeitende wurden fuer den Termine-Seed ausgeschlossen.");
      }
      tours.splice(0, tours.length, ...filteredTours);

      projectSeedContexts.push(
        ...(await buildProjectSeedContextsFromBaseRun(baseRun, baseProjectIds)),
      );
      if (projectSeedContexts.length === 0) {
        throw createBadRequestError("Keine gueltigen Projekt-Kontexte aus dem Basis-Run verfuegbar.");
      }
    } else {
      seedNoteTemplatesPool = await noteTemplatesRepository.getNoteTemplates(true);
      seedMasterData = await loadSeedMasterData();

      for (let i = 0; i < 3; i += 1) {
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

      employees.push(...(await loadExistingSeedEmployees()));
      if (employees.length === 0) {
        throw createBadRequestError("Keine aktiven Mitarbeitenden fuer den Demo-Seed verfuegbar.");
      }

      const seedPrefix = seedRunId.slice(0, 8);

      if (config.runType === "base") {
        const minAssignmentsPerGroup = employees.length >= teams.length ? 1 : 0;
        const teamAssignment = assignEmployeesToGroups({
          employeeIds: employees,
          groupIds: teams,
          minPerGroup: minAssignmentsPerGroup,
          maxPerGroup: 3,
          randomInt: (min, max) => random.int(min, max),
        });
        const minTourAssignmentsPerGroup = employees.length >= tours.length ? 1 : 0;
        const tourAssignment = assignEmployeesToGroups({
          employeeIds: employees,
          groupIds: tours,
          minPerGroup: minTourAssignmentsPerGroup,
          maxPerGroup: 3,
          randomInt: (min, max) => random.int(min, max),
        });

        for (const employeeId of employees) {
          const assignedTeam = teamAssignment.byEmployeeId.get(employeeId) ?? null;
          await employeesRepository.setEmployeeTeam(employeeId, assignedTeam);
          const assignedTour = tourAssignment.byEmployeeId.get(employeeId) ?? null;
          await employeesRepository.setEmployeeTour(employeeId, assignedTour);
          if (assignedTour != null) {
            employeeTourById.set(employeeId, assignedTour);
          }
        }
      } else {
        for (const employeeId of employees) {
          await employeesRepository.setEmployeeTeam(employeeId, random.pick(teams));
          const assignedTour = random.pick(tours);
          await employeesRepository.setEmployeeTour(employeeId, assignedTour);
          employeeTourById.set(employeeId, assignedTour);
        }
      }

      let nextCustomerNumber = await getNextCustomerNumberStart();
      let nextOrderNumber = await getNextSeedOrderNumberStart();
      for (let i = 0; i < config.customers; i += 1) {
        const customerPayload = filler.nextCustomer(i, seedPrefix);
        const customer = await customersService.createCustomer({
          ...customerPayload,
          customerNumber: String(nextCustomerNumber),
        });
        nextCustomerNumber += 1;
        customers.push(customer.id);
        created.customers += 1;
        await demoSeedRepository.addSeedRunEntity(seedRunId, "customer", customer.id);
      }

      if (demoTags.length > 0) {
        try {
          const tagAssignmentResult = await assignDemoTags({
            tags: demoTags,
            customerIds: customers,
            employeeIds: employees,
            randomInt: (min, max) => random.int(min, max),
          });
          logInfo(`${logPrefix} demo tag assignment base entities`, {
            seedRunId,
            ...tagAssignmentResult,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logError(`${logPrefix} demo tag assignment base entities failed`, { seedRunId, message });
          warnings.push(`Tag-Zuordnung für Basisdaten fehlgeschlagen: ${message}`);
        }
      }

      const customerNotesSeed = await seedScopedNotes({
        seedRunId,
        scope: "customer",
        entityIds: customers,
        templatePool: seedNoteTemplatesPool,
        addRelationTx: notesRepository.addCustomerNoteRelationTx,
      });
      created.notes += customerNotesSeed.createdNotes;

      const projectsToCreate = config.projects;

      for (let i = 0; i < projectsToCreate; i += 1) {
        const customerId = customers.length > 0 ? random.pick(customers) : null;
        if (!customerId) {
          warnings.push("Keine Kunden erzeugt; Projektanlage uebersprungen.");
          break;
        }
        if (!seedMasterData) {
          throw createBadRequestError("Seed-Stammdaten konnten nicht geladen werden.");
        }
        const selectedMasterData = pickSeedMasterDataSelection(seedRunId, i, random, seedMasterData);
        const selectedOven = selectedMasterData.selectedComponents.get("oven") ?? null;
        const projectTemplateContext = createProjectTemplateContext(
          selectedMasterData.selectedProduct.name,
          selectedOven?.name ?? null,
        );
        const rawProjectName =
          renderTemplate(templates[TEMPLATE_KEYS.projectTitle], projectTemplateContext, { allowedKeys: allowedTemplateKeys }) ||
          `${selectedMasterData.selectedProduct.name} Projekt ${i + 1}`;
        const orderNumber = formatSeedOrderNumber(nextOrderNumber);
        const project = await projectsService.createProject({
          name: rawProjectName.trim(),
          orderNumber,
          customerId,
          amount: String(random.int(7500, 18000)),
          descriptionMd: buildShortLoremDescription(random),
        });
        nextOrderNumber += 1;
        created.projects += 1;
        await demoSeedRepository.addSeedRunEntity(seedRunId, "project", project.id);
        await projectsService.createProjectOrderItem(project.id, {
          projectId: project.id,
          orderNumber,
          productId: selectedMasterData.selectedProduct.id,
          componentId: null,
          quantity: 1,
        });
        for (const field of PROJECT_ARTICLE_FIELDS) {
          if (field.source !== "component") continue;
          const component = selectedMasterData.selectedComponents.get(field.key);
          if (!component) {
            throw createBadRequestError(`Komponente fuer Seed-Slot "${field.label}" konnte nicht ausgewaehlt werden.`);
          }
          await projectsService.createProjectOrderItem(project.id, {
            projectId: project.id,
            orderNumber,
            productId: null,
            componentId: component.id,
            quantity: 1,
          });
        }

        projectSeedContexts.push({
          projectId: project.id,
          modelName: selectedMasterData.selectedProduct.name,
          ovenName: selectedOven?.name ?? null,
        });
      }

      if (demoTags.length > 0) {
        try {
          const tagAssignmentResult = await assignDemoTags({
            tags: demoTags,
            projectIds: projectSeedContexts.map((ctx) => ctx.projectId),
            randomInt: (min, max) => random.int(min, max),
          });
          logInfo(`${logPrefix} demo tag assignment projects`, {
            seedRunId,
            ...tagAssignmentResult,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logError(`${logPrefix} demo tag assignment projects failed`, { seedRunId, message });
          warnings.push(`Tag-Zuordnung für Projekte fehlgeschlagen: ${message}`);
        }
      }

      const projectNotesSeed = await seedScopedNotes({
        seedRunId,
        scope: "project",
        entityIds: projectSeedContexts.map((ctx) => ctx.projectId),
        templatePool: seedNoteTemplatesPool,
        addRelationTx: notesRepository.addProjectNoteRelationTx,
      });
      created.notes += projectNotesSeed.createdNotes;
    }

    const startDate = addDays(new Date(), 1);
    const employeeDaySlots = new Map<number, Set<string>>();
    for (const employeeId of employees) {
      employeeDaySlots.set(employeeId, new Set<string>());
    }
    const tourDaySlots = new Map<string, TourDaySlotState>();

    if (config.runType !== "base") {
      const mountIntents = planMountAppointmentIntents({
        random,
        config,
        projects: projectSeedContexts,
        tours,
      });
      const mountResult = await materializeAppointmentIntents({
        seedRunId,
        intents: mountIntents,
        config,
        anchorDate: startDate,
        employees,
        employeeTourById,
        employeeDaySlots,
        tourDaySlots,
        templates,
      });
      const mountAppointments = mountResult.createdAppointments.filter((appointment) => appointment.kind === "mount");
      const reklPlan = buildReklIntents({
        seedRunId,
        config,
        mountAppointments,
      });
      const reklResult = await materializeAppointmentIntents({
        seedRunId,
        intents: reklPlan.intents,
        config,
        anchorDate: startDate,
        employees,
        employeeTourById,
        employeeDaySlots,
        tourDaySlots,
        templates,
      });

      reductions.appointments += mountResult.reductions.appointments + reklResult.reductions.appointments;
      reductions.reklMissingOven += reklPlan.reklMissingOven;
      reductions.reklSkippedConstraints +=
        mountResult.reductions.reklSkippedConstraints + reklResult.reductions.reklSkippedConstraints;

      const allCreatedAppointments = [
        ...mountResult.createdAppointments,
        ...reklResult.createdAppointments,
      ];
      for (const appointment of allCreatedAppointments) {
        created.appointments += 1;
        if (appointment.kind === "mount") {
          created.mountAppointments += 1;
          await demoSeedRepository.addSeedRunEntity(seedRunId, "appointment_mount", appointment.id);
        } else {
          created.reklAppointments += 1;
          await demoSeedRepository.addSeedRunEntity(seedRunId, "appointment_rekl", appointment.id);
        }
      }

      const appointmentNotesSeed = await seedScopedNotes({
        seedRunId,
        scope: "appointment",
        entityIds: allCreatedAppointments.map((appointment) => appointment.id),
        templatePool: seedNoteTemplatesPool.length > 0
          ? seedNoteTemplatesPool
          : DEMO_NOTE_TEMPLATES.map((template, index) => ({
              id: index + 1,
              title: template.title,
              body: template.body,
              cardColor: template.cardColor,
            })),
        addRelationTx: notesRepository.addAppointmentNoteRelationTx,
      });
      created.notes += appointmentNotesSeed.createdNotes;

      if (demoTags.length > 0 && allCreatedAppointments.length > 0) {
        try {
          const tagAssignmentResult = await assignDemoTags({
            tags: demoTags,
            appointmentIds: allCreatedAppointments.map((appointment) => appointment.id),
            randomInt: (min, max) => random.int(min, max),
          });
          logInfo(`${logPrefix} demo tag assignment appointments`, {
            seedRunId,
            ...tagAssignmentResult,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logError(`${logPrefix} demo tag assignment appointments failed`, { seedRunId, message });
          warnings.push(`Tag-Zuordnung für Termine fehlgeschlagen: ${message}`);
        }
      }
    }

    if (config.generateAttachments && projectSeedContexts.length > 0) {
      const attachProjectCount = Math.max(1, Math.floor(projectSeedContexts.length * 0.3));
      const selectedProjects = seededShuffle(projectSeedContexts, random).slice(0, attachProjectCount);
      for (const projectCtx of selectedProjects) {
        const pdfAttachment = await createProjectAttachmentFromBuffer(
          projectCtx.projectId,
          `seed-${seedRunId.slice(0, 8)}-project-${projectCtx.projectId}.pdf`,
          buildPdfBuffer(seedRunId, projectCtx.projectId),
        );
        created.attachments += 1;
        await demoSeedRepository.addSeedRunEntity(seedRunId, "project_attachment", pdfAttachment.id);

        const docxAttachment = await createProjectAttachmentFromBuffer(
          projectCtx.projectId,
          `seed-${seedRunId.slice(0, 8)}-project-${projectCtx.projectId}.docx`,
          buildDocxLikeBuffer(seedRunId, projectCtx.projectId),
        );
        created.attachments += 1;
        await demoSeedRepository.addSeedRunEntity(seedRunId, "project_attachment", docxAttachment.id);
      }
    }

    const summary: SeedSummary = {
      seedRunId,
      createdAt,
      runType: config.runType,
      baseSeedRunId: config.baseSeedRunId,
      requested: {
        employees: employees.length,
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
      meta:
        config.runType === "base"
          ? {
              employeeIds: employees,
              projectContexts: projectSeedContexts.map((ctx) => ({
                projectId: ctx.projectId,
                modelName: ctx.modelName,
                ovenName: ctx.ovenName,
              })),
            }
          : undefined,
    };

    await demoSeedRepository.updateSeedRunSummary(seedRunId, summary);
    logInfo(`${logPrefix} create finish`, {
      seedRunId,
      durationMs: Date.now() - new Date(createdAt).getTime(),
      created,
      reductions,
      warnings: warnings.length,
    });

    return summary;
  } catch (error) {
    if (seedRunPersisted) {
      try {
        await purgeSeedRun(seedRunId);
      } catch (cleanupError) {
        logError(`${logPrefix} cleanup failed`, {
          seedRunId,
          message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }
    throw error;
  }
}

export async function listSeedRuns() {
  const runs = (await demoSeedRepository.listSeedRuns()) as SeedRunLike[];
  const dependentByBaseRunId = new Map<string, string[]>();
  for (const run of runs) {
    const runType = extractRunType(run.configJson);
    const baseSeedRunId = extractBaseSeedRunId(run.configJson);
    if (runType !== "appointments" || !baseSeedRunId) continue;
    const list = dependentByBaseRunId.get(baseSeedRunId) ?? [];
    list.push(run.id);
    dependentByBaseRunId.set(baseSeedRunId, list);
  }

  return Promise.all(runs.map(async (run) => ({
    seedRunId: run.id,
    createdAt: run.createdAt.toISOString(),
    config: run.configJson as SeedConfig,
    runType: extractRunType(run.configJson),
    baseSeedRunId: extractBaseSeedRunId(run.configJson),
    dependentRunIds: dependentByBaseRunId.get(run.id) ?? [],
    summary: (run.summaryJson ?? {
      seedRunId: run.id,
      createdAt: run.createdAt.toISOString(),
      runType: extractRunType(run.configJson),
      baseSeedRunId: extractBaseSeedRunId(run.configJson),
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
        appointments: 0,
        mountAppointments: 0,
        reklAppointments: 0,
        notes: 0,
        noteTemplates: 0,
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
  })));
}

export async function purgeSeedRun(seedRunId: string): Promise<PurgeSummary> {
  const run = (await demoSeedRepository.getSeedRun(seedRunId)) as SeedRunLike | null;
  if (!run) {
    return {
      seedRunId,
      deleted: {
        appointments: 0,
        projects: 0,
        customers: 0,
        employees: 0,
        notes: 0,
        noteTemplates: 0,
        teams: 0,
        tours: 0,
        appointmentEmployees: 0,
        customerNotes: 0,
        projectNotes: 0,
        appointmentNotes: 0,
        attachments: 0,
        mappingRows: 0,
        seedRuns: 0,
      },
      warnings: [],
      noOp: true,
    };
  }

  const runType = extractRunType(run.configJson);
  if (runType === "base") {
    const allRuns = (await demoSeedRepository.listSeedRuns()) as SeedRunLike[];
    const dependentRunIds = findDependentAppointmentRunIds(seedRunId, allRuns);
    if (dependentRunIds.length > 0) {
      throw createConflictError(
        "Basisdaten-Run kann nicht geloescht werden, solange abhaengige Termine-Runs existieren.",
        dependentRunIds,
      );
    }
  }

  await assertSafeDemoSeedPurgeTarget();

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
  logInfo(`${logPrefix} purge finish`, { seedRunId, deleted });

  return {
    seedRunId,
    deleted: {
      appointments: deleted.appointmentsDeleted,
      projects: deleted.projectsDeleted,
      customers: deleted.customersDeleted,
      employees: deleted.employeesDeleted,
      notes: deleted.notesDeleted,
      noteTemplates: deleted.noteTemplatesDeleted,
      teams: deleted.teamsDeleted,
      tours: deleted.toursDeleted,
      appointmentEmployees: deleted.appointmentEmployeesDeleted,
      customerNotes: deleted.customerNotesDeleted,
      projectNotes: deleted.projectNotesDeleted,
      appointmentNotes: deleted.appointmentNotesDeleted,
      attachments: deleted.attachmentsDeleted,
      mappingRows: deleted.mappingRows,
      seedRuns: deleted.seedRunsDeleted,
    },
    warnings,
    noOp: false,
  };
}
