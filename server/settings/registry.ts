export type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";
export type CanonicalRoleKey = "LESER" | "DISPONENT" | "ADMIN";
export type SettingScopeType = "GLOBAL" | "ROLE" | "USER";
export type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

type BaseSettingDefinition<TType extends "enum" | "string", TValue> = {
  key: string;
  label: string;
  description: string;
  type: TType;
  defaultValue: TValue;
  allowedScopes: readonly SettingScopeType[];
  validate: (value: unknown) => value is TValue;
};

export type EnumSettingDefinition<TValue extends string> = BaseSettingDefinition<"enum", TValue> & {
  options: readonly TValue[];
};

export type StringSettingDefinition = BaseSettingDefinition<"string", string> & {
  placeholderWhitelist: readonly string[];
};

export type SettingDefinition = EnumSettingDefinition<string> | StringSettingDefinition;

const attachmentPreviewSizeOptions = ["small", "medium", "large"] as const;
type AttachmentPreviewSize = (typeof attachmentPreviewSizeOptions)[number];

const templateAllowedKeys = [
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
] as const;

function extractTemplatePlaceholders(template: string) {
  const keys = new Set<string>();
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  for (const match of Array.from(template.matchAll(regex))) {
    if (match[1]) keys.add(match[1]);
  }
  return Array.from(keys);
}

function isValidTemplateValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const allowed = new Set<string>(templateAllowedKeys as readonly string[]);
  const placeholders = extractTemplatePlaceholders(value);
  return placeholders.every((placeholder) => allowed.has(placeholder));
}

export const userSettingsRegistry = {
  attachmentPreviewSize: {
    key: "attachmentPreviewSize",
    label: "Datei Vorschau Groesse",
    description: "Steuert die Groesse der Dateivorschau im Attachment-Badge.",
    type: "enum",
    options: attachmentPreviewSizeOptions,
    defaultValue: "medium",
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    validate: (value: unknown): value is AttachmentPreviewSize =>
      typeof value === "string" && attachmentPreviewSizeOptions.includes(value as AttachmentPreviewSize),
  },
  templatesProjectTitle: {
    key: "templates.project.title",
    label: "Template Projekt-Titel",
    description: "Schablone fuer Seed-Projekt-Titel.",
    type: "string",
    defaultValue: "{sauna_model_name}",
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    placeholderWhitelist: templateAllowedKeys,
    validate: isValidTemplateValue,
  },
  templatesProjectDescription: {
    key: "templates.project.description",
    label: "Template Projekt-Beschreibung",
    description: "Schablone fuer Seed-Projekt-Beschreibung.",
    type: "string",
    defaultValue: `- Modell: {sauna_model_name}
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
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    placeholderWhitelist: templateAllowedKeys,
    validate: isValidTemplateValue,
  },
  templatesAppointmentMountTitle: {
    key: "templates.appointment.mount.title",
    label: "Template Montage-Termin",
    description: "Schablone fuer Montage-Termin-Titel.",
    type: "string",
    defaultValue: "Montage: {sauna_model_name}",
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    placeholderWhitelist: templateAllowedKeys,
    validate: isValidTemplateValue,
  },
  templatesAppointmentIntradayReklTitle: {
    key: "templates.appointment.intraday.rekl.title",
    label: "Template Reklamationstermin",
    description: "Schablone fuer Reklamationstermin-Titel.",
    type: "string",
    defaultValue: "Rekl. {oven_name}",
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    placeholderWhitelist: templateAllowedKeys,
    validate: isValidTemplateValue,
  },
} as const satisfies Record<string, SettingDefinition>;

export type UserSettingKey = keyof typeof userSettingsRegistry;
export type UserSettingValueByKey = {
  [K in UserSettingKey]: (typeof userSettingsRegistry)[K]["defaultValue"];
};

export const settingDefinitions = Object.values(userSettingsRegistry);

export const globalScopeMarker = "global" as const;

export function mapDbRoleCodeToCanonicalRole(dbRoleCode: DbRoleCode): CanonicalRoleKey {
  if (dbRoleCode === "READER") return "LESER";
  if (dbRoleCode === "DISPATCHER") return "DISPONENT";
  return "ADMIN";
}

export function assertDbRoleCode(input: string): DbRoleCode | null {
  if (input === "READER" || input === "DISPATCHER" || input === "ADMIN") {
    return input;
  }
  return null;
}
