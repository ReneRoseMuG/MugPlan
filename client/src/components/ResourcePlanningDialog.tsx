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
  if (item.status === "will_remove") return "Wird vom Termin entfernt";
  if (item.conflictReason === "WILL_REMOVE") return "Wird vom Termin entfernt";
  if (item.status === "conflict" && item.source === "current") {
    return "Überschneidung im Zielzeitraum. Abwählen entfernt den Mitarbeiter beim Speichern.";
  }
  if (item.status === "conflict") return "Überschneidung mit bestehendem Termin";
  if (item.status === "already_present") return "Bereits im Termin";
  if (item.status === "current_only") return "Bleibt nur durch bestehende Terminzuweisung erhalten";
  if (item.status === "will_add" && item.source === "available") return "Konfliktfrei zuweisbar";
  if (item.status === "will_add") return "Kann aus der Wochenplanung übernommen werden";
  return null;
}

function appointmentGroupTitle(source: AppointmentResourceDialogPreviewItem["source"], hasWeekPlanItems: boolean): string {
  if (source === "available") {
    return hasWeekPlanItems ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter";
  }
  if (source === "current") return "Bereits direkt am Termin";
  return "Tour-KW-Mitarbeiter";
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
    const groups: Array<{ key: "week_plan" | "available" | "current"; title: string; items: AppointmentResourceDialogPreviewItem[] }> = [];
    const weekPlanItems = appointmentPreviewItems.filter((item) => (item.source ?? "week_plan") === "week_plan");
    const availableItems = appointmentPreviewItems.filter((item) => item.source === "available");
    const currentItems = appointmentPreviewItems.filter((item) => item.source === "current");
    const hasWeekPlanItems = weekPlanItems.length > 0;

    if (weekPlanItems.length > 0) {
      groups.push({ key: "week_plan", title: appointmentGroupTitle("week_plan", hasWeekPlanItems), items: weekPlanItems });
    }
    if (availableItems.length > 0) {
      groups.push({ key: "available", title: appointmentGroupTitle("available", hasWeekPlanItems), items: availableItems });
    }
    if (currentItems.length > 0) {
      groups.push({ key: "current", title: appointmentGroupTitle("current", hasWeekPlanItems), items: currentItems });
    }

    return groups;
  }, [appointmentPreviewItems]);

  const allSelectableIds = useMemo(() => {
    if (variant === "week") {
      return weekPreviewItems
        .filter((item) => item.selectable ?? item.eligible ?? false)
        .map((item) => item.appointmentId);
    }
    return appointmentPreviewItems
      .filter((item) => item.selectable)
      .map((item) => item.employeeId);
  }, [appointmentPreviewItems, variant, weekPreviewItems]);
  const selectableIdSet = useMemo(() => new Set(allSelectableIds), [allSelectableIds]);
  const selectedSelectableCount = useMemo(
    () => selectedIds.filter((id) => selectableIdSet.has(id)).length,
    [selectableIdSet, selectedIds],
  );
  const appointmentSelectionSummary = allSelectableIds.length === 0
    ? "Keine auswählbaren Mitarbeiter"
    : selectedSelectableCount === 0
      ? `${allSelectableIds.length} verfügbar, keine ausgewählt`
      : `${selectedSelectableCount} von ${allSelectableIds.length} ausgewählt`;

  const weekOperationCount = variant === "week" ? getWeekOperationCount(props) : 1;
  const activeWeekOperationIndex = variant === "week" ? getActiveWeekOperationIndex(props.steps) : 0;
  const appointmentSelectionSummaryBlock = variant === "appointment" ? (
    <div className="rounded-md border bg-slate-50 p-3" data-testid="appointment-week-selection-summary-panel">
      <div className="text-sm font-medium text-slate-900">Mitarbeiterauswahl</div>
      <div className="text-sm text-slate-600" data-testid="appointment-week-selection-summary">
        {appointmentSelectionSummary}
      </div>
    </div>
  ) : null;
  const selectionControls = (
    <div
      className={
        variant === "appointment"
          ? "flex flex-wrap items-center gap-2 sm:justify-end"
          : "flex flex-wrap items-center gap-2"
      }
      data-testid={variant === "appointment" ? "appointment-week-selection-toolbar" : undefined}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedIds(allSelectableIds)}
        disabled={props.isSubmitting || (variant === "appointment" && allSelectableIds.length === 0)}
        data-testid={variant === "week" ? "button-tour-cascade-select-all" : "button-appointment-week-select-all"}
      >
        Alle wählen
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedIds([])}
        disabled={props.isSubmitting || (variant === "appointment" && selectedIds.length === 0)}
        data-testid={variant === "week" ? "button-tour-cascade-deselect-all" : "button-appointment-week-deselect-all"}
      >
        Alle abwählen
      </Button>
    </div>
  );
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
    : props.confirmLabel ?? "Auswahl übernehmen";
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
      size="xl"
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
                  ? `wird aus der Wochenplanung${props.tourName || props.weekLabel ? ` von ${[props.tourName ? `Tour ${props.tourName}` : null, props.weekLabel].filter(Boolean).join(" / ")}` : ""} entfernt`
                  : `wird in die Wochenplanung${props.tourName || props.weekLabel ? ` von ${[props.tourName ? `Tour ${props.tourName}` : null, props.weekLabel].filter(Boolean).join(" / ")}` : ""} übernommen`}
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

        {props.infoText ? null : appointmentSelectionSummaryBlock}

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
                  <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                    {group.title}
                  </div>
                  <div className="divide-y">
                    {group.items.map((item) => {
                      const checked = selectedIds.includes(item.employeeId);
                      const statusLabel = appointmentStatusLabel(item);
                      const StatusIcon = item.status === "conflict"
                        ? TriangleAlert
                        : item.status === "already_present"
                          ? CheckCircle2
                          : null;
                      return (
                        <label
                          key={item.employeeId}
                          className={`flex items-start gap-3 p-4 ${item.selectable ? "cursor-pointer" : "opacity-70"}`}
                          data-testid={`appointment-week-preview-row-${item.employeeId}`}
                        >
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
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-medium text-slate-900">{item.employeeName}</div>
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
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>}

        {variant === "appointment" && !props.infoText ? selectionControls : null}

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
