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

export type SystemSeedEntityKind = "tag" | "tour" | "noteTemplate";
export type SystemSeedPreviewStatus = "missing" | "unchanged" | "update" | "migrate";

export type SystemSeedPreviewItem = {
  key: string;
  kind: SystemSeedEntityKind;
  label: string;
  status: SystemSeedPreviewStatus;
  message: string;
  canApply: boolean;
  checkedByDefault: boolean;
};

export type SystemSeedPreviewResult = {
  items: SystemSeedPreviewItem[];
};

export type SystemSeedApplyResult = {
  logLines: string[];
};

type SeedTagDefinition = {
  name: string;
  color: string;
  isDefault: boolean;
  legacyName?: string;
};

type SeedTourDefinition = {
  name: string;
  color: string;
  legacyName?: string;
};

type SeedNoteTemplateDefinition = {
  title: string;
  body: string;
  cardColor: string;
  print: boolean;
  sortOrder: number;
};

type SeedPreviewMeta<TKind extends SystemSeedEntityKind, TDefinition> = {
  item: SystemSeedPreviewItem;
  definition: TDefinition;
  kind: TKind;
};

const SYSTEM_TAGS: SeedTagDefinition[] = [
  { name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR, isDefault: true },
  { name: MANAGED_COMPLAINT_TAG_NAME, color: MANAGED_COMPLAINT_TAG_COLOR, isDefault: true },
  { name: MANAGED_SPECIAL_MEASURE_TAG_NAME, color: MANAGED_SPECIAL_MEASURE_TAG_COLOR, isDefault: false },
  { name: MANAGED_MESSE_TAG_NAME, color: MANAGED_MESSE_TAG_COLOR, isDefault: true },
  { name: MANAGED_REMARKS_TAG_NAME, color: MANAGED_REMARKS_TAG_COLOR, isDefault: true },
  { name: RESERVED_VACANT_TAG_NAME, color: RESERVED_VACANT_TAG_COLOR, isDefault: true, legacyName: "Vakant" },
];

