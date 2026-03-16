export type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";
export type CanonicalRoleKey = "LESER" | "DISPONENT" | "ADMIN";
export type SettingScopeType = "GLOBAL" | "ROLE" | "USER";
export type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

type BaseSettingDefinition<TType extends "enum" | "string" | "number" | "boolean", TValue> = {
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

export type NumberSettingDefinition = BaseSettingDefinition<"number", number> & {
  min: number;
  max: number;
  integer: boolean;
};

export type BooleanSettingDefinition = BaseSettingDefinition<"boolean", boolean>;

export type SettingDefinition =
  | EnumSettingDefinition<string>
  | StringSettingDefinition
  | NumberSettingDefinition
  | BooleanSettingDefinition;

const attachmentPreviewSizeOptions = ["small", "medium", "large"] as const;
type AttachmentPreviewSize = (typeof attachmentPreviewSizeOptions)[number];
const helpTextPreviewSizeOptions = ["small", "medium", "large"] as const;
type HelpTextPreviewSize = (typeof helpTextPreviewSizeOptions)[number];
const toastDesktopPositionOptions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type ToastDesktopPosition = (typeof toastDesktopPositionOptions)[number];
const listViewModeOptions = ["board", "table"] as const;
type ListViewMode = (typeof listViewModeOptions)[number];
const weekAppointmentDisplayModeOptions = ["standard", "compact", "detail", "split"] as const;
type WeekAppointmentDisplayMode = (typeof weekAppointmentDisplayModeOptions)[number];

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

function isValidBackupLaneTourIds(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  const parts = trimmed.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length > 3) return false;
  const parsed = parts.map((part) => Number.parseInt(part, 10));
  if (parsed.some((id) => !Number.isInteger(id) || id <= 0)) return false;
  return new Set(parsed).size === parsed.length;
}

function isValidDemoDataAdminFormState(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;

    const integerKeys = [
      "baseCustomers",
      "baseProjects",
      "appointmentsPerProject",
      "seedWindowDaysMin",
      "seedWindowDaysMax",
      "reklDelayDaysMin",
      "reklDelayDaysMax",
    ] as const;
    for (const key of integerKeys) {
      if (!Number.isInteger(parsed[key])) return false;
    }

    if (typeof parsed.baseGenerateAttachments !== "boolean") return false;
    if (typeof parsed.baseRandomSeed !== "string") return false;
    if (typeof parsed.baseLocale !== "string") return false;
    if (typeof parsed.appointmentBaseSeedRunId !== "string") return false;
    if (typeof parsed.appointmentsRandomSeed !== "string") return false;
    if (typeof parsed.appointmentsLocale !== "string") return false;
    if (typeof parsed.reklShare !== "number" || !Number.isFinite(parsed.reklShare)) return false;

    if (parsed.baseProjectStatuses === undefined) return true;
    if (!Array.isArray(parsed.baseProjectStatuses)) return false;
    return parsed.baseProjectStatuses.every((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const status = entry as Record<string, unknown>;
      const hasDescription = status.description === undefined || typeof status.description === "string";
      return typeof status.title === "string" && typeof status.color === "string" && hasDescription;
    });
  } catch {
    return false;
  }
}

