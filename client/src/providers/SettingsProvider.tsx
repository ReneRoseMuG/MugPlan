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

type SetSettingRequest = SetSettingInput & {
  version: number;
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

export function resolveSettingVersion(
  settings: UserSettingsResolvedResponse | undefined,
  input: Pick<SetSettingInput, "key" | "scopeType">,
): number | null {
  const setting = settings?.find((entry) => entry.key === input.key);
  if (!setting) return null;

  const versionByScope = input.scopeType === "USER"
    ? setting.userVersion
    : input.scopeType === "ROLE"
      ? setting.roleVersion
      : setting.globalVersion;

  if (Number.isInteger(versionByScope) && (versionByScope as number) >= 1) {
    return versionByScope as number;
  }

  if (setting.allowedScopes.includes(input.scopeType)) {
    return 1;
  }

  return null;
}

export function isVersionConflictError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: unknown }).code === "VERSION_CONFLICT";
  }
  if (error instanceof Error) {
    return error.message.includes("VERSION_CONFLICT");
  }
  return false;
}

function applyOptimisticSettingUpdate(
  settings: UserSettingsResolvedResponse | undefined,
  input: SetSettingInput,
): UserSettingsResolvedResponse {
  if (!settings) return [];

  return settings.map((entry) => {
    if (entry.key !== input.key) {
      return entry;
    }

    const nextVersion = resolveSettingVersion(settings, input) ?? 1;
    const nextEntry = {
      ...entry,
    };

    if (input.scopeType === "USER") {
      nextEntry.userValue = input.value;
      nextEntry.userVersion = nextVersion;
    } else if (input.scopeType === "ROLE") {
      nextEntry.roleValue = input.value;
      nextEntry.roleVersion = nextVersion;
    } else {
      nextEntry.globalValue = input.value;
      nextEntry.globalVersion = nextVersion;
    }

    if (nextEntry.userValue !== undefined) {
      nextEntry.resolvedValue = nextEntry.userValue;
      nextEntry.resolvedVersion = nextEntry.userVersion;
      nextEntry.resolvedScope = "USER";
    } else if (nextEntry.roleValue !== undefined) {
      nextEntry.resolvedValue = nextEntry.roleValue;
      nextEntry.resolvedVersion = nextEntry.roleVersion;
      nextEntry.resolvedScope = "ROLE";
    } else if (nextEntry.globalValue !== undefined) {
      nextEntry.resolvedValue = nextEntry.globalValue;
      nextEntry.resolvedVersion = nextEntry.globalVersion;
      nextEntry.resolvedScope = "GLOBAL";
    } else {
      nextEntry.resolvedValue = nextEntry.defaultValue;
      nextEntry.resolvedVersion = undefined;
      nextEntry.resolvedScope = "DEFAULT";
    }

    return nextEntry;
  });
}

export async function setSettingWithVersionRetry(params: {
  input: SetSettingInput;
  currentSettings: UserSettingsResolvedResponse | undefined;
  mutate: (input: SetSettingRequest) => Promise<unknown>;
  refetchSettings: () => Promise<UserSettingsResolvedResponse | undefined>;
}): Promise<void> {
  const firstVersion = resolveSettingVersion(params.currentSettings, params.input);
  if (firstVersion === null) {
    throw new Error("VALIDATION_ERROR: missing current version");
  }
  try {
    await params.mutate({ ...params.input, version: firstVersion });
    return;
  } catch (error) {
    if (!isVersionConflictError(error)) {
      throw error;
    }
  }

  const latestSettings = await params.refetchSettings();
  const retryVersion = resolveSettingVersion(latestSettings, params.input);
  if (retryVersion === null) {
    throw new Error("VALIDATION_ERROR: missing refreshed version");
  }
  await params.mutate({ ...params.input, version: retryVersion });
}

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
    mutationFn: async (input: SetSettingRequest) => {
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
      setSetting: async (input: SetSettingInput) => {
        const previousSettings = queryClient.getQueryData<UserSettingsResolvedResponse>(userSettingsResolvedQueryKey) ?? query.data ?? [];
        const optimisticSettings = applyOptimisticSettingUpdate(previousSettings, input);

        queryClient.setQueryData(userSettingsResolvedQueryKey, optimisticSettings);

        try {
          await setSettingWithVersionRetry({
            input,
            currentSettings: previousSettings,
            mutate: async (request) => {
              await setMutation.mutateAsync(request);
            },
            refetchSettings: async () => {
              const refreshed = await query.refetch();
              return refreshed.data
                ?? queryClient.getQueryData<UserSettingsResolvedResponse>(userSettingsResolvedQueryKey)
                ?? [];
            },
          });
        } catch (error) {
          queryClient.setQueryData(userSettingsResolvedQueryKey, previousSettings);
          throw error;
        }
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
