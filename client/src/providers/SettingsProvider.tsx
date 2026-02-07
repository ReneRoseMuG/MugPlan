import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type UserSettingsResolvedResponse } from "@shared/routes";

type ResolvedSetting = UserSettingsResolvedResponse[number];

type SettingsContextValue = {
  settings: ResolvedSetting[];
  settingsByKey: Map<string, ResolvedSetting>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  retry: () => Promise<unknown>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const query = useQuery<UserSettingsResolvedResponse>({
    queryKey: [api.userSettings.getResolved.path],
    queryFn: async () => {
      const response = await fetch(api.userSettings.getResolved.path, {
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      return response.json();
    },
  });

  const settings = query.data ?? [];

  const value = useMemo<SettingsContextValue>(() => {
    const settingsByKey = new Map(settings.map((entry) => [entry.key, entry] as const));

    return {
      settings,
      settingsByKey,
      isLoading: query.isLoading,
      isError: query.isError,
      errorMessage: query.error instanceof Error ? query.error.message : null,
      retry: query.refetch,
    };
  }, [query.error, query.isError, query.isLoading, query.refetch, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettingsContext must be used within SettingsProvider");
  }
  return context;
}
