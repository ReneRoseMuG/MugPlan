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
  status: "will_add" | "conflict" | "already_present" | "current_only";
  selectable: boolean;
  conflictReason: string | null;
  source?: "week_plan" | "available" | "current";
};

type ResourcePlanningDialogVariant = "week" | "appointment";

interface ResourcePlanningDialogProps {
  open: boolean;
  variant?: ResourcePlanningDialogVariant;
  mode?: "add" | "remove";
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

function buildWeekTitle(props: ResourcePlanningDialogProps): string {
  if (props.title) return props.title;
  if (props.mode === "remove") return "Mitarbeiter von Tour-Terminen abziehen";
  return "Mitarbeiter zu Tour-Terminen hinzufügen";
}

function buildWeekDescription(props: ResourcePlanningDialogProps): string {
  if (props.description) return props.description;
  if (props.mode === "remove") {
    return props.employeeName
      ? `Wählen Sie die Termine aus, von denen ${props.employeeName} abgezogen werden soll.`
      : "Wählen Sie die Termine aus, von denen der Mitarbeiter abgezogen werden soll.";
  }
  return props.employeeName
    ? `Wählen Sie die Termine aus, für die ${props.employeeName} geplant werden soll.`
    : "Wählen Sie die Termine aus, für die der Mitarbeiter geplant werden soll.";
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

function buildRangeLabel(items: WeekResourcePreviewItem[]): string | null {
  if (items.length === 0) return null;
  let minDate = items[0].startDate;
  let maxDate = items[0].endDate ?? items[0].startDate;

  for (const item of items) {
    const endDate = item.endDate ?? item.startDate;
    if (item.startDate < minDate) minDate = item.startDate;
    if (endDate > maxDate) maxDate = endDate;
  }

  return `Termine (${items.length}) - Termine im Zeitraum von ${formatShortDate(minDate)} bis ${formatShortDate(maxDate)}`;
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

  const weekRangeLabel = variant === "week" ? buildRangeLabel(weekPreviewItems) : null;
  const footer = (
    <DialogBaseFooter
      secondaryAction={{
        label: "Abbrechen",
        onClick: props.onClose,
        disabled: props.isSubmitting,
      }}
      primaryAction={{
        label: props.confirmLabel ?? "Bestätigen",
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
      description={variant === "week" ? buildWeekDescription(props) : props.description}
      size="xl"
      steps={props.steps}
      summary={props.summary}
      error={props.error}
      footer={footer}
      testId={props.testId ?? "dialog-tour-employee-cascade"}
    >
      <div className="space-y-4" data-testid="dialog-resource-planning">
        {props.executionMessage ? (
          <DialogBaseInlineMessage
            tone="info"
            title="Ausführungsstand"
            description={props.executionMessage}
          />
        ) : null}

        {variant === "week" && (props.weekLabel || weekRangeLabel) ? (
          <p className="text-sm text-slate-500" data-testid="text-tour-employee-cascade-range">
            {[props.weekLabel, weekRangeLabel].filter(Boolean).join(" - ")}
          </p>
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(allSelectableIds)}
            disabled={props.isSubmitting}
            data-testid={variant === "week" ? "button-tour-cascade-select-all" : "button-appointment-week-select-all"}
          >
            Alle wählen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={props.isSubmitting}
            data-testid={variant === "week" ? "button-tour-cascade-deselect-all" : "button-appointment-week-deselect-all"}
          >
            Alle abwählen
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-md border" data-testid="list-tour-employee-cascade-preview">
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
        </div>

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
