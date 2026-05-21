export type AppointmentResourcePreviewStatus =
  | "will_add"
  | "conflict"
  | "already_present"
  | "current_only"
  | "will_remove";

export type AppointmentResourcePreviewSource =
  | "week_plan"
  | "available"
  | "current";

export type AppointmentResourcePreviewItem = {
  employeeId: number;
  employeeName: string;
  status: AppointmentResourcePreviewStatus;
  selectable: boolean;
  conflictReason: string | null;
  source?: AppointmentResourcePreviewSource;
};

export type AppointmentResourcePreviewResponse = {
  isoYear: number;
  isoWeek: number;
  hasWeekPlan: boolean;
  currentEmployeeIds: number[];
  items: AppointmentResourcePreviewItem[];
};

export type AppointmentResourceEmployeeCarryoverMode = "preserve" | "replace";

export type AppointmentResourceResolutionMode = "additive" | "replace";

export function getDefaultResourcePreviewSelection(
  preview: AppointmentResourcePreviewResponse,
): number[] {
  return preview.items
    .filter((item) => item.selectable && item.status === "will_add" && (item.source ?? "week_plan") === "week_plan")
    .map((item) => item.employeeId);
}

export function hasCurrentEmployeeRemovals(preview: AppointmentResourcePreviewResponse): boolean {
  return preview.items.some((item) =>
    item.source === "current"
    && (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE"),
  );
}

export function hasCurrentEmployeeConflicts(preview: AppointmentResourcePreviewResponse): boolean {
  return preview.items.some((item) => item.status === "conflict" && item.source === "current");
}

export function hasWeekPlanActionItems(preview: AppointmentResourcePreviewResponse): boolean {
  return preview.items.some((item) =>
    (item.source ?? "week_plan") === "week_plan"
    && (item.status === "will_add" || item.status === "conflict"),
  );
}

export function hasSelectableWeekPlanAdditions(preview: AppointmentResourcePreviewResponse): boolean {
  return preview.items.some((item) =>
    (item.source ?? "week_plan") === "week_plan"
    && item.status === "will_add"
    && item.selectable,
  );
}

export function hasResourcePreviewDecision(
  preview: AppointmentResourcePreviewResponse,
): boolean {
  return hasCurrentEmployeeRemovals(preview)
    || hasCurrentEmployeeConflicts(preview)
    || hasWeekPlanActionItems(preview);
}

export function getDefaultResourceResolutionMode(
  employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode,
): AppointmentResourceResolutionMode {
  return employeeCarryoverMode === "replace" ? "replace" : "additive";
}

export function shouldShowResourceResolutionMode(
  preview: AppointmentResourcePreviewResponse,
  params: {
    employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode;
    isExistingAppointment: boolean;
    isSameTourAndWeek: boolean;
  },
): boolean {
  return params.employeeCarryoverMode === "preserve"
    && params.isExistingAppointment
    && params.isSameTourAndWeek
    && preview.currentEmployeeIds.length > 0
    && hasSelectableWeekPlanAdditions(preview);
}

export function buildEmployeeIdsFromResourcePreviewSelection(
  preview: AppointmentResourcePreviewResponse,
  selectedIds: number[],
  resolutionMode: AppointmentResourceResolutionMode,
): number[] {
  const selectedSet = new Set(selectedIds);
  const removableConflictEmployeeIds = new Set(
    preview.items
      .filter((item) => item.status === "conflict" && item.source === "current" && item.selectable)
      .map((item) => item.employeeId),
  );
  const forcedRemovalEmployeeIds = new Set(
    preview.items
      .filter((item) =>
        item.source === "current"
        && (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE"),
      )
      .map((item) => item.employeeId),
  );

  if (resolutionMode === "additive") {
    return Array.from(new Set([
      ...preview.currentEmployeeIds.filter((employeeId) => {
        if (forcedRemovalEmployeeIds.has(employeeId)) return false;
        if (!removableConflictEmployeeIds.has(employeeId)) return true;
        return selectedSet.has(employeeId);
      }),
      ...selectedIds,
    ]));
  }

  return Array.from(new Set(
    preview.items
      .filter((item) =>
        item.status === "already_present"
        || selectedSet.has(item.employeeId),
      )
      .map((item) => item.employeeId),
  ));
}
