import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type UserSettingsResolvedResponse } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ResolvedSetting = UserSettingsResolvedResponse[number];

type SetSettingInput = {
  key: string;
  scopeType: "GLOBAL" | "ROLE" | "USER";
  value: unknown;
};

type SettingsContextValue = {
  settings: ResolvedSetting[];
  settingsByKey: Map<string, ResolvedSetting>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isSaving: boolean;
  retry: () => Promise<unknown>;
  setSetting: (input: SetSettingInput) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const userSettingsResolvedQueryKey = [api.userSettings.getResolved.path] as const;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const query = useQuery<UserSettingsResolvedResponse>({
    queryKey: userSettingsResolvedQueryKey,
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

  const setMutation = useMutation({
    mutationFn: async (input: SetSettingInput) => {
      const response = await apiRequest("PATCH", api.userSettings.set.path, input);
      return (await response.json()) as UserSettingsResolvedResponse;
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(userSettingsResolvedQueryKey, updatedSettings);
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
      isSaving: setMutation.isPending,
      retry: query.refetch,
      setSetting: async (input) => {
        await setMutation.mutateAsync(input);
      },
    };
  }, [query.error, query.isError, query.isLoading, query.refetch, setMutation, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettingsContext must be used within SettingsProvider");
  }
  return context;
}
