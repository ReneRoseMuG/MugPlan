import { useMemo, type ReactNode } from "react";
import { CheckCircle2, Loader2, TriangleAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  type DialogBaseStep,
  MutationPreviewDialogBase,
} from "@/components/ui/dialog-base";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import {
  isBlockedWeekPlanOverlap,
  isCurrentEmployeeOverlapRemoval,
} from "@/lib/resource-planning";

export type WeekResourcePreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  tourName?: string | null;
  customerNumber?: string | null;
  projectName?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
  status?: "will_add" | "conflict" | "already_assigned" | "will_remove" | "understaffed" | "keep";
  selectable?: boolean;
  eligible?: boolean;
  conflictReason: string | null;
  isUnderstaffed?: boolean;
};

export type AppointmentResourceDialogPreviewItem = {
  employeeId: number;
  employeeName: string;
  status: "will_add" | "conflict" | "already_present" | "current_only" | "will_remove";
  selectable: boolean;
  conflictReason: string | null;
  source?: "week_plan" | "available" | "current";
};

type ResourcePlanningDialogVariant = "week" | "appointment";
type AppointmentGroupKey = "week_plan_conflict" | "week_plan" | "available" | "current_conflict" | "current";
type AppointmentGroup = {
  key: AppointmentGroupKey;
  title: string | null;
  items: AppointmentResourceDialogPreviewItem[];
};

interface ResourcePlanningDialogProps {
  open: boolean;
  variant?: ResourcePlanningDialogVariant;
  mode?: "add" | "remove";
  employeeId?: number | string;
  employeeName?: string;
  title?: string;
  description?: string;
  weekLabel?: string | null;
  previewItems: Array<WeekResourcePreviewItem | AppointmentResourceDialogPreviewItem>;
  selectedIds?: number[];
  selectedAppointmentIds?: number[];
  isSubmitting: boolean;
  onSelectedIdsChange?: (ids: number[]) => void;
  onSelectedAppointmentIdsChange?: (ids: number[]) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  resolutionMode?: "additive" | "replace";
  onResolutionModeChange?: (mode: "additive" | "replace") => void;
  showResolutionMode?: boolean;
  resolutionNotice?: ReactNode;
  tourName?: string;
  infoText?: string;
  summary?: ReactNode;
  executionMessage?: ReactNode;
  error?: unknown;
  steps?: DialogBaseStep[];
  testId?: string;
}

function formatShortDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}.${month}.${year.slice(-2)}`;
}

function getWeekOperationCount(props: ResourcePlanningDialogProps): number {
  return Math.max(props.steps?.length ?? 1, 1);
}

function getActiveWeekOperationIndex(steps: DialogBaseStep[] | undefined): number {
  if (!steps?.length) return 0;
  const activeIndex = steps.findIndex((step) => step.state === "active");
  if (activeIndex >= 0) return activeIndex;
  const errorIndex = steps.findIndex((step) => step.state === "error");
  if (errorIndex >= 0) return errorIndex;
  return 0;
}

function buildWeekTitle(props: ResourcePlanningDialogProps): string {
  const action = props.mode === "remove" ? "aus Wochenplanung entfernen" : "in Wochenplanung aufnehmen";
  const prefix = getWeekOperationCount(props) > 1 ? "Mehrere Mitarbeiter" : "Mitarbeiter";
  if (props.title) return props.title;
  return `${prefix} ${action}`;
}

function buildWeekConfirmLabel(props: ResourcePlanningDialogProps): string {
  if (props.confirmLabel === "Offene Schritte erneut ausführen") return props.confirmLabel;
  const operationCount = getWeekOperationCount(props);
  if (operationCount <= 1) return "Entscheidung bestätigen";
  const activeIndex = getActiveWeekOperationIndex(props.steps);
  return activeIndex < operationCount - 1 ? "Nächster Mitarbeiter" : "Alle Entscheidungen bestätigen";
}

function weekStatusLabel(item: WeekResourcePreviewItem): string | null {
  const normalizedStatus = item.status
    ?? (item.isUnderstaffed ? "understaffed" : item.eligible === false ? "conflict" : "will_add");
  if (normalizedStatus === "conflict") return "Überschneidung mit bestehendem Termin";
  if (normalizedStatus === "already_assigned") return "Bereits auf diesem Termin zugewiesen";
  if (normalizedStatus === "understaffed") return "Warnung: Termin wird unterbesetzt";
  if (normalizedStatus === "will_remove") return "Wird vom Termin entfernt";
  if (normalizedStatus === "will_add") return "Wird zum Termin hinzugefügt";
  return null;
}

function appointmentStatusLabel(item: AppointmentResourceDialogPreviewItem): string | null {
  if (isCurrentEmployeeOverlapRemoval(item)) return "Wird beim Speichern vom Termin entfernt.";
  if (isBlockedWeekPlanOverlap(item)) return "Am Zieltermin besteht bereits eine ganztägige Planung.";
  if (item.status === "will_remove") return "Wird vom Termin entfernt";
  if (item.conflictReason === "WILL_REMOVE") return "Wird vom Termin entfernt";
  if (item.status === "conflict" && item.source === "current") {
    return "Überschneidung im Zielzeitraum.";
  }
  if (item.status === "conflict") return "Überschneidung mit bestehendem Termin";
  if (item.status === "already_present") return "Bereits im Termin";
  if (item.status === "current_only") return "Bleibt nur durch bestehende Terminzuweisung erhalten";
  if (item.status === "will_add" && item.source === "available") return "Konfliktfrei zuweisbar";
  if (item.status === "will_add") return "Kann dem Termin zugewiesen werden.";
  return null;
}

function appointmentGroupTitle(groupKey: AppointmentGroupKey, hasWeekPlanItems: boolean): string | null {
  if (groupKey === "week_plan_conflict") return null;
  if (groupKey === "week_plan") return null;
  if (groupKey === "current_conflict") return "Zwingend zu entfernen";
  if (groupKey === "available") {
    return hasWeekPlanItems ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter";
  }
  return "Bereits direkt am Termin";
}

function appointmentInfoMessage(items: AppointmentResourceDialogPreviewItem[]): { title: string; tone: "info" | "warning" } | null {
  if (items.some(isCurrentEmployeeOverlapRemoval)) {
    return { title: "Mitarbeiter wegen doppelter Planung nicht verfügbar.", tone: "warning" };
  }
  if (items.some(isBlockedWeekPlanOverlap)) {
    return {
      title: "Mitarbeiter aus der Wochenplanung sind am Zieltermin wegen doppelter Planung nicht verfügbar.",
      tone: "warning",
    };
  }
  if (items.some((item) => (item.source ?? "week_plan") === "week_plan" && item.status === "will_add")) {
    return {
      title: "Mitarbeiter aus der Wochenplanung sind am Zieltermin verfügbar.",
      tone: "info",
    };
  }
  return null;
}

export function ResourcePlanningDialog(props: ResourcePlanningDialogProps) {
  const variant = props.variant ?? "week";
  const selectedIds = props.selectedIds ?? props.selectedAppointmentIds ?? [];
  const setSelectedIds = props.onSelectedIdsChange ?? props.onSelectedAppointmentIdsChange ?? (() => undefined);

  const weekPreviewItems = useMemo(
    () => variant === "week" ? props.previewItems as WeekResourcePreviewItem[] : [],
    [props.previewItems, variant],
  );
  const appointmentPreviewItems = useMemo(
    () => variant === "appointment" ? props.previewItems as AppointmentResourceDialogPreviewItem[] : [],
    [props.previewItems, variant],
  );
  const appointmentGroups = useMemo(() => {
    const groups: AppointmentGroup[] = [];
    const weekPlanConflictItems = appointmentPreviewItems.filter(isBlockedWeekPlanOverlap);
    const weekPlanItems = appointmentPreviewItems.filter((item) =>
      (item.source ?? "week_plan") === "week_plan" && !isBlockedWeekPlanOverlap(item),
    );
    const availableItems = appointmentPreviewItems.filter((item) => item.source === "available");
    const currentConflictItems = appointmentPreviewItems.filter(isCurrentEmployeeOverlapRemoval);
    const currentItems = appointmentPreviewItems.filter((item) => item.source === "current" && !isCurrentEmployeeOverlapRemoval(item));
    const hasWeekPlanItems = weekPlanConflictItems.length > 0 || weekPlanItems.length > 0;

    if (weekPlanConflictItems.length > 0) {
      groups.push({ key: "week_plan_conflict", title: appointmentGroupTitle("week_plan_conflict", hasWeekPlanItems), items: weekPlanConflictItems });
    }
    if (weekPlanItems.length > 0) {
      groups.push({ key: "week_plan", title: appointmentGroupTitle("week_plan", hasWeekPlanItems), items: weekPlanItems });
    }
    if (availableItems.length > 0) {
      groups.push({ key: "available", title: appointmentGroupTitle("available", hasWeekPlanItems), items: availableItems });
    }
    if (currentConflictItems.length > 0) {
      groups.push({ key: "current_conflict", title: appointmentGroupTitle("current_conflict", hasWeekPlanItems), items: currentConflictItems });
    }
    if (currentItems.length > 0) {
      groups.push({ key: "current", title: appointmentGroupTitle("current", hasWeekPlanItems), items: currentItems });
    }

    return groups;
  }, [appointmentPreviewItems]);
  const appointmentInfo = variant === "appointment" ? appointmentInfoMessage(appointmentPreviewItems) : null;
  const weekOperationCount = variant === "week" ? getWeekOperationCount(props) : 1;
  const activeWeekOperationIndex = variant === "week" ? getActiveWeekOperationIndex(props.steps) : 0;
  const weekHeaderContent = variant === "week" && weekOperationCount > 1 ? (
    <div className="flex min-w-0 items-center justify-center gap-2" data-testid="header-tour-employee-cascade-employee">
      <span
        className="inline-flex h-7 min-w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
        data-testid="text-tour-employee-cascade-position"
      >
        {activeWeekOperationIndex + 1}/{weekOperationCount}
      </span>
    </div>
  ) : undefined;
  const primaryConfirmLabel = variant === "week"
    ? buildWeekConfirmLabel(props)
    : props.confirmLabel ?? "Bestätigen";
  const dialogSize = variant === "appointment" && props.infoText ? "md" : "xl";
  const footer = (
    <DialogBaseFooter
      secondaryAction={{
        label: "Abbrechen",
        onClick: props.onClose,
        disabled: props.isSubmitting,
      }}
      primaryAction={{
        label: primaryConfirmLabel,
        pendingLabel: "Speichern...",
        onClick: props.onConfirm,
        isPending: props.isSubmitting,
        testId: "button-tour-employee-cascade-confirm",
      }}
    />
  );

  return (
    <MutationPreviewDialogBase
      open={props.open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) props.onClose();
      }}
      closeDisabled={props.isSubmitting}
      title={variant === "week" ? buildWeekTitle(props) : props.title}
      headerContent={weekHeaderContent}
      size={dialogSize}
      steps={variant === "week" ? undefined : props.steps}
      summary={variant === "week" ? undefined : props.summary}
      error={props.error}
      footer={footer}
      testId={props.testId ?? "dialog-tour-employee-cascade"}
    >
      <div className="space-y-4" data-testid="dialog-resource-planning">
        {(variant === "week" && props.employeeName) || (props.infoText && props.employeeName) ? (
          <div className="rounded-md border bg-slate-50 p-4" data-testid="week-planning-employee-context">
            <EmployeeInfoBadge
              id={props.employeeId}
              fullName={props.employeeName}
              size="sm"
              fullWidth
              renderMode="detail"
              showPreview={false}
              testId="badge-tour-employee-cascade-employee"
            />
            <p className="mt-2 text-sm text-slate-600">
              {props.infoText
                  ? props.infoText
                  : props.mode === "remove"
                  ? `wird aus der Wochenplanung${props.tourName || props.weekLabel ? ` von ${[props.tourName, props.weekLabel].filter(Boolean).join(" / ")}` : ""} entfernt`
                  : `wird in die Wochenplanung${props.tourName || props.weekLabel ? ` von ${[props.tourName, props.weekLabel].filter(Boolean).join(" / ")}` : ""} übernommen`}
            </p>
          </div>
        ) : null}

        {props.executionMessage ? (
          <DialogBaseInlineMessage
            tone="info"
            title="Status"
            description={props.executionMessage}
          />
        ) : null}

        {variant === "appointment" && !props.infoText && appointmentInfo ? (
          <DialogBaseInlineMessage
            tone={appointmentInfo.tone}
            title={appointmentInfo.title}
          />
        ) : null}

        {variant === "appointment" && props.showResolutionMode ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3" data-testid="appointment-week-resolution-mode">
            <span className="text-sm font-medium text-slate-700">Übernahme:</span>
            <Button
              type="button"
              variant={props.resolutionMode === "additive" ? "default" : "outline"}
              size="sm"
              onClick={() => props.onResolutionModeChange?.("additive")}
              disabled={props.isSubmitting}
              data-testid="button-appointment-week-mode-additive"
            >
              Additiv
            </Button>
            <Button
              type="button"
              variant={props.resolutionMode === "replace" ? "default" : "outline"}
              size="sm"
              onClick={() => props.onResolutionModeChange?.("replace")}
              disabled={props.isSubmitting}
              data-testid="button-appointment-week-mode-replace"
            >
              Ersetzen
            </Button>
          </div>
        ) : null}

        {variant === "appointment" && !props.showResolutionMode && props.resolutionNotice ? (
          <DialogBaseInlineMessage
            tone="info"
            title="Mitarbeiter werden ersetzt"
            description={props.resolutionNotice}
          />
        ) : null}

        {props.infoText ? null : <div className="max-h-[60vh] overflow-auto rounded-md border" data-testid="list-tour-employee-cascade-preview">
          {variant === "week" ? (
            weekPreviewItems.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                Keine zukünftigen Termine betroffen.
              </div>
            ) : (
              <div className="divide-y">
                {weekPreviewItems.map((item) => {
                  const checked = selectedIds.includes(item.appointmentId);
                  const selectable = item.selectable ?? item.eligible ?? false;
                  const projectLabel = item.orderNumber && item.projectName
                    ? `${item.orderNumber} - ${item.projectName}`
                    : item.orderNumber ?? item.projectName ?? null;
                  const customerLabel = item.customerNumber
                    ? (item.customerName ? `K: ${item.customerNumber} - ${item.customerName}` : `K: ${item.customerNumber}`)
                    : item.customerName ?? null;
                  const statusLabel = weekStatusLabel(item);
                  return (
                    <label
                      key={item.appointmentId}
                      className={`flex items-start gap-3 p-4 ${selectable ? "cursor-pointer" : "opacity-70"}`}
                      data-testid={`tour-employee-cascade-row-${item.appointmentId}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!selectable || props.isSubmitting}
                        onCheckedChange={(nextChecked) => {
                          if (!selectable) return;
                          if (nextChecked) {
                            setSelectedIds([...selectedIds, item.appointmentId]);
                            return;
                          }
                          setSelectedIds(selectedIds.filter((id) => id !== item.appointmentId));
                        }}
                        data-testid={`tour-employee-cascade-checkbox-${item.appointmentId}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{formatShortDate(item.startDate)}</span>
                          {item.endDate ? <span className="text-sm text-slate-500">bis {formatShortDate(item.endDate)}</span> : null}
                        </div>
                        {projectLabel ? <div className="text-sm text-slate-700">{projectLabel}</div> : null}
                        {customerLabel ? <div className="text-sm text-slate-600">{customerLabel}</div> : null}
                        {statusLabel ? (
                          <div
                            className={item.status === "conflict" || item.eligible === false ? "text-sm text-red-600" : "text-sm text-amber-700"}
                            data-testid={`tour-employee-cascade-status-${item.appointmentId}`}
                          >
                            {statusLabel}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )
          ) : appointmentPreviewItems.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              Keine Mitarbeiter für die Vorschau vorhanden.
            </div>
          ) : (
            <div>
              {appointmentGroups.map((group) => (
                <section key={group.key} className="border-b last:border-b-0" data-testid={`appointment-week-preview-group-${group.key}`}>
                  {group.title ? (
                    <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                      {group.title}
                    </div>
                  ) : null}
                  <div className="divide-y">
                    {group.items.map((item) => {
                      const checked = selectedIds.includes(item.employeeId);
                      const statusLabel = appointmentStatusLabel(item);
                      const StatusIcon = item.status === "conflict"
                        ? TriangleAlert
                        : item.status === "already_present"
                          ? CheckCircle2
                          : null;
                      const showCheckbox = !isCurrentEmployeeOverlapRemoval(item) && !isBlockedWeekPlanOverlap(item);
                      const rowClassName = `flex items-start gap-3 p-4 ${showCheckbox && item.selectable ? "cursor-pointer" : "opacity-70"}`;
                      const rowContent = (
                        <>
                          {showCheckbox ? (
                            <Checkbox
                              checked={checked}
                              disabled={!item.selectable || props.isSubmitting}
                              onCheckedChange={(nextChecked) => {
                                if (!item.selectable) return;
                                if (nextChecked) {
                                  setSelectedIds([...selectedIds, item.employeeId]);
                                  return;
                                }
                                setSelectedIds(selectedIds.filter((id) => id !== item.employeeId));
                              }}
                              data-testid={`appointment-week-preview-checkbox-${item.employeeId}`}
                            />
                          ) : null}
                          <div className="min-w-0 flex-1 space-y-1">
                            <EmployeeInfoBadge
                              id={item.employeeId}
                              fullName={item.employeeName}
                              size="sm"
                              fullWidth
                              renderMode="detail"
                              showPreview={false}
                              testId={`badge-appointment-week-preview-${item.employeeId}`}
                            />
                            {statusLabel ? (
                              <div
                                className={item.status === "conflict" ? "flex items-center gap-1 text-sm text-red-600" : "flex items-center gap-1 text-sm text-slate-600"}
                                data-testid={`appointment-week-preview-status-${item.employeeId}`}
                              >
                                {StatusIcon ? <StatusIcon className="h-3.5 w-3.5" /> : null}
                                {statusLabel}
                              </div>
                            ) : null}
                          </div>
                        </>
                      );
                      return showCheckbox ? (
                        <label
                          key={item.employeeId}
                          className={rowClassName}
                          data-testid={`appointment-week-preview-row-${item.employeeId}`}
                        >
                          {rowContent}
                        </label>
                      ) : (
                        <div
                          key={item.employeeId}
                          className={rowClassName}
                          data-testid={`appointment-week-preview-row-${item.employeeId}`}
                        >
                          {rowContent}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>}

        {props.isSubmitting ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Änderungen werden ausgeführt.
          </div>
        ) : null}
      </div>
    </MutationPreviewDialogBase>
  );
}