const SYSTEM_TOURS: SeedTourDefinition[] = [
  { name: "Parkplatz", color: "#D4537E", legacyName: "Vakant" },
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

function buildTagKey(name: string): string {
  return `tag:${normalizeName(name)}`;
}

function buildTourKey(name: string): string {
  return `tour:${normalizeName(name)}`;
}

function buildNoteTemplateKey(title: string): string {
  return `noteTemplate:${normalizeName(title)}`;
}

function findTourByName(tours: Tour[], name: string): Tour | undefined {
  const normalizedName = normalizeName(name);
  return tours.find((tour) => normalizeName(tour.name) === normalizedName);
}

async function buildTagPreviewItems(): Promise<Array<SeedPreviewMeta<"tag", SeedTagDefinition>>> {
  const items: Array<SeedPreviewMeta<"tag", SeedTagDefinition>> = [];

  for (const definition of SYSTEM_TAGS) {
    const existing = await masterDataRepository.getTagByNormalizedName(definition.name);
    const legacy = !existing && definition.legacyName
      ? await masterDataRepository.getTagByNormalizedName(definition.legacyName)
      : null;

    let status: SystemSeedPreviewStatus;
    let message: string;

    if (!existing && legacy) {
      status = "migrate";
      message = `Wird aus ${legacy.name} migriert`;
    } else if (!existing) {
      status = "missing";
      message = "Fehlt und kann angelegt werden";
    } else if (!equalColor(existing.color, definition.color) || existing.isDefault !== definition.isDefault) {
      status = "update";
      message = "Vorhanden, aber weicht vom Sollzustand ab";
    } else {
      status = "unchanged";
      message = "Bereits im Sollzustand vorhanden";
    }

    items.push({
      kind: "tag",
      definition,
      item: {
        key: buildTagKey(definition.name),
        kind: "tag",
        label: definition.name,
        status,
        message,
        canApply: status !== "unchanged",
        checkedByDefault: status !== "unchanged",
      },
    });
  }

  return items;
}

async function buildTourPreviewItems(): Promise<Array<SeedPreviewMeta<"tour", SeedTourDefinition>>> {
  const currentTours = await toursRepository.getTours();

  return SYSTEM_TOURS.map((definition) => {
    const existing = findTourByName(currentTours, definition.name);
    const legacy = !existing && definition.legacyName ? findTourByName(currentTours, definition.legacyName) : undefined;

    let status: SystemSeedPreviewStatus;
    let message: string;

    if (!existing && legacy) {
      status = "migrate";
      message = `Wird aus ${legacy.name} migriert`;
    } else if (!existing) {
      status = "missing";
      message = "Fehlt und kann angelegt werden";
    } else if (!equalColor(existing.color, definition.color)) {
      status = "update";
      message = "Vorhanden, aber die Farbe weicht ab";
    } else {
      status = "unchanged";
      message = "Bereits im Sollzustand vorhanden";
    }

    return {
      kind: "tour" as const,
      definition,
      item: {
        key: buildTourKey(definition.name),
        kind: "tour" as const,
        label: definition.name,
        status,
        message,
        canApply: status !== "unchanged",
        checkedByDefault: status !== "unchanged",
      },
    };
  });
}

async function buildNoteTemplatePreviewItems(): Promise<Array<SeedPreviewMeta<"noteTemplate", SeedNoteTemplateDefinition>>> {
  const currentTemplates = await noteTemplatesRepository.getNoteTemplates(false);

  return SYSTEM_NOTE_TEMPLATES.map((definition) => {
    const existing = currentTemplates.find((template) => normalizeName(template.title) === normalizeName(definition.title));
    const needsUpdate = existing
      ? !equalColor(existing.cardColor, definition.cardColor)
        || existing.print !== definition.print
        || existing.sortOrder !== definition.sortOrder
      : false;

    let status: SystemSeedPreviewStatus;
    let message: string;

    if (!existing) {
      status = "missing";
      message = "Fehlt und kann angelegt werden";
    } else if (needsUpdate) {
      status = "update";
      message = "Vorhanden, aber Metadaten weichen vom Sollzustand ab";
    } else {
      status = "unchanged";
      message = "Bereits im Sollzustand vorhanden";
    }

    return {
      kind: "noteTemplate" as const,
      definition,
      item: {
        key: buildNoteTemplateKey(definition.title),
        kind: "noteTemplate" as const,
        label: definition.title,
        status,
        message,
        canApply: status !== "unchanged",
        checkedByDefault: status !== "unchanged",
      },
    };
  });
}

async function buildSeedPreviewMeta() {
  const tagItems = await buildTagPreviewItems();
  const tourItems = await buildTourPreviewItems();
  const noteTemplateItems = await buildNoteTemplatePreviewItems();
  return [...tagItems, ...tourItems, ...noteTemplateItems];
}

async function applyTagDefinition(definition: SeedTagDefinition, logLines: string[]): Promise<void> {
  const existing = await masterDataRepository.getTagByNormalizedName(definition.name);
  const legacy = !existing && definition.legacyName
    ? await masterDataRepository.getTagByNormalizedName(definition.legacyName)
    : null;

  if (!existing && legacy) {
    const migrateResult = await masterDataRepository.updateTagWithVersion(legacy.id, legacy.version, { name: definition.name });
    if (migrateResult.kind === "updated") {
      logLines.push(`Tag migriert: ${legacy.name} → ${definition.name}`);
    }
  }

  const before = await masterDataRepository.getTagByNormalizedName(definition.name);
  const seeded = await masterDataRepository.ensureTagDefinition(definition);

  if (!before) {
    logLines.push(`Tag angelegt: ${seeded.name}`);
    return;
  }

  const changed = !equalColor(before.color, definition.color) || before.isDefault !== definition.isDefault;
  logLines.push(`${changed ? "Tag aktualisiert" : "Tag unverändert"}: ${seeded.name}`);
}

async function applyTourDefinition(definition: SeedTourDefinition, logLines: string[]): Promise<void> {
  let currentTours = await toursRepository.getTours();
  const existing = findTourByName(currentTours, definition.name);
  const legacy = !existing && definition.legacyName ? findTourByName(currentTours, definition.legacyName) : undefined;

  if (!existing && legacy) {
    const migrateResult = await toursRepository.updateTourWithVersion(
      legacy.id,
      legacy.version,
      definition.name,
      legacy.color,
    );
    if (migrateResult.kind === "updated") {
      logLines.push(`Tour migriert: ${legacy.name} → ${definition.name}`);
      currentTours = await toursRepository.getTours();
    }
  }

  const refreshed = findTourByName(currentTours, definition.name);
  if (!refreshed) {
    await toursRepository.createTour(definition.name, definition.color);
    logLines.push(`Tour angelegt: ${definition.name}`);
    return;
  }

  if (equalColor(refreshed.color, definition.color)) {
    logLines.push(`Tour unverändert: ${refreshed.name}`);
    return;
  }

  const updateResult = await toursRepository.updateTourWithVersion(
    refreshed.id,
    refreshed.version,
    refreshed.name,
    definition.color,
  );
  if (updateResult.kind !== "updated") {
    throw new Error(`Tour konnte nicht aktualisiert werden: ${refreshed.name}`);
  }
  logLines.push(`Tour aktualisiert: ${refreshed.name}`);
}

async function applyNoteTemplateDefinition(definition: SeedNoteTemplateDefinition, logLines: string[]): Promise<void> {
  const currentTemplates = await noteTemplatesRepository.getNoteTemplates(false);
  const existing = currentTemplates.find((template) => normalizeName(template.title) === normalizeName(definition.title));

  if (!existing) {
    await noteTemplatesRepository.createNoteTemplate(buildTemplateCreateInput(definition));
    logLines.push(`Notizvorlage angelegt: ${definition.title}`);
    return;
  }

  const needsUpdate = !equalColor(existing.cardColor, definition.cardColor)
    || existing.print !== definition.print
    || existing.sortOrder !== definition.sortOrder;

  if (!needsUpdate) {
    logLines.push(`Notizvorlage unverändert: ${existing.title}`);
    return;
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
}

export async function getSystemSeedPreview(): Promise<SystemSeedPreviewResult> {
  const meta = await buildSeedPreviewMeta();
  return {
    items: meta.map((entry) => entry.item),
  };
}

export async function applySystemSeed(selectedKeys?: string[]): Promise<SystemSeedApplyResult> {
  const logLines: string[] = [];
  if (selectedKeys === undefined) {
    for (const definition of SYSTEM_TAGS) {
      await applyTagDefinition(definition, logLines);
    }
    for (const definition of SYSTEM_TOURS) {
      await applyTourDefinition(definition, logLines);
    }
    for (const definition of SYSTEM_NOTE_TEMPLATES) {
      await applyNoteTemplateDefinition(definition, logLines);
    }

    return { logLines };
  }

  const effectiveKeys = new Set(selectedKeys.filter(Boolean));

  for (const definition of SYSTEM_TAGS) {
    if (effectiveKeys.has(buildTagKey(definition.name))) {
      await applyTagDefinition(definition, logLines);
    }
  }

  for (const definition of SYSTEM_TOURS) {
    if (effectiveKeys.has(buildTourKey(definition.name))) {
      await applyTourDefinition(definition, logLines);
    }
  }

  for (const definition of SYSTEM_NOTE_TEMPLATES) {
    if (effectiveKeys.has(buildNoteTemplateKey(definition.title))) {
      await applyNoteTemplateDefinition(definition, logLines);
    }
  }

  return { logLines };
}
