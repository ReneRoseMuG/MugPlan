import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { api } from "@shared/routes";
import type { Tag } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { useSettingsContext } from "@/providers/SettingsProvider";
import type {
  BulkWeekMoveExecuteResponse,
  BulkWeekMovePreviewResponse,
} from "@/lib/calendar-bulk-week-move";

export type BulkWeekMoveTour = z.infer<(typeof api.tours.list.responses)[200]>[number];

const SOURCE_TOUR_IDS_KEY = "calendarBulkMove.sourceTourIds";
const SHIFT_WEEKS_KEY = "calendarBulkMove.shiftWeeks";
const BLOCKING_TAG_IDS_KEY = "calendarBulkMove.blockingTagIds";

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : fallback;
}

function invalidateCalendarQueries(): void {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey)
      && typeof query.queryKey[0] === "string"
      && (query.queryKey[0] as string).startsWith("/api/calendar/"),
  });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey)
      && typeof query.queryKey[0] === "string"
      && (query.queryKey[0] as string).startsWith("/api/appointments"),
  });
}

export function useBulkWeekMove(params: { open: boolean; sourceWeekDate: string }) {
  const { settingsByKey, setSetting } = useSettingsContext();

  const toursQuery = useQuery<BulkWeekMoveTour[]>({
    queryKey: [api.tours.list.path],
    enabled: params.open,
  });

  const tagsQuery = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
    enabled: params.open,
  });

  const savedSourceTourIds = useMemo(
    () => toNumberArray(settingsByKey.get(SOURCE_TOUR_IDS_KEY)?.resolvedValue),
    [settingsByKey],
  );
  const savedShiftWeeks = useMemo(
    () => toPositiveInteger(settingsByKey.get(SHIFT_WEEKS_KEY)?.resolvedValue, 1),
    [settingsByKey],
  );
  const savedBlockingTagIds = useMemo(
    () => toNumberArray(settingsByKey.get(BLOCKING_TAG_IDS_KEY)?.resolvedValue),
    [settingsByKey],
  );
  const hasSavedBlockingTagSelection = settingsByKey.get(BLOCKING_TAG_IDS_KEY)?.userValue !== undefined;

  const previewMutation = useMutation<BulkWeekMovePreviewResponse, Error, {
    sourceTourIds: number[];
    shiftWeeks: number;
    blockingTagIds: number[];
  }>({
    mutationFn: async (input) => {
      const response = await apiRequest("POST", api.calendarBulkWeekMove.preview.path, {
        sourceTourIds: input.sourceTourIds,
        sourceWeekDate: params.sourceWeekDate,
        shiftWeeks: input.shiftWeeks,
        blockingTagIds: input.blockingTagIds,
      });
      return (await response.json()) as BulkWeekMovePreviewResponse;
    },
  });

  const executeMutation = useMutation<BulkWeekMoveExecuteResponse, Error, {
    shiftWeeks: number;
    items: Array<{ appointmentId: number; version: number }>;
  }>({
    mutationFn: async (input) => {
      const response = await apiRequest("POST", api.calendarBulkWeekMove.execute.path, input);
      return (await response.json()) as BulkWeekMoveExecuteResponse;
    },
    onSuccess: () => {
      invalidateCalendarQueries();
    },
  });

  const persistConfig = async (config: {
    sourceTourIds: number[];
    shiftWeeks: number;
    blockingTagIds: number[];
  }): Promise<void> => {
    await Promise.allSettled([
      setSetting({ key: SOURCE_TOUR_IDS_KEY, scopeType: "USER", value: config.sourceTourIds }),
      setSetting({ key: SHIFT_WEEKS_KEY, scopeType: "USER", value: config.shiftWeeks }),
      setSetting({ key: BLOCKING_TAG_IDS_KEY, scopeType: "USER", value: config.blockingTagIds }),
    ]);
  };

  return {
    tours: toursQuery.data ?? [],
    tags: tagsQuery.data ?? [],
    isCatalogLoading: toursQuery.isLoading || tagsQuery.isLoading,
    savedSourceTourIds,
    savedShiftWeeks,
    savedBlockingTagIds,
    hasSavedBlockingTagSelection,
    preview: previewMutation.data ?? null,
    isPreviewPending: previewMutation.isPending,
    previewError: previewMutation.error ?? null,
    runPreview: previewMutation.mutateAsync,
    resetPreview: previewMutation.reset,
    executeResult: executeMutation.data ?? null,
    isExecutePending: executeMutation.isPending,
    executeError: executeMutation.error ?? null,
    runExecute: executeMutation.mutateAsync,
    resetExecute: executeMutation.reset,
    persistConfig,
  };
}
