import { useMemo } from "react";
import { useSettingsContext } from "@/providers/SettingsProvider";

type ToastDesktopPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type UserSettingKey =
  // Historische Benennung: Der Typname enthaelt auch GLOBAL Settings-Keys.
  | "attachmentPreviewSize"
  | "helpTextPreviewSize"
  | "toastDesktopPosition"
  | "backup_enabled"
  | "auth_two_factor_enabled"
  | "monitoring.tr01.enabled"
  | "monitoring.tr01.horizonDays"
  | "monitoring.tr01.minimumEmployees"
  | "calendarWeekendColumnPercent"
  | "calendarWeekScrollRange"
  | "calendarMonthScrollRange"
  | "hoverPreviewOpenDelayMs"
  | "cardListColumns"
  | "calendar.weekLanes.isCollapsed"
  | "calendar.weekLanes.expandedLaneId"
  | "calendar.weekAppointmentDisplayMode"
  | "demoData.adminFormState";

type UserSettingValueByKey = {
  attachmentPreviewSize: "small" | "medium" | "large";
  helpTextPreviewSize: "small" | "medium" | "large";
  toastDesktopPosition: ToastDesktopPosition;
  backup_enabled: boolean;
  auth_two_factor_enabled: boolean;
  "monitoring.tr01.enabled": boolean;
  "monitoring.tr01.horizonDays": number;
  "monitoring.tr01.minimumEmployees": number;
  calendarWeekendColumnPercent: number;
  calendarWeekScrollRange: number;
  calendarMonthScrollRange: number;
  hoverPreviewOpenDelayMs: number;
  cardListColumns: number;
  "calendar.weekLanes.isCollapsed": boolean;
  "calendar.weekLanes.expandedLaneId": string;
  "calendar.weekAppointmentDisplayMode": "standard" | "compact" | "detail" | "split";
  "demoData.adminFormState": string;
};

export function resolveWeekAppointmentDisplayMode(value: unknown): UserSettingValueByKey["calendar.weekAppointmentDisplayMode"] {
  if (value === "standard" || value === "compact" || value === "detail" || value === "split") {
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
    if (key === "monitoring.tr01.enabled") {
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
    if (key === "calendar.weekAppointmentDisplayMode") {
      return resolveWeekAppointmentDisplayMode(setting?.resolvedValue) as UserSettingValueByKey[K];
    }
    return setting?.resolvedValue as UserSettingValueByKey[K] | undefined;
  }, [key, settingsByKey]);
}
