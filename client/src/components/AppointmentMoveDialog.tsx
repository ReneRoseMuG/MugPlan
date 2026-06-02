/**
 * Test Scope: (unit tests in tests/unit/ui/appointmentMoveDialog.*.test.tsx)
 *
 * Abgedeckte Regeln:
 * - Same-Tour-Same-Week wird nie geöffnet (Eltern-Logik)
 * - Titelberechnung aus moveContext
 * - Warncontainer erscheint genau dann, wenn Mitarbeiter entfernt werden
 * - Zweistufig, wenn Entfernung + KW-Planung vorhanden
 * - Schritt-Navigation Warn → Select und zurück
 *
 * Ziel:
 * Klar verständlicher Dialog für Terminverschiebungen mit Tour-/Wochenwechsel.
 */

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogBaseFooter,
  MutationPreviewDialogBase,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import type { AppointmentResourcePreviewResponse, AppointmentResourcePreviewItem } from "@/lib/resource-planning";
import { hasCurrentEmployeeRemovals } from "@/lib/resource-planning";

export type AppointmentMoveDialogContext = {
  tourChanged: boolean;
  weekChanged: boolean;
  /** true = Kalender-Move (D&D / Insert); false = Tour-Auswahl im Terminformular */
  isCalendarMove: boolean;
};

interface AppointmentMoveDialogProps {
  open: boolean;
  preview: AppointmentResourcePreviewResponse;
  moveContext: AppointmentMoveDialogContext;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function buildTitle(ctx: AppointmentMoveDialogContext): string {
  if (!ctx.isCalendarMove) return "Tourwechsel";
  if (ctx.tourChanged && ctx.weekChanged) return "Terminverschiebung mit Tour- und Wochenwechsel";
  if (ctx.tourChanged) return "Terminverschiebung mit Tourwechsel";
  return "Terminverschiebung mit Wochenwechsel";
}

function buildRemovalWarningText(ctx: AppointmentMoveDialogContext): string {
  if (!ctx.isCalendarMove) {
    return "Die folgenden Mitarbeiter werden bei der Neuzuweisung der Tour vom Termin entfernt, um Konflikte zu vermeiden:";
  }
  return "Die folgenden Mitarbeiter werden beim Verschieben vom Termin entfernt, um Konflikte in Tour und Woche zu vermeiden:";
}

function buildConfirmLabel(ctx: AppointmentMoveDialogContext): string {
  return ctx.isCalendarMove ? "Termin verschieben" : "Tourwechsel bestätigen";
}

function resolveItemStatusLabel(item: AppointmentResourcePreviewItem): string | null {
  if (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE") return "Wird vom Termin entfernt";
  if (item.status === "conflict" && item.source === "current") return "Überschneidung im Zielzeitraum";
  if (item.status === "conflict") return "Überschneidung mit bestehendem Termin";
  if (item.status === "already_present") return "Bereits im Termin";
  if (item.status === "current_only") return "Bleibt nur durch bestehende Terminzuweisung erhalten";
  if (item.status === "will_add" && item.source === "available") return "Konfliktfrei zuweisbar";
  if (item.status === "will_add") return "Kann aus der Wochenplanung übernommen werden";
  return null;
}

export function AppointmentMoveDialog({
  open,
  preview,
  moveContext,
  selectedIds,
  onSelectedIdsChange,
  isSubmitting,
  onConfirm,
  onClose,
}: AppointmentMoveDialogProps) {
  const [step, setStep] = useState<"warn" | "select">("warn");

  useEffect(() => {
    if (open) setStep("warn");
  }, [open]);

  const weekPlanItems = useMemo(
    () => preview.items.filter((item) => (item.source ?? "week_plan") === "week_plan"),
    [preview.items],
  );
  const availableItems = useMemo(
    () => preview.items.filter((item) => item.source === "available"),
    [preview.items],
  );
  const removedItems = useMemo(
    () => preview.items.filter(
      (item) => item.source === "current"
        && (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE"),
    ),
    [preview.items],
  );

  const hasRemovals = hasCurrentEmployeeRemovals(preview);
  const hasSelectableItems = useMemo(
    () => [...weekPlanItems, ...availableItems].some((item) => item.selectable),
    [weekPlanItems, availableItems],
  );
  const isTwoStep = hasRemovals && (preview.hasWeekPlan || hasSelectableItems);

  const allSelectableIds = useMemo(
    () => [...weekPlanItems, ...availableItems]
      .filter((item) => item.selectable)
      .map((item) => item.employeeId),
    [availableItems, weekPlanItems],
  );

  const showWarnContent = isTwoStep ? step === "warn" : hasRemovals;
  const showSelectContent = isTwoStep ? step === "select" : !hasRemovals;

  const steps: DialogBaseStep[] | undefined = isTwoStep
    ? [
        { id: "warn", state: step === "warn" ? "active" : "complete", title: "Mitarbeiter" },
        { id: "select", state: step === "select" ? "active" : "pending", title: "Wochenplanung" },
      ]
    : undefined;

  const selectionControls = hasSelectableItems ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectedIdsChange(allSelectableIds)}
        disabled={isSubmitting}
        data-testid="button-appointment-move-select-all"
      >
        Alle wählen
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectedIdsChange([])}
        disabled={isSubmitting}
        data-testid="button-appointment-move-deselect-all"
      >
        Alle abwählen
      </Button>
    </div>
  ) : null;

