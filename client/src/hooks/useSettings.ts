import { useMemo } from "react";
import { useSettingsContext } from "@/providers/SettingsProvider";
import {
  resolveCategoryLayoutConfig,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";

type ToastDesktopPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
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
type TourenplanPrintMode = "farbdruck" | "spardruck";
type TourenplanFontSize = "small" | "medium" | "large";
type ReportRangeConfig = {
  activeTab?: "date" | "calendarWeek";
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};
type VorlauflisteRangeConfig = ReportRangeConfig;
type ProduktionsplanungRangeConfig = ReportRangeConfig;
type AuftragslisteRangeConfig = ReportRangeConfig;
type TourenplanRangeConfig = ReportRangeConfig;

type LegacyProduktionsplanungSelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes?: boolean;
  sonderblockTagIds?: number[];
};

export type UserSettingKey =
  // Historische Benennung: Der Typname enthält auch GLOBAL Settings-Keys.
  | "attachmentPreviewSize"
  | "helpTextPreviewSize"
  | "entityFormShell.sidebarWidthPx"
  | "entityFormShell.contentMaxWidthPx"
  | "toastDesktopPosition"
  | "backup_enabled"
  | "auth_two_factor_enabled"
  | "monitoring.tr01.allAppointments"
  | "monitoring.tr01.horizonDays"
  | "monitoring.tr01.minimumEmployees"
  | "calendarWeekendColumnPercent"
  | "calendarWeekScrollRange"
  | "calendarMonthScrollRange"
  | "hoverPreviewOpenDelayMs"
  | "cardListColumns"
  | "calendar.weekLanes.isCollapsed"
  | "calendar.weekLanes.expandedLaneId"
  | "calendar.weekTileBodyMode"
  | "reports.vorlaufliste.categorySelection"
  | "reports.produktionsplanung.selection"
  | "reports.auftragsliste.selection"
  | "reports.vorlaufliste.rangeConfig"
  | "reports.produktionsplanung.rangeConfig"
  | "reports.auftragsliste.rangeConfig"
  | "reports.tourenplan.rangeConfig"
  | "reports.tourenplan.printMode"
  | "reports.tourenplan.fontSize"
  | "reports.categoryLayout";

type UserSettingValueByKey = {
  attachmentPreviewSize: "small" | "medium" | "large";
  helpTextPreviewSize: "small" | "medium" | "large";
  "entityFormShell.sidebarWidthPx": number;
  "entityFormShell.contentMaxWidthPx": number;
  toastDesktopPosition: ToastDesktopPosition;
  backup_enabled: boolean;
  auth_two_factor_enabled: boolean;
  "monitoring.tr01.allAppointments": boolean;
  "monitoring.tr01.horizonDays": number;
  "monitoring.tr01.minimumEmployees": number;
  calendarWeekendColumnPercent: number;
  calendarWeekScrollRange: number;
  calendarMonthScrollRange: number;
  hoverPreviewOpenDelayMs: number;
  cardListColumns: number;
  "calendar.weekLanes.isCollapsed": boolean;
  "calendar.weekLanes.expandedLaneId": string;
  "calendar.weekTileBodyMode": "collapsed" | "semiexpanded" | "expanded";
  "reports.vorlaufliste.categorySelection": VorlauflisteCategorySelection;
  "reports.produktionsplanung.selection": ProduktionsplanungSelection;
  "reports.auftragsliste.selection": AuftragslisteSelection;
  "reports.vorlaufliste.rangeConfig": VorlauflisteRangeConfig;
  "reports.produktionsplanung.rangeConfig": ProduktionsplanungRangeConfig;
  "reports.auftragsliste.rangeConfig": AuftragslisteRangeConfig;
  "reports.tourenplan.rangeConfig": TourenplanRangeConfig;
  "reports.tourenplan.printMode": TourenplanPrintMode;
  "reports.tourenplan.fontSize": TourenplanFontSize;
  "reports.categoryLayout": CategoryLayoutConfig;
};

