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
import * as usersRepository from "../repositories/usersRepository";
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

type DurationDays = 1 | 2 | 3;
type IntentKind = "mount" | "rekl";

type ProjectSeedContext = {
  projectId: number;
  model: SaunaModelRow;
  selectedOven: OvenRow | null;
};

type AppointmentIntent = {
  seq: number;
  kind: IntentKind;
  project: ProjectSeedContext;
  tourId: number;
  durationDays: DurationDays;
  weekIndex: number;
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

function createBadRequestError(message: string) {
  const err = new Error(message) as Error & { status?: number };
  err.status = 400;
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
    durationWeights: {
      1: 0.55,
      2: 0.30,
      3: 0.15,
    } as const,
    tourScatter: 0.8,
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
  allOvens: OvenRow[],
) {
  if (ovenIdsForModel.length > 0) {
    const index = hashInt(`${seedRunId}:${modelId}`) % ovenIdsForModel.length;
    const selectedId = ovenIdsForModel[index];
    const mapped = ovenById.get(selectedId);
    if (mapped) return mapped;
  }
  if (allOvens.length === 0) return null;
  const fallbackIndex = hashInt(`${seedRunId}:${modelId}:fallback`) % allOvens.length;
  return allOvens[fallbackIndex] ?? null;
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

  const configuredUserId = Number(process.env.SETTINGS_USER_ID ?? "1");
  const fallbackUserIds = await usersRepository.listActiveUserIds(10);
  const candidateUserIds = uniqueNumberList([configuredUserId, 1, ...fallbackUserIds]);

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

  console.info(`${logPrefix} template settings fallback defaults`, {
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
    [weights[1], weights[2], weights[3]],
    random,
  );
  const out: DurationDays[] = [];
  for (let i = 0; i < counts[0]; i += 1) out.push(1);
  for (let i = 0; i < counts[1]; i += 1) out.push(2);
  for (let i = 0; i < counts[2]; i += 1) out.push(3);
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
  if (duration === 3) return 3;
  if (duration === 2) return 4;
  return 5;
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
  return candidates;
}

function assignAvailableEmployees(params: {
  random: DeterministicRandom;
  employees: number[];
  employeeTourById: Map<number, number>;
  employeeDaySlots: Map<number, Set<string>>;
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
    tourId,
    startDate,
    durationDays,
    minCount,
    maxCount,
  } = params;
  const keys = dateRangeKeys(startDate, durationDays);
  const preferred = employees.filter((employeeId) => employeeTourById.get(employeeId) === tourId);
  const fallback = employees.filter((employeeId) => employeeTourById.get(employeeId) !== tourId);
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
    templates,
  } = params;
  const out: MaterializedAppointment[] = [];
  const reductions = {
    appointments: 0,
    reklSkippedConstraints: 0,
  };
  const localRandom = new DeterministicRandom(hashInt(`${seedRunId}:materialize`));

  for (const intent of intents) {
    const candidates = buildCandidateDatesForIntent({
      seedRunId,
      intent,
      config,
      anchorDate,
    });
    let created: MaterializedAppointment | null = null;
    for (let d = 0; d < candidates.length && !created; d += 1) {
      const startDate = candidates[d];
      const employeeIds = assignAvailableEmployees({
        random: localRandom,
        employees,
        employeeTourById,
        employeeDaySlots,
        tourId: intent.tourId,
        startDate,
        durationDays: intent.durationDays,
        minCount: intent.kind === "rekl" ? 1 : 1,
        maxCount: intent.kind === "rekl" ? 2 : 3,
      });
      if (employeeIds.length === 0) continue;
      const ctx = createSaunaContext(intent.project.model, intent.project.selectedOven);
      const endDate = intent.durationDays > 1 ? addDays(startDate, intent.durationDays - 1) : null;
      const startTime =
        intent.kind === "rekl"
          ? (["10:00:00", "11:00:00", "13:00:00", "15:00:00"][d % 4] ?? "11:00:00")
          : null;
      const titleTemplate = intent.kind === "rekl" ? TEMPLATE_KEYS.reklTitle : TEMPLATE_KEYS.mountTitle;
      const fallbackTitle =
        intent.kind === "rekl"
          ? `Rekl. ${intent.project.selectedOven?.ovenName ?? "Ofen"}`
          : `Montage: ${intent.project.model.saunaModelName}`;
      const appointment = await createAppointmentRecord(
        {
          projectId: intent.project.projectId,
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
      created = {
        id: appointment.id,
        kind: intent.kind,
        project: intent.project,
        startDate,
        tourId: intent.tourId,
      };
      out.push(created);
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
    const withOven = mountAppointments.filter((mount) => mount.project.selectedOven !== null);
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
    if (!mount.project.selectedOven) {
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
  return appointmentsRepository.createAppointment(data, employeeIds);
}

export async function createSeedRun(inputConfig: SeedConfig): Promise<SeedSummary> {
  const config = defaults(inputConfig);
  const seedRunId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const warnings: string[] = [];
  const random = new DeterministicRandom(deriveSeed(seedRunId, config.randomSeed));
  const filler = createDemoDataFiller(deriveSeed(seedRunId, config.randomSeed));
  const templates = await resolveSeedTemplates(seedRunId, config.locale);
  const saunaData = loadSaunaSeedData();
  warnings.push(...saunaData.warnings);
  if (saunaData.saunaModels.length === 0) {
    throw createBadRequestError("Keine Sauna-Modelle verfuegbar. Bitte CSV-Daten pruefen.");
  }

  let seedRunPersisted = false;
  try {
    await demoSeedRepository.createSeedRun(seedRunId, config);
    seedRunPersisted = true;
    console.info(`${logPrefix} create start`, { seedRunId, config });

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
    const employeeTourById = new Map<number, number>();
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
      const assignedTour = random.pick(tours);
      await employeesRepository.setEmployeeTour(employeeId, assignedTour);
      employeeTourById.set(employeeId, assignedTour);
    }

    for (let i = 0; i < config.customers; i += 1) {
      const customerPayload = filler.nextCustomer(i, seedPrefix);
      const customer = await customersService.createCustomer({
        ...customerPayload,
        customerNumber: String(i + 1),
      });
      customers.push(customer.id);
      created.customers += 1;
      await demoSeedRepository.addSeedRunEntity(seedRunId, "customer", customer.id);
    }

    const projectsToCreate = config.projects;

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
    const projectSeedContexts: ProjectSeedContext[] = [];

    for (let i = 0; i < projectsToCreate; i += 1) {
      const model = random.pick(saunaData.saunaModels);
      const customerId = customers.length > 0 ? random.pick(customers) : null;
      if (!customerId) {
        warnings.push("Keine Kunden erzeugt; Projektanlage uebersprungen.");
        break;
      }

      const possibleOvenIds = ovenIdsByModelId.get(model.modelId) ?? [];
      const selectedOven = resolveSelectedOven(
        seedRunId,
        model.modelId,
        ovenById,
        possibleOvenIds,
        saunaData.ovens,
      );
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

      projectSeedContexts.push({
        projectId: project.id,
        model,
        selectedOven,
      });
    }

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
  } catch (error) {
    if (seedRunPersisted) {
      try {
        await purgeSeedRun(seedRunId);
      } catch (cleanupError) {
        console.error(`${logPrefix} cleanup failed`, {
          seedRunId,
          message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }
    throw error;
  }
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
