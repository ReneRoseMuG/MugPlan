export type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";
export type CanonicalRoleKey = "LESER" | "DISPONENT" | "ADMIN";
export type SettingScopeType = "GLOBAL" | "ROLE" | "USER";
export type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

type BaseSettingDefinition<TType extends "enum" | "string" | "number" | "boolean" | "json", TValue> = {
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
export type JsonSettingDefinition<TValue> = BaseSettingDefinition<"json", TValue>;

export type SettingDefinition =
  | EnumSettingDefinition<string>
  | StringSettingDefinition
  | NumberSettingDefinition
  | BooleanSettingDefinition
  | JsonSettingDefinition<unknown>;

const attachmentPreviewSizeOptions = ["small", "medium", "large"] as const;
type AttachmentPreviewSize = (typeof attachmentPreviewSizeOptions)[number];
const helpTextPreviewSizeOptions = ["small", "medium", "large"] as const;
type HelpTextPreviewSize = (typeof helpTextPreviewSizeOptions)[number];
const entityFormShellSidebarWidthDefault = 360;
const entityFormShellContentMaxWidthDefault = 960;
const toastDesktopPositionOptions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type ToastDesktopPosition = (typeof toastDesktopPositionOptions)[number];
const listViewModeOptions = ["board", "table"] as const;
type ListViewMode = (typeof listViewModeOptions)[number];
const employeePickerViewModeOptions = ["board", "list"] as const;
type EmployeePickerViewMode = (typeof employeePickerViewModeOptions)[number];
const weekAppointmentDisplayModeOptions = ["standard", "compact", "detail", "split"] as const;
type WeekAppointmentDisplayMode = (typeof weekAppointmentDisplayModeOptions)[number];
const weekTileBodyModeOptions = ["collapsed", "semiexpanded", "expanded"] as const;
type WeekTileBodyMode = (typeof weekTileBodyModeOptions)[number];
const tourenplanPrintModeOptions = ["farbdruck", "spardruck"] as const;
const tourenplanFontSizeOptions = ["small", "medium", "large"] as const;
type VorlauflisteCategorySelection = {
  columnOrder?: string[];
  hiddenColumns?: string[];
  useShortCodes?: boolean;
  columnWidths?: Record<string, number>;
};
type ProduktionsplanungSelection = {
  useShortCodes?: boolean;
};
type AuftragslisteSelection = {
  productCategoryIds?: number[];
  componentCategoryIds?: number[];
  useShortCodes?: boolean;
};
type TourenplanPrintMode = (typeof tourenplanPrintModeOptions)[number];
type TourenplanFontSize = (typeof tourenplanFontSizeOptions)[number];
type LegacyProduktionsplanungSelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes?: boolean;
  sonderblockTagIds?: number[];
};
type VorlauflisteRangeConfig = {
  activeTab?: "date" | "calendarWeek" | "columns";
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};
type ProduktionsplanungRangeConfig = {
  activeTab?: "date" | "calendarWeek";
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};
type AuftragslisteRangeConfig = {
  activeTab?: "date" | "calendarWeek";
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};
type TourenplanRangeConfig = {
  activeTab?: "date" | "calendarWeek";
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};
type CategoryLayoutEntry = {
  categoryId: number;
  block: number;
  columns: 1 | 2 | 3;
};
type CategoryLayoutConfig = CategoryLayoutEntry[];
type LegacyCategoryLayoutBlock = {
  categoryIds: number[];
  columns: 1 | 2 | 3;
};

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


function isValidPositiveIntegerArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((entry) => typeof entry === "number" && Number.isInteger(entry) && entry > 0)) {
    return false;
  }
  return new Set(value).size === value.length;
}

function isValidStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    return false;
  }
  return new Set(value).size === value.length;
}

function isValidVorlauflisteCategorySelection(value: unknown): value is VorlauflisteCategorySelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (parsed.columnOrder !== undefined && !isValidStringArray(parsed.columnOrder)) return false;
  if (parsed.hiddenColumns !== undefined && !isValidStringArray(parsed.hiddenColumns)) return false;
  if (parsed.useShortCodes !== undefined && typeof parsed.useShortCodes !== "boolean") return false;
  if (parsed.columnWidths !== undefined) {
    if (!parsed.columnWidths || typeof parsed.columnWidths !== "object" || Array.isArray(parsed.columnWidths)) {
      return false;
    }
    const entries = Object.entries(parsed.columnWidths);
    if (!entries.every(([key, width]) =>
      key.trim().length > 0
      && typeof width === "number"
      && Number.isInteger(width)
      && width >= 80
      && width <= 960)) {
      return false;
    }
  }
  return true;
}