export function resolveWeekTileBodyMode(value: unknown): UserSettingValueByKey["calendar.weekTileBodyMode"] {
  if (value === "collapsed" || value === "semiexpanded" || value === "expanded") {
    return value;
  }
  return "semiexpanded";
}

export function resolveToastDesktopPosition(value: unknown): ToastDesktopPosition {
  if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right") {
    return value;
  }
  return "bottom-right";
}

export function resolveVorlauflisteCategorySelection(value: unknown): VorlauflisteCategorySelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const candidate = value as Record<string, unknown>;
  const parseStringArray = (input: unknown): string[] | undefined => {
    if (!Array.isArray(input)) return undefined;
    const values = input
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (values.length !== input.length || values.length === 0) {
      return undefined;
    }
    return Array.from(new Set(values));
  };

  const columnWidths = candidate.columnWidths && typeof candidate.columnWidths === "object" && !Array.isArray(candidate.columnWidths)
    ? Object.fromEntries(
      Object.entries(candidate.columnWidths)
        .filter(([key, width]) =>
          key.trim().length > 0
          && typeof width === "number"
          && Number.isInteger(width)
          && width >= 80
          && width <= 960)
        .map(([key, width]) => [key, width]),
    )
    : undefined;

  return {
    columnOrder: parseStringArray(candidate.columnOrder),
    hiddenColumns: parseStringArray(candidate.hiddenColumns),
    useShortCodes: typeof candidate.useShortCodes === "boolean" ? candidate.useShortCodes : undefined,
    columnWidths,
  };
}

export function resolveProduktionsplanungSelection(value: unknown): ProduktionsplanungSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { useShortCodes: false };
  }
  const candidate = value as Record<string, unknown>;
  return {
    useShortCodes: typeof candidate.useShortCodes === "boolean" ? candidate.useShortCodes : false,
  };
}

export function resolveAuftragslisteSelection(value: unknown): AuftragslisteSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { productCategoryIds: [], componentCategoryIds: [], useShortCodes: false };
  }
  const candidate = value as Record<string, unknown>;
  const productCategoryIds = Array.isArray(candidate.productCategoryIds)
    ? candidate.productCategoryIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
    : [];
  const componentCategoryIds = Array.isArray(candidate.componentCategoryIds)
    ? candidate.componentCategoryIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
    : [];
  return {
    productCategoryIds: Array.from(new Set(productCategoryIds)),
    componentCategoryIds: Array.from(new Set(componentCategoryIds)),
    useShortCodes: typeof candidate.useShortCodes === "boolean" ? candidate.useShortCodes : false,
  };
}

export function resolveVorlauflisteRangeConfig(value: unknown): VorlauflisteRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { activeTab: "date" };
  }
  const candidate = value as Record<string, unknown>;
  const activeTab = candidate.activeTab === "calendarWeek" || candidate.activeTab === "date" || candidate.activeTab === "columns"
    ? (candidate.activeTab === "columns" ? "date" : candidate.activeTab)
    : "date";
  const fromDate = typeof candidate.fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.fromDate)
    ? candidate.fromDate
    : undefined;
  const toDate = typeof candidate.toDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.toDate)
    ? candidate.toDate
    : undefined;
  const kwStart = typeof candidate.kwStart === "number" && Number.isInteger(candidate.kwStart) && candidate.kwStart >= 1 && candidate.kwStart <= 53
    ? candidate.kwStart
    : undefined;
  const weekCount = typeof candidate.weekCount === "number" && Number.isInteger(candidate.weekCount) && candidate.weekCount >= 1 && candidate.weekCount <= 52
    ? candidate.weekCount
    : undefined;

  return {
    activeTab,
    fromDate,
    toDate,
    kwStart,
    weekCount,
  };
}

