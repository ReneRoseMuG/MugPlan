import { useMemo } from "react";
import { useSettingsContext } from "@/providers/SettingsProvider";

export type UserSettingKey = "attachmentPreviewSize";

type UserSettingValueByKey = {
  attachmentPreviewSize: "small" | "medium" | "large";
};

export function useSettings() {
  return useSettingsContext();
}

export function useSetting<K extends UserSettingKey>(key: K): UserSettingValueByKey[K] | undefined {
  const { settingsByKey } = useSettingsContext();

  return useMemo(() => {
    const setting = settingsByKey.get(key);
    return setting?.resolvedValue as UserSettingValueByKey[K] | undefined;
  }, [key, settingsByKey]);
}