function isValidProduktionsplanungSelection(value: unknown): value is ProduktionsplanungSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (parsed.useShortCodes !== undefined && typeof parsed.useShortCodes !== "boolean") return false;
  return true;
}

function isValidAuftragslisteSelection(value: unknown): value is AuftragslisteSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (parsed.productCategoryIds !== undefined && !isValidPositiveIntegerArray(parsed.productCategoryIds)) return false;
  if (parsed.componentCategoryIds !== undefined && !isValidPositiveIntegerArray(parsed.componentCategoryIds)) return false;
  if (parsed.useShortCodes !== undefined && typeof parsed.useShortCodes !== "boolean") return false;
  return true;
}

function isValidLegacyProduktionsplanungSelection(value: unknown): value is LegacyProduktionsplanungSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (!isValidPositiveIntegerArray(parsed.productCategoryIds)) return false;
  if (!isValidPositiveIntegerArray(parsed.componentCategoryIds)) return false;
  if (parsed.useShortCodes !== undefined && typeof parsed.useShortCodes !== "boolean") return false;
  if (parsed.sonderblockTagIds !== undefined && !isValidPositiveIntegerArray(parsed.sonderblockTagIds)) return false;
  return true;
}

function isValidVorlauflisteRangeConfig(value: unknown): value is VorlauflisteRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (
    parsed.activeTab !== undefined
    && parsed.activeTab !== "date"
    && parsed.activeTab !== "calendarWeek"
    && parsed.activeTab !== "columns"
  ) {
    return false;
  }
  if (
    parsed.fromDate !== undefined
    && (typeof parsed.fromDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.fromDate))
  ) {
    return false;
  }
  if (
    parsed.toDate !== undefined
    && (typeof parsed.toDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.toDate))
  ) {
    return false;
  }
  if (
    parsed.kwStart !== undefined
    && (typeof parsed.kwStart !== "number" || !Number.isInteger(parsed.kwStart) || parsed.kwStart < 1 || parsed.kwStart > 53)
  ) {
    return false;
  }
  if (
    parsed.weekCount !== undefined
    && (typeof parsed.weekCount !== "number" || !Number.isInteger(parsed.weekCount) || parsed.weekCount < 1 || parsed.weekCount > 52)
  ) {
    return false;
  }
  return true;
}

function isValidProduktionsplanungRangeConfig(value: unknown): value is ProduktionsplanungRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (parsed.activeTab !== undefined && parsed.activeTab !== "date" && parsed.activeTab !== "calendarWeek") {
    return false;
  }
  if (
    parsed.fromDate !== undefined
    && (typeof parsed.fromDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.fromDate))
  ) {
    return false;
  }
  if (
    parsed.toDate !== undefined
    && (typeof parsed.toDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.toDate))
  ) {
    return false;
  }
  if (
    parsed.kwStart !== undefined
    && (typeof parsed.kwStart !== "number" || !Number.isInteger(parsed.kwStart) || parsed.kwStart < 1 || parsed.kwStart > 53)
  ) {
    return false;
  }
  if (
    parsed.weekCount !== undefined
    && (typeof parsed.weekCount !== "number" || !Number.isInteger(parsed.weekCount) || parsed.weekCount < 1 || parsed.weekCount > 52)
  ) {
    return false;
  }
  return true;
}

function isValidAuftragslisteRangeConfig(value: unknown): value is AuftragslisteRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (
    parsed.activeTab !== undefined
    && parsed.activeTab !== "date"
    && parsed.activeTab !== "calendarWeek"
  ) {
    return false;
  }
  if (parsed.fromDate !== undefined && (typeof parsed.fromDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.fromDate))) return false;
  if (parsed.toDate !== undefined && (typeof parsed.toDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.toDate))) return false;
  if (parsed.kwStart !== undefined && (typeof parsed.kwStart !== "number" || !Number.isInteger(parsed.kwStart) || parsed.kwStart < 1 || parsed.kwStart > 53)) return false;
  if (parsed.weekCount !== undefined && (typeof parsed.weekCount !== "number" || !Number.isInteger(parsed.weekCount) || parsed.weekCount < 1 || parsed.weekCount > 52)) return false;
  return true;
}

function isValidTourenplanRangeConfig(value: unknown): value is TourenplanRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (
    parsed.activeTab !== undefined
    && parsed.activeTab !== "date"
    && parsed.activeTab !== "calendarWeek"
  ) {
    return false;
  }
  if (parsed.fromDate !== undefined && (typeof parsed.fromDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.fromDate))) return false;
  if (parsed.toDate !== undefined && (typeof parsed.toDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.toDate))) return false;
  if (parsed.kwStart !== undefined && (typeof parsed.kwStart !== "number" || !Number.isInteger(parsed.kwStart) || parsed.kwStart < 1 || parsed.kwStart > 53)) return false;
  if (parsed.weekCount !== undefined && (typeof parsed.weekCount !== "number" || !Number.isInteger(parsed.weekCount) || parsed.weekCount < 1 || parsed.weekCount > 52)) return false;
  return true;
}