export function resolveProduktionsplanungRangeConfig(value: unknown): ProduktionsplanungRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { activeTab: "date" };
  }
  const candidate = value as Record<string, unknown>;
  const activeTab = candidate.activeTab === "calendarWeek" || candidate.activeTab === "date"
    ? candidate.activeTab
    : "date";
  const fromDate = typeof candidate.fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.fromDate)
    ? candidate.fromDate
    : undefined;
  const toDate = typeof candidate.toDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.toDate)
    ? candidate.toDate
    : undefined;
  const kwStart = typeof candidate.kwStart === "number" && Number.isInteger(candidate.kwStart) && candidate.kwStart >= 1 && candidate.kwStart <= 53
    ? candidate.kwStart
    : undefined;
  const weekCount = typeof candidate.weekCount === "number" && Number.isInteger(candidate.weekCount) && candidate.weekCount >= 1 && candidate.weekCount <= 52
    ? candidate.weekCount
    : undefined;

  return {
    activeTab,
    fromDate,
    toDate,
    kwStart,
    weekCount,
  };
}

export function resolveAuftragslisteRangeConfig(value: unknown): AuftragslisteRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { activeTab: "date" };
  }
  const candidate = value as Record<string, unknown>;
  const activeTab = candidate.activeTab === "calendarWeek" || candidate.activeTab === "date"
    ? candidate.activeTab
    : "date";
  const fromDate = typeof candidate.fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.fromDate)
    ? candidate.fromDate
    : undefined;
  const toDate = typeof candidate.toDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.toDate)
    ? candidate.toDate
    : undefined;
  const kwStart = typeof candidate.kwStart === "number" && Number.isInteger(candidate.kwStart) && candidate.kwStart >= 1 && candidate.kwStart <= 53
    ? candidate.kwStart
    : undefined;
  const weekCount = typeof candidate.weekCount === "number" && Number.isInteger(candidate.weekCount) && candidate.weekCount >= 1 && candidate.weekCount <= 52
    ? candidate.weekCount
    : undefined;

  return {
    activeTab,
    fromDate,
    toDate,
    kwStart,
    weekCount,
  };
}

export function resolveTourenplanRangeConfig(value: unknown): TourenplanRangeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { activeTab: "date" };
  }
  const candidate = value as Record<string, unknown>;
  const activeTab = candidate.activeTab === "calendarWeek" || candidate.activeTab === "date"
    ? candidate.activeTab
    : "date";
  const fromDate = typeof candidate.fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.fromDate)
    ? candidate.fromDate
    : undefined;
  const toDate = typeof candidate.toDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.toDate)
    ? candidate.toDate
    : undefined;
  const kwStart = typeof candidate.kwStart === "number" && Number.isInteger(candidate.kwStart) && candidate.kwStart >= 1 && candidate.kwStart <= 53
    ? candidate.kwStart
    : undefined;
  const weekCount = typeof candidate.weekCount === "number" && Number.isInteger(candidate.weekCount) && candidate.weekCount >= 1 && candidate.weekCount <= 52
    ? candidate.weekCount
    : undefined;

  return {
    activeTab,
    fromDate,
    toDate,
    kwStart,
    weekCount,
  };
}

export function resolveTourenplanPrintMode(value: unknown): TourenplanPrintMode {
  return value === "spardruck" ? "spardruck" : "farbdruck";
}

export function resolveTourenplanFontSize(value: unknown): TourenplanFontSize {
  if (value === "small" || value === "large") {
    return value;
  }
  return "medium";
}

export function resolveLegacyProduktionsplanungSelection(value: unknown): LegacyProduktionsplanungSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { productCategoryIds: [], componentCategoryIds: [], useShortCodes: false, sonderblockTagIds: [] };
  }
  const candidate = value as Record<string, unknown>;
  const parseIds = (input: unknown) => Array.isArray(input)
    ? input.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
    : [];
  const productCategoryIds = parseIds(candidate.productCategoryIds);
  const componentCategoryIds = parseIds(candidate.componentCategoryIds);
  const sonderblockTagIds = Array.isArray(candidate.sonderblockTagIds)
    ? candidate.sonderblockTagIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
    : [];

  return {
    productCategoryIds: Array.from(new Set(productCategoryIds)),
    componentCategoryIds: Array.from(new Set(componentCategoryIds)),
    useShortCodes: typeof candidate.useShortCodes === "boolean" ? candidate.useShortCodes : false,
    sonderblockTagIds: Array.from(new Set(sonderblockTagIds)),
  };
}

