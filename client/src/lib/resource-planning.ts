export type AppointmentResourcePreviewStatus =
  | "will_add"
  | "conflict"
  | "already_present"
  | "current_only";

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

export function getDefaultResourcePreviewSelection(
  preview: AppointmentResourcePreviewResponse,
): number[] {
  return preview.items
    .filter((item) => item.selectable && item.status === "will_add" && (item.source ?? "week_plan") === "week_plan")
    .map((item) => item.employeeId);
}

export function hasResourcePreviewDecision(
  preview: AppointmentResourcePreviewResponse,
): boolean {
  if (preview.hasWeekPlan) return true;
  return preview.items.some((item) => item.status === "conflict" && item.source === "current");
}

export function buildEmployeeIdsFromResourcePreviewSelection(
  preview: AppointmentResourcePreviewResponse,
  selectedIds: number[],
  resolutionMode: "additive" | "replace",
): number[] {
  const selectedSet = new Set(selectedIds);
  const removableConflictEmployeeIds = new Set(
    preview.items
      .filter((item) => item.status === "conflict" && item.source === "current" && item.selectable)
      .map((item) => item.employeeId),
  );

  if (resolutionMode === "additive") {
    return Array.from(new Set([
      ...preview.currentEmployeeIds.filter((employeeId) => {
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
