import { useMemo } from "react";
import { useSettingsContext } from "@/providers/SettingsProvider";
import {
  resolveCategoryLayoutConfig,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";

type ToastDesktopPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type CalendarMarkerVisualizationStyle = "subtle" | "standard" | "highlighted";

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
  | "dispatcherLogin.conflictLookaheadWeeks"
  | "calendarWeekendColumnPercent"
  | "calendarWeekScrollRange"
  | "calendarMonthScrollRange"
  | "calendar.markerVisualizationStyle"
  | "hoverPreviewOpenDelayMs"
  | "cardListColumns"
  | "calendar.weekLanes.isCollapsed"
  | "calendar.weekLanes.expandedLaneId"
  | "calendar.weekAbsenceLane.collapsed"
  | "tourWeekPlanning.weekLanes.isCollapsed"
  | "tourWeekPlanning.weekLanes.expandedLaneId"
  | "calendar.weekTileBodyMode"
  | "calendar.weekPersonnelColumn.visible"
  | "calendar.weekInlineNotes.visible"
  | "calendar.weekPersonnelColumn.collapsed"
  | "calendar.monthFitPage"
  | "calendar.tourHeaderTextColors"
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
  "dispatcherLogin.conflictLookaheadWeeks": number;
  calendarWeekendColumnPercent: number;
  calendarWeekScrollRange: number;
  calendarMonthScrollRange: number;
  "calendar.markerVisualizationStyle": CalendarMarkerVisualizationStyle;
  hoverPreviewOpenDelayMs: number;
  cardListColumns: number;
  "calendar.weekLanes.isCollapsed": boolean;
  "calendar.weekLanes.expandedLaneId": string;
  "calendar.weekAbsenceLane.collapsed": boolean;
  "tourWeekPlanning.weekLanes.isCollapsed": boolean;
  "tourWeekPlanning.weekLanes.expandedLaneId": string;
  "calendar.weekTileBodyMode": "collapsed" | "semiexpanded" | "expanded";
  "calendar.weekPersonnelColumn.visible": boolean;
  "calendar.weekInlineNotes.visible": boolean;
  "calendar.weekPersonnelColumn.collapsed": boolean;
  "calendar.monthFitPage": boolean;
  "calendar.tourHeaderTextColors": Record<string, string>;
  "reports.categoryLayout": CategoryLayoutConfig;
};

export function resolveWeekTileBodyMode(value: unknown): UserSettingValueByKey["calendar.weekTileBodyMode"] {
  if (value === "collapsed" || value === "semiexpanded" || value === "expanded") {
    return value;
  }
  return "semiexpanded";
}

export function resolveTourHeaderTextColors(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return {};
}

export function resolveCalendarMarkerVisualizationStyle(value: unknown): CalendarMarkerVisualizationStyle {
  if (value === "subtle" || value === "standard" || value === "highlighted") {
    return value;
  }
  return "standard";
}

export function resolveToastDesktopPosition(value: unknown): ToastDesktopPosition {
  if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right") {
    return value;
  }
  return "bottom-right";
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
    if (
      key === "calendar.weekLanes.isCollapsed"
      || key === "calendar.weekAbsenceLane.collapsed"
      || key === "tourWeekPlanning.weekLanes.isCollapsed"
    ) {
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
    if (key === "dispatcherLogin.conflictLookaheadWeeks") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12) {
        return value as UserSettingValueByKey[K];
      }
      return 2 as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekLanes.expandedLaneId" || key === "tourWeekPlanning.weekLanes.expandedLaneId") {
      return (typeof setting?.resolvedValue === "string" ? setting.resolvedValue : "") as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekTileBodyMode") {
      return resolveWeekTileBodyMode(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekPersonnelColumn.visible") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : false) as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekInlineNotes.visible") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : false) as UserSettingValueByKey[K];
    }
    if (key === "calendar.weekPersonnelColumn.collapsed") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : true) as UserSettingValueByKey[K];
    }
    if (key === "calendar.monthFitPage") {
      return (typeof setting?.resolvedValue === "boolean" ? setting.resolvedValue : true) as UserSettingValueByKey[K];
    }
    if (key === "calendar.markerVisualizationStyle") {
      return resolveCalendarMarkerVisualizationStyle(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "calendar.tourHeaderTextColors") {
      return resolveTourHeaderTextColors(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    if (key === "reports.categoryLayout") {
      return resolveCategoryLayoutConfig(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    return setting?.resolvedValue as UserSettingValueByKey[K] | undefined;
  }, [key, settingsByKey]);
}