export function useSettings() {
  return useSettingsContext();
}

export function useSetting<K extends UserSettingKey>(key: K): UserSettingValueByKey[K] | undefined {
  const { settingsByKey } = useSettingsContext();

  return useMemo(() => {
    const setting = settingsByKey.get(key);
    if (key === "attachmentPreviewSize") {
      const value = setting?.resolvedValue;
      if (value === "small" || value === "medium" || value === "large") {
        return value as UserSettingValueByKey[K];
      }
      return "large" as UserSettingValueByKey[K];
    }
    if (key === "calendarWeekendColumnPercent") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
        return value as UserSettingValueByKey[K];
      }
      return 33 as UserSettingValueByKey[K];
    }
    if (key === "cardListColumns") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= 6) {
        return value as UserSettingValueByKey[K];
      }
      return 4 as UserSettingValueByKey[K];
    }
    if (key === "helpTextPreviewSize") {
      const value = setting?.resolvedValue;
      if (value === "small" || value === "medium" || value === "large") {
        return value as UserSettingValueByKey[K];
      }
      return "large" as UserSettingValueByKey[K];
    }
    if (key === "entityFormShell.sidebarWidthPx") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 260 && value <= 480) {
        return value as UserSettingValueByKey[K];
      }
      return 360 as UserSettingValueByKey[K];
    }
    if (key === "entityFormShell.contentMaxWidthPx") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 640 && value <= 1100) {
        return value as UserSettingValueByKey[K];
      }
      return 960 as UserSettingValueByKey[K];
    }
    if (key === "hoverPreviewOpenDelayMs") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2000) {
        return value as UserSettingValueByKey[K];
      }
      return 380 as UserSettingValueByKey[K];
    }
    if (key === "toastDesktopPosition") {
      return resolveToastDesktopPosition(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekLanes.isCollapsed") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : false) as UserSettingValueByKey[K];
    }
    if (key === "backup_enabled") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : true) as UserSettingValueByKey[K];
    }
    if (key === "auth_two_factor_enabled") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : false) as UserSettingValueByKey[K];
    }
    if (key === "monitoring.tr01.allAppointments") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : false) as UserSettingValueByKey[K];
    }
    if (key === "monitoring.tr01.horizonDays") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365) {
        return value as UserSettingValueByKey[K];
      }
      return 14 as UserSettingValueByKey[K];
    }
    if (key === "monitoring.tr01.minimumEmployees") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50) {
        return value as UserSettingValueByKey[K];
      }
      return 1 as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekLanes.expandedLaneId") {
      return (typeof setting?.resolvedValue === "string" ? setting.resolvedValue : "") as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekTileBodyMode") {
      return resolveWeekTileBodyMode(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.vorlaufliste.categorySelection") {
      return resolveVorlauflisteCategorySelection(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.produktionsplanung.selection") {
      return resolveProduktionsplanungSelection(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.auftragsliste.selection") {
      return resolveAuftragslisteSelection(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.vorlaufliste.rangeConfig") {
      return resolveVorlauflisteRangeConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.produktionsplanung.rangeConfig") {
      return resolveProduktionsplanungRangeConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.auftragsliste.rangeConfig") {
      return resolveAuftragslisteRangeConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.tourenplan.rangeConfig") {
      return resolveTourenplanRangeConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.tourenplan.printMode") {
      return resolveTourenplanPrintMode(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.tourenplan.fontSize") {
      return resolveTourenplanFontSize(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.categoryLayout") {
      return resolveCategoryLayoutConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    return setting?.resolvedValue as UserSettingValueByKey[K] | undefined;
  }, [key, settingsByKey]);
}
