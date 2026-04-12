import type { InsertNoteTemplate, Tour } from "@shared/schema";
import {
  MANAGED_COMPLAINT_TAG_COLOR,
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_MESSE_TAG_COLOR,
  MANAGED_MESSE_TAG_NAME,
  MANAGED_REMARKS_TAG_COLOR,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_VACANT_TAG_COLOR,
  RESERVED_VACANT_TAG_NAME,
} from "@shared/appointmentCancellation";
import * as masterDataRepository from "../repositories/masterDataRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as toursRepository from "../repositories/toursRepository";

export type SystemSeedResult = {
  logLines: string[];
};

type SeedTagDefinition = {
  name: string;
  color: string;
  isDefault: boolean;
};

type SeedTourDefinition = {
  name: string;
  color: string;
};

type SeedNoteTemplateDefinition = {
  title: string;
  body: string;
  cardColor: string;
  print: boolean;
  sortOrder: number;
};

const SYSTEM_TAGS: SeedTagDefinition[] = [
  { name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR, isDefault: true },
  { name: MANAGED_COMPLAINT_TAG_NAME, color: MANAGED_COMPLAINT_TAG_COLOR, isDefault: true },
  { name: MANAGED_SPECIAL_MEASURE_TAG_NAME, color: MANAGED_SPECIAL_MEASURE_TAG_COLOR, isDefault: true },
  { name: MANAGED_MESSE_TAG_NAME, color: MANAGED_MESSE_TAG_COLOR, isDefault: true },
  { name: MANAGED_REMARKS_TAG_NAME, color: MANAGED_REMARKS_TAG_COLOR, isDefault: true },
  { name: RESERVED_VACANT_TAG_NAME, color: RESERVED_VACANT_TAG_COLOR, isDefault: true },
];

const SYSTEM_TOURS: SeedTourDefinition[] = [
  { name: "Parkplatz", color: "#D4537E" },
  { name: "Schröder Halle", color: "#5C3317" },
  { name: "Tour 1", color: "#006B6F" },
  { name: "Tour 2", color: "#00ACB1" },
  { name: "Tour 3", color: "#00CFD5" },
  { name: "Tour 4", color: "#5B4B8A" },
];

const SYSTEM_NOTE_TEMPLATES: SeedNoteTemplateDefinition[] = [
  { title: "Reklamation", body: "", cardColor: "#FF011B", print: true, sortOrder: 10 },
  { title: "Messe Aufbau/Abbau", body: "", cardColor: "#3465A4", print: true, sortOrder: 20 },
  { title: "Info zum Termin", body: "", cardColor: "#888780", print: true, sortOrder: 30 },
];

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

function equalColor(left: string | null | undefined, right: string): boolean {
  return (left ?? "").trim().toLocaleLowerCase("de") === right.trim().toLocaleLowerCase("de");
}

function buildTemplateCreateInput(definition: SeedNoteTemplateDefinition): InsertNoteTemplate {
  return {
    title: definition.title,
    body: definition.body,
    cardColor: definition.cardColor,
    print: definition.print,
    sortOrder: definition.sortOrder,
    isActive: true,
    version: 1,
  };
}

async function seedTags(logLines: string[]): Promise<void> {
  const vakantTag = await masterDataRepository.getTagByNormalizedName("Vakant");
  if (vakantTag) {
    const migrateResult = await masterDataRepository.updateTagWithVersion(vakantTag.id, vakantTag.version, { name: "Geparkt" });
    if (migrateResult.kind === "updated") {
      logLines.push("Tag migriert: Vakant → Geparkt");
    }
  }

  for (const definition of SYSTEM_TAGS) {
    const before = await masterDataRepository.getTagByNormalizedName(definition.name);
    const seeded = await masterDataRepository.ensureTagDefinition(definition);

    if (!before) {
      logLines.push(`Tag angelegt: ${seeded.name}`);
      continue;
    }

    const changed = !equalColor(before.color, definition.color) || before.isDefault !== definition.isDefault;
    logLines.push(`${changed ? "Tag aktualisiert" : "Tag unverändert"}: ${seeded.name}`);
  }
}

function findTourByName(tours: Tour[], name: string): Tour | undefined {
  const normalizedName = normalizeName(name);
  return tours.find((tour) => normalizeName(tour.name) === normalizedName);
}

async function seedTours(logLines: string[]): Promise<void> {
  let currentTours = await toursRepository.getTours();

  const vakantTour = findTourByName(currentTours, "Vakant");
  if (vakantTour) {
    const migrateResult = await toursRepository.updateTourWithVersion(
      vakantTour.id,
      vakantTour.version,
      "Parkplatz",
      vakantTour.color,
    );
    if (migrateResult.kind === "updated") {
      logLines.push("Tour migriert: Vakant → Parkplatz");
      currentTours = await toursRepository.getTours();
    }
  }

  for (const definition of SYSTEM_TOURS) {
    const existing = findTourByName(currentTours, definition.name);
    if (!existing) {
      await toursRepository.createTour(definition.name, definition.color);
      logLines.push(`Tour angelegt: ${definition.name}`);
      currentTours = await toursRepository.getTours();
      continue;
    }

    if (equalColor(existing.color, definition.color)) {
      logLines.push(`Tour unverändert: ${existing.name}`);
      continue;
    }

    const updateResult = await toursRepository.updateTourWithVersion(
      existing.id,
      existing.version,
      existing.name,
      definition.color,
    );
    if (updateResult.kind !== "updated") {
      throw new Error(`Tour konnte nicht aktualisiert werden: ${existing.name}`);
    }
    logLines.push(`Tour aktualisiert: ${existing.name}`);
    currentTours = await toursRepository.getTours();
  }
}

async function seedNoteTemplates(logLines: string[]): Promise<void> {
  let currentTemplates = await noteTemplatesRepository.getNoteTemplates(false);

  for (const definition of SYSTEM_NOTE_TEMPLATES) {
    const existing = currentTemplates.find((template) => normalizeName(template.title) === normalizeName(definition.title));
    if (!existing) {
      await noteTemplatesRepository.createNoteTemplate(buildTemplateCreateInput(definition));
      logLines.push(`Notizvorlage angelegt: ${definition.title}`);
      currentTemplates = await noteTemplatesRepository.getNoteTemplates(false);
      continue;
    }

    const needsUpdate = !equalColor(existing.cardColor, definition.cardColor)
      || existing.print !== definition.print
      || existing.sortOrder !== definition.sortOrder;

    if (!needsUpdate) {
      logLines.push(`Notizvorlage unverändert: ${existing.title}`);
      continue;
    }

    const updateResult = await noteTemplatesRepository.updateNoteTemplateWithVersion(existing.id, existing.version, {
      cardColor: definition.cardColor,
      print: definition.print,
      sortOrder: definition.sortOrder,
    });
    if (updateResult.kind !== "updated") {
      throw new Error(`Notizvorlage konnte nicht aktualisiert werden: ${existing.title}`);
    }

    logLines.push(`Notizvorlage aktualisiert: ${existing.title}`);
    currentTemplates = await noteTemplatesRepository.getNoteTemplates(false);
  }
}

export async function applySystemSeed(): Promise<SystemSeedResult> {
  const logLines: string[] = [];

  await seedTags(logLines);
  await seedTours(logLines);
  await seedNoteTemplates(logLines);

  return { logLines };
}