function isValidCategoryLayoutConfig(value: unknown): value is CategoryLayoutConfig {
  if (!Array.isArray(value)) return false;
  const isCurrentFormat = value.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "categoryId" in (entry as Record<string, unknown>));
  if (!isCurrentFormat) {
    const seenCategoryIds = new Set<number>();
    return value.every((entry): entry is LegacyCategoryLayoutBlock => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const candidate = entry as Record<string, unknown>;
      if (!isValidPositiveIntegerArray(candidate.categoryIds)) return false;
      const categoryIds = candidate.categoryIds as number[];
      if (categoryIds.some((id) => seenCategoryIds.has(id))) return false;
      for (const id of categoryIds) {
        seenCategoryIds.add(id);
      }
      return candidate.columns === 1 || candidate.columns === 2 || candidate.columns === 3;
    });
  }

  const seenCategoryIds = new Set<number>();
  return value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.categoryId !== "number" || !Number.isInteger(candidate.categoryId) || candidate.categoryId <= 0) return false;
    if (seenCategoryIds.has(candidate.categoryId)) return false;
    if (typeof candidate.block !== "number" || !Number.isInteger(candidate.block) || candidate.block <= 0) return false;
    seenCategoryIds.add(candidate.categoryId);
    return candidate.columns === 1 || candidate.columns === 2 || candidate.columns === 3;
  });
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
  entityFormShellSidebarWidthPx: {
    key: "entityFormShell.sidebarWidthPx",
    label: "Formular Sidebar Breite (px)",
    description: "Steuert die feste Breite der rechten Sidebar in EntityFormShell.",
    type: "number",
    defaultValue: entityFormShellSidebarWidthDefault,
    min: 260,
    max: 480,
    integer: true,
    allowedScopes: ["USER"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 260 && value <= 480,
  },
  entityFormShellContentMaxWidthPx: {
    key: "entityFormShell.contentMaxWidthPx",
    label: "Formular Inhalt Max-Breite (px)",
    description: "Steuert die maximale Breite des zentrierten Formularinhalts in EntityFormShell.",
    type: "number",
    defaultValue: entityFormShellContentMaxWidthDefault,
    min: 640,
    max: 1100,
    integer: true,
    allowedScopes: ["USER"],
    validate: (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 640 && value <= 1100,
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
  monitoringTr01AllAppointments: {
    key: "monitoring.tr01.allAppointments",
    label: "Monitoring TR-01 alle Termine",
    description: "Prueft bei TR-01 alle zukuenftigen Termine statt nur den Vorlaufhorizont.",
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
  calendarWeekTileBodyMode: {
    key: "calendar.weekTileBodyMode",
    label: "Wochenansicht Body-Modus",
    description: "Steuert benutzerspezifisch, wie stark der Body der Wochenkacheln reduziert oder erweitert dargestellt wird.",
    type: "enum",
    options: weekTileBodyModeOptions,
    defaultValue: "semiexpanded",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is WeekTileBodyMode =>
      typeof value === "string" && weekTileBodyModeOptions.includes(value as WeekTileBodyMode),
  },
  reportsVorlauflisteCategorySelection: {
    key: "reports.vorlaufliste.categorySelection",
    label: "Vorlaufliste Spaltenkonfiguration",
    description: "Speichert die benutzerspezifische Spaltenkonfiguration fuer die Vorlaufliste.",
    type: "json",
    defaultValue: {},
    allowedScopes: ["USER"],
    validate: isValidVorlauflisteCategorySelection,
  },
  reportsProduktionsplanungSelection: {
    key: "reports.produktionsplanung.selection",
    label: "Produktionsplanung Konfiguration",
    description: "Speichert benutzerspezifisch, ob die Produktionsplanung Shortcodes verwendet.",
    type: "json",
    defaultValue: {
      useShortCodes: false,
    },
    allowedScopes: ["USER"],
    validate: isValidProduktionsplanungSelection,
  },
  reportsAuftragslisteSelection: {
    key: "reports.auftragsliste.selection",
    label: "Auftragsliste Konfiguration",
    description: "Speichert benutzerspezifisch die Produkt- und Komponentenfilter sowie Shortcodes der Auftragsliste.",
    type: "json",
    defaultValue: {
      productCategoryIds: [],
      componentCategoryIds: [],
      useShortCodes: false,
    },
    allowedScopes: ["USER"],
    validate: isValidAuftragslisteSelection,
  },
  reportsVorlauflisteRangeConfig: {
    key: "reports.vorlaufliste.rangeConfig",
    label: "Vorlaufliste Zeitraumskonfiguration",
    description: "Speichert benutzerspezifisch den aktiven Zeitraum-Tab und die Kalenderwochenwerte der Vorlaufliste.",
    type: "json",
    defaultValue: {
      activeTab: "date",
    },
    allowedScopes: ["USER"],
    validate: isValidVorlauflisteRangeConfig,
  },
  reportsProduktionsplanungRangeConfig: {
    key: "reports.produktionsplanung.rangeConfig",
    label: "Produktionsplanung Zeitraumskonfiguration",
    description: "Speichert benutzerspezifisch den aktiven Zeitraum-Tab und die Kalenderwochenwerte der Produktionsplanung.",
    type: "json",
    defaultValue: {
      activeTab: "date",
    },
    allowedScopes: ["USER"],
    validate: isValidProduktionsplanungRangeConfig,
  },
  reportsAuftragslisteRangeConfig: {
    key: "reports.auftragsliste.rangeConfig",
    label: "Auftragsliste Zeitraumskonfiguration",
    description: "Speichert benutzerspezifisch den aktiven Zeitraum-Tab und die Kalenderwochenwerte der Auftragsliste.",
    type: "json",
    defaultValue: {
      activeTab: "date",
    },
    allowedScopes: ["USER"],
    validate: isValidAuftragslisteRangeConfig,
  },
  reportsTourenplanRangeConfig: {
    key: "reports.tourenplan.rangeConfig",
    label: "Tourenplan Zeitraumskonfiguration",
    description: "Speichert benutzerspezifisch den aktiven Zeitraum-Tab und die Kalenderwochenwerte des Tourenplans.",
    type: "json",
    defaultValue: {
      activeTab: "date",
    },
    allowedScopes: ["USER"],
    validate: isValidTourenplanRangeConfig,
  },
  reportsTourenplanPrintMode: {
    key: "reports.tourenplan.printMode",
    label: "Tourenplan Druckmodus",
    description: "Steuert global, ob der Tourenplan im Farb- oder Sparmodus gedruckt wird.",
    type: "enum",
    options: tourenplanPrintModeOptions,
    defaultValue: "farbdruck",
    allowedScopes: ["GLOBAL"],
    validate: (value: unknown): value is TourenplanPrintMode =>
      typeof value === "string" && tourenplanPrintModeOptions.includes(value as TourenplanPrintMode),
  },
  reportsTourenplanFontSize: {
    key: "reports.tourenplan.fontSize",
    label: "Tourenplan Schriftgröße",
    description: "Steuert benutzerspezifisch die Schriftgröße des Tourenplans in Vorschau und Druck.",
    type: "enum",
    options: tourenplanFontSizeOptions,
    defaultValue: "medium",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is TourenplanFontSize =>
      typeof value === "string" && tourenplanFontSizeOptions.includes(value as TourenplanFontSize),
  },
  reportsCategoryLayout: {
    key: "reports.categoryLayout",
    label: "Kategorie-Layout (Produktionsplanung)",
    description: "Legt fest, welche Kategorien in welchen Bloecken und mit wie vielen Spalten im Produktionsplanung-Report dargestellt werden.",
    type: "json",
    defaultValue: [],
    allowedScopes: ["GLOBAL"],
    validate: isValidCategoryLayoutConfig,
  },
  reportsLegacyProductVorlaufSelection: {
    key: "reports.productVorlauf.selection",
    label: "Legacy Produkt Vorlauf Konfiguration",
    description: "Stellt bestehende Benutzereinstellungen fuer die Migration zur Produktionsplanung bereit.",
    type: "json",
    defaultValue: {
      productCategoryIds: [],
      componentCategoryIds: [],
      useShortCodes: false,
      sonderblockTagIds: [],
    },
    allowedScopes: ["USER"],
    validate: isValidLegacyProduktionsplanungSelection,
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
  appointmentEmployeePickerViewMode: {
    key: "appointmentEmployeePicker.viewMode",
    label: "Termin Mitarbeiter-Picker Ansicht",
    description: "Steuert den Ansichtsmodus im Mitarbeiter-Picker des Terminformulars (Board oder Liste).",
    type: "enum",
    options: employeePickerViewModeOptions,
    defaultValue: "board",
    allowedScopes: ["USER"],
    validate: (value: unknown): value is EmployeePickerViewMode =>
      typeof value === "string" && employeePickerViewModeOptions.includes(value as EmployeePickerViewMode),
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