export const userSettingsRegistry = {
  attachmentPreviewSize: {
    key: "attachmentPreviewSize",
    label: "Datei Vorschau Groesse",
    description: "Steuert die Groesse der Dateivorschau im Attachment-Badge.",
    type: "enum",
    options: attachmentPreviewSizeOptions,
    defaultValue: "large",
    allowedScopes: ["GLOBAL", "USER"],
    validate: (value: unknown): value is AttachmentPreviewSize =>
      typeof value === "string" && attachmentPreviewSizeOptions.includes(value as AttachmentPreviewSize),
  },
  helpTextPreviewSize: {
    key: "helpTextPreviewSize",
    label: "Hilfetext Vorschau Groesse",
    description: "Steuert die Groesse von Hilfetext-Previews (Help-Icon und Hilfetext-Tabelle).",
    type: "enum",
    options: helpTextPreviewSizeOptions,
    defaultValue: "large",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is HelpTextPreviewSize =>
      typeof value === "string" && helpTextPreviewSizeOptions.includes(value as HelpTextPreviewSize),
  },
  toastDesktopPosition: {
    key: "toastDesktopPosition",
    label: "Toast Position Desktop",
    description: "Steuert die Position von Info-Popups auf Desktop.",
    type: "enum",
    options: toastDesktopPositionOptions,
    defaultValue: "bottom-right",
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is ToastDesktopPosition =>
      typeof value === "string" && toastDesktopPositionOptions.includes(value as ToastDesktopPosition),
  },
  backupEnabled: {
    key: "backup_enabled",
    label: "Backups aktiv",
    description: "Aktiviert oder deaktiviert den automatischen Backup-Scheduler.",
    type: "boolean",
    defaultValue: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is boolean => typeof value === "boolean",
  },
  authTwoFactorEnabled: {
    key: "auth_two_factor_enabled",
    label: "2FA global aktiv",
    description: "Aktiviert die verpflichtende Zwei-Faktor-Anmeldung fuer alle Benutzer.",
    type: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is boolean => typeof value === "boolean",
  },
  monitoringTr01Enabled: {
    key: "monitoring.tr01.enabled",
    label: "Monitoring TR-01 aktiv",
    description: "Aktiviert den Monitoring-Trigger fuer Ressourcenunterschreitung.",
    type: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is boolean => typeof value === "boolean",
  },
  monitoringTr01HorizonDays: {
    key: "monitoring.tr01.horizonDays",
    label: "Monitoring TR-01 Vorlaufhorizont",
    description: "Legt den Vorlaufhorizont des Monitoring-Triggers in Tagen fest.",
    type: "number",
    defaultValue: 14,
    min: 1,
    max: 365,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365,
  },
  monitoringTr01MinimumEmployees: {
    key: "monitoring.tr01.minimumEmployees",
    label: "Monitoring TR-01 Mindestzahl Mitarbeiter",
    description: "Legt die benoetigte Mindestzahl zugewiesener Mitarbeiter fuer TR-01 fest.",
    type: "number",
    defaultValue: 1,
    min: 1,
    max: 50,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50,
  },
  backupLaneTourIds: {
    key: "backup_lane_tour_ids",
    label: "Backup Tour-Lanes (CSV)",
    description: "Feste Tour-IDs fuer FT07-Exportlanes als CSV (max. 3 IDs, z. B. 1,2,3).",
    type: "string",
    defaultValue: "",
    allowedScopes: ["GLOBAL"],
    placeholderWhitelist: [],
    validate: isValidBackupLaneTourIds,
  },
  calendarWeekendColumnPercent: {
    key: "calendarWeekendColumnPercent",
    label: "Kalender Wochenende Breite (%)",
    description: "Breite von Samstag/Sonntag relativ zu einem Werktag in Prozent.",
    type: "number",
    defaultValue: 33,
    min: 1,
    max: 100,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100,
  },
  calendarWeekScrollRange: {
    key: "calendarWeekScrollRange",
    label: "Scrollbereich Wochen",
    description: "Anzahl zusaetzlicher Wochen im horizontalen Kalender-Scrollbereich.",
    type: "number",
    defaultValue: 4,
    min: 0,
    max: 12,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12,
  },
  calendarMonthScrollRange: {
    key: "calendarMonthScrollRange",
    label: "Scrollbereich Monate",
    description: "Anzahl zusaetzlicher Monate im horizontalen Kalender-Scrollbereich.",
    type: "number",
    defaultValue: 3,
    min: 0,
    max: 12,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12,
  },
  hoverPreviewOpenDelayMs: {
    key: "hoverPreviewOpenDelayMs",
    label: "Hover Vorschau Verzoegerung (ms)",
    description: "Verzoegerung bis Hover-Previews geoeffnet werden.",
    type: "number",
    defaultValue: 380,
    min: 0,
    max: 2000,
    integer: true,
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2000,
  },
  cardListColumns: {
    key: "cardListColumns",
    label: "Karten Spalten",
    description: "Steuert die Anzahl der Spalten in Kartenlisten.",
    type: "number",
    defaultValue: 4,
    min: 2,
    max: 6,
    integer: true,
    allowedScopes: ["GLOBAL", "USER"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= 6,
  },
  calendarWeekLanesIsCollapsed: {
    key: "calendar.weekLanes.isCollapsed",
    label: "Wochenansicht Lanes kollabiert",
    description: "Steuert, ob die Tour-Lanes in der Wochenansicht global kollabiert sind.",
    type: "boolean",
    defaultValue: false,
    allowedScopes: ["USER"],
    validate: (value: unknown): value is boolean => typeof value === "boolean",
  },
  calendarWeekLanesExpandedLaneId: {
    key: "calendar.weekLanes.expandedLaneId",
    label: "Wochenansicht expandierte Lane",
    description: "Speichert die aktuell expandierte Lane-ID fuer den kollabierten Wochenmodus.",
    type: "string",
    defaultValue: "",
    allowedScopes: ["USER"],
    placeholderWhitelist: [],
    validate: (value: unknown): value is string => typeof value === "string",
  },
  calendarWeekAppointmentDisplayMode: {
    key: "calendar.weekAppointmentDisplayMode",
    label: "Wochenansicht Termindarstellung",
    description: "Speichert den globalen Darstellungsmodus der Terminkarten in der Wochenansicht.",
    type: "enum",
    options: weekAppointmentDisplayModeOptions,
    defaultValue: "standard",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is WeekAppointmentDisplayMode =>
      typeof value === "string" && weekAppointmentDisplayModeOptions.includes(value as WeekAppointmentDisplayMode),
  },
  helptextsViewMode: {
    key: "helptexts.viewMode",
    label: "Hilfetexte Ansicht",
    description: "Steuert den Ansichtsmodus der Hilfetexte (Board oder Tabelle).",
    type: "enum",
    options: listViewModeOptions,
    defaultValue: "board",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is ListViewMode =>
      typeof value === "string" && listViewModeOptions.includes(value as ListViewMode),
  },
  projectsViewMode: {
    key: "projects.viewMode",
    label: "Projekte Ansicht",
    description: "Steuert den Ansichtsmodus der Projekte (Board oder Tabelle).",
    type: "enum",
    options: listViewModeOptions,
    defaultValue: "board",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is ListViewMode =>
      typeof value === "string" && listViewModeOptions.includes(value as ListViewMode),
  },
  customersViewMode: {
    key: "customers.viewMode",
    label: "Kunden Ansicht",
    description: "Steuert den Ansichtsmodus der Kunden (Board oder Tabelle).",
    type: "enum",
    options: listViewModeOptions,
    defaultValue: "board",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is ListViewMode =>
      typeof value === "string" && listViewModeOptions.includes(value as ListViewMode),
  },
  employeesViewMode: {
    key: "employees.viewMode",
    label: "Mitarbeiter Ansicht",
    description: "Steuert den Ansichtsmodus der Mitarbeiter (Board oder Tabelle).",
    type: "enum",
    options: listViewModeOptions,
    defaultValue: "board",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is ListViewMode =>
      typeof value === "string" && listViewModeOptions.includes(value as ListViewMode),
  },
  demoDataAdminFormState: {
    key: "demoData.adminFormState",
    label: "Demo-Daten Formularzustand",
    description: "Speichert den zuletzt verwendeten Formularzustand der Demo-Daten-Adminansicht.",
    type: "string",
    defaultValue: "",
    allowedScopes: ["USER"],
    placeholderWhitelist: [],
    validate: isValidDemoDataAdminFormState,
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
