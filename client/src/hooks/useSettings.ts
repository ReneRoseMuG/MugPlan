import { useMemo } from "react";
import { useSettingsContext } from "@/providers/SettingsProvider";

export type UserSettingKey =
  // Historische Benennung: Der Typname enthaelt auch GLOBAL Settings-Keys.
  | "attachmentPreviewSize"
  | "attachmentStoragePath"
  | "calendarWeekendColumnPercent"
  | "calendarWeekScrollRange"
  | "calendarMonthScrollRange";

type UserSettingValueByKey = {
  attachmentPreviewSize: "small" | "medium" | "large";
  attachmentStoragePath: string;
  calendarWeekendColumnPercent: number;
  calendarWeekScrollRange: number;
  calendarMonthScrollRange: number;
};

export function useSettings() {
  return useSettingsContext();
}

export function useSetting<K extends UserSettingKey>(key: K): UserSettingValueByKey[K] | undefined {
  const { settingsByKey } = useSettingsContext();

  return useMemo(() => {
    const setting = settingsByKey.get(key);
    if (key === "calendarWeekendColumnPercent") {
      const value = setting?.resolvedValue;
      if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
        return value as UserSettingValueByKey[K];
      }
      return 33 as UserSettingValueByKey[K];
    }
    return setting?.resolvedValue as UserSettingValueByKey[K] | undefined;
  }, [key, settingsByKey]);
}