  const selectionGroups: Array<{ key: string; title: string; items: AppointmentResourcePreviewItem[] }> = [];
  if (weekPlanItems.length > 0) {
    selectionGroups.push({ key: "week_plan", title: "Tour-KW-Mitarbeiter", items: weekPlanItems });
  }
  if (availableItems.length > 0) {
    selectionGroups.push({
      key: "available",
      title: weekPlanItems.length > 0 ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter",
      items: availableItems,
    });
  }

  const footer = (
    <DialogBaseFooter
      backAction={isTwoStep && step === "select" ? {
        label: "Zurück",
        onClick: () => setStep("warn"),
        disabled: isSubmitting,
      } : undefined}
      secondaryAction={{
        label: "Abbrechen",
        onClick: onClose,
        disabled: isSubmitting,
      }}
      primaryAction={
        isTwoStep && step === "warn"
          ? { label: "Weiter", onClick: () => setStep("select") }
          : {
              label: buildConfirmLabel(moveContext),
              pendingLabel: "Speichern...",
              onClick: onConfirm,
              isPending: isSubmitting,
              testId: "button-appointment-move-confirm",
            }
      }
    />
  );

  return (
    <MutationPreviewDialogBase
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
      closeDisabled={isSubmitting}
      title={buildTitle(moveContext)}
      size="xl"
      steps={steps}
      footer={footer}
      testId="dialog-appointment-move"
    >
      <div className="space-y-4" data-testid="appointment-move-dialog-content">
        {showWarnContent && removedItems.length > 0 ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4"
            data-testid="appointment-move-removal-warning"
          >
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Achtung: Mitarbeiter werden abgezogen
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {buildRemovalWarningText(moveContext)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" data-testid="appointment-move-removed-employees">
                  {removedItems.map((item) => (
                    <EmployeeInfoBadge
                      key={item.employeeId}
                      id={item.employeeId}
                      fullName={item.employeeName}
                      size="sm"
                      showPreview={false}
                      testId={`badge-appointment-move-removed-${item.employeeId}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showSelectContent ? (
          <>
            <div
              className="max-h-[60vh] overflow-auto rounded-md border"
              data-testid="appointment-move-selection-list"
            >
              {selectionGroups.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">
                  Keine Mitarbeiter aus der Wochenplanung verfügbar.
                </div>
              ) : (
                <div>
                  {selectionGroups.map((group) => (
                    <section
                      key={group.key}
                      className="border-b last:border-b-0"
                      data-testid={`appointment-move-preview-group-${group.key}`}
                    >
                      <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                        {group.title}
                      </div>
                      <div className="divide-y">
                        {group.items.map((item) => {
                          const checked = selectedIds.includes(item.employeeId);
                          const statusLabel = resolveItemStatusLabel(item);
                          const StatusIcon = item.status === "conflict"
                            ? TriangleAlert
                            : item.status === "already_present"
                              ? CheckCircle2
                              : null;
                          return (
                            <label
                              key={item.employeeId}
                              className={`flex items-start gap-3 p-4 ${item.selectable ? "cursor-pointer" : "opacity-70"}`}
                              data-testid={`appointment-move-preview-row-${item.employeeId}`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!item.selectable || isSubmitting}
                                onCheckedChange={(nextChecked) => {
                                  if (!item.selectable) return;
                                  if (nextChecked) {
                                    onSelectedIdsChange([...selectedIds, item.employeeId]);
                                    return;
                                  }
                                  onSelectedIdsChange(selectedIds.filter((id) => id !== item.employeeId));
                                }}
                                data-testid={`appointment-move-preview-checkbox-${item.employeeId}`}
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="font-medium text-slate-900">{item.employeeName}</div>
                                {statusLabel ? (
                                  <div
                                    className={item.status === "conflict"
                                      ? "flex items-center gap-1 text-sm text-red-600"
                                      : "flex items-center gap-1 text-sm text-slate-600"}
                                    data-testid={`appointment-move-preview-status-${item.employeeId}`}
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
            {selectionControls}
          </>
        ) : null}
      </div>
    </MutationPreviewDialogBase>
  );
}
