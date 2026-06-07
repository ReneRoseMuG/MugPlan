/**
 * Test Scope: (unit tests in tests/unit/ui/appointmentMoveDialog.*.test.tsx)
 *
 * Abgedeckte Regeln:
 * - Same-Tour-Same-Week wird nie geöffnet (Eltern-Logik)
 * - Titelberechnung: Kalender-Move → "Termin verschieben", Formular → "Tourwechsel"
 * - Warncontainer erscheint genau dann, wenn Mitarbeiter entfernt werden
 * - Schritte: Mitarbeiter (Warn) → Wochenplanung (Select) → Notizen → Keine Mitarbeiter, nur wenn jeweils relevant
 * - Schritt-Navigation vorwärts und zurück
 * - Ergibt der Move 0 Mitarbeiter, erscheint abschließend der Schritt "Keine Mitarbeiter" mit "Trotzdem verschieben"
 *
 * Ziel:
 * Klar verständlicher Dialog für Terminverschiebungen und Tourwechsel.
 */

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  MutationPreviewDialogBase,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { NotesSection } from "@/components/NotesSection";
import type { AppointmentResourcePreviewResponse, AppointmentResourcePreviewItem } from "@/lib/resource-planning";
import {
  buildEmployeeIdsFromResourcePreviewSelection,
  hasCurrentEmployeeRemovals,
  isBlockedWeekPlanOverlap,
  isCurrentEmployeeOverlapRemoval,
} from "@/lib/resource-planning";
import type { AppointmentSaveReviewNoteReview } from "@/components/AppointmentSaveReviewDialog";

export type AppointmentMoveDialogContext = {
  tourChanged: boolean;
  weekChanged: boolean;
  /** true = Kalender-Move (D&D / Insert); false = Tour-Auswahl im Terminformular */
  isCalendarMove: boolean;
};

type MoveStep = "warn" | "select" | "notes" | "employees";
type SelectionGroupKey = "week_plan_conflict" | "week_plan" | "available";
type SelectionGroup = {
  key: SelectionGroupKey;
  title: string | null;
  items: AppointmentResourcePreviewItem[];
};

const stepTitles: Record<MoveStep, string> = {
  warn: "Mitarbeiter",
  select: "Wochenplanung",
  notes: "Notizen",
  employees: "Keine Mitarbeiter",
};

interface AppointmentMoveDialogProps {
  open: boolean;
  preview: AppointmentResourcePreviewResponse | null;
  baseEmployeeIds: number[];
  moveContext: AppointmentMoveDialogContext;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  noteReview?: AppointmentSaveReviewNoteReview | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function buildTitle(ctx: AppointmentMoveDialogContext): string {
  if (!ctx.isCalendarMove) return "Tourwechsel";
  return "Termin verschieben";
}

function buildRemovalWarningText(): string {
  return "Die folgenden Mitarbeiter werden vom Termin entfernt, um Konflikte zu vermeiden:";
}

function buildConfirmLabel(): string {
  return "Bestätigen";
}

function resolveItemStatusLabel(item: AppointmentResourcePreviewItem): string | null {
  if (isCurrentEmployeeOverlapRemoval(item)) return "Wird beim Speichern vom Termin entfernt.";
  if (isBlockedWeekPlanOverlap(item)) return "Am Zieltermin besteht bereits eine ganztägige Planung.";
  if (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE") return "Wird vom Termin entfernt";
  if (item.status === "conflict" && item.source === "current") return "Überschneidung im Zielzeitraum";
  if (item.status === "conflict") return "Überschneidung mit bestehendem Termin";
  if (item.status === "already_present") return "Bereits im Termin";
  if (item.status === "current_only") return "Bleibt nur durch bestehende Terminzuweisung erhalten";
  if (item.status === "will_add" && item.source === "available") return "Konfliktfrei zuweisbar";
  if (item.status === "will_add") return "Kann dem Termin zugewiesen werden.";
  return null;
}

function selectionGroupTitle(groupKey: SelectionGroupKey, hasWeekPlanItems: boolean): string | null {
  if (groupKey === "week_plan_conflict") return null;
  if (groupKey === "week_plan") return null;
  return hasWeekPlanItems ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter";
}

function selectionInfoMessage(items: AppointmentResourcePreviewItem[]): { title: string; tone: "info" | "warning" } | null {
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

function formatReviewDate(value: string | null): string {
  if (!value) return "nicht gesetzt";
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd.MM.yy");
}

function formatReviewDateTime(dateValue: string | null, timeValue: string | null): string {
  const dateLabel = formatReviewDate(dateValue);
  const timeLabel = timeValue?.trim() ? `, ${timeValue.trim().slice(0, 5)} Uhr` : "";
  return `${dateLabel}${timeLabel}`;
}

function formatReviewRange(startDate: string, endDate: string | null, startTime: string | null): string {
  const startLabel = formatReviewDateTime(startDate, startTime);
  if (!endDate || endDate === startDate) return startLabel;
  return `${startLabel} bis ${formatReviewDate(endDate)}`;
}

export function AppointmentMoveDialog({
  open,
  preview,
  baseEmployeeIds,
  moveContext,
  selectedIds,
  onSelectedIdsChange,
  noteReview = null,
  isSubmitting,
  onConfirm,
  onClose,
}: AppointmentMoveDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const items = preview?.items ?? [];

  const weekPlanItems = useMemo(
    () => items.filter((item) => (item.source ?? "week_plan") === "week_plan"),
    [items],
  );
  const availableItems = useMemo(
    () => items.filter((item) => item.source === "available"),
    [items],
  );
  const removedItems = useMemo(
    () => items.filter(
      (item) => item.source === "current"
        && (item.status === "will_remove" || item.conflictReason === "WILL_REMOVE"),
    ),
    [items],
  );

  const hasRemovals = preview !== null && hasCurrentEmployeeRemovals(preview);
  const hasWeekPlanStep = weekPlanItems.length > 0 || availableItems.length > 0;
  const hasNotesStep = Boolean(noteReview && noteReview.notes.length > 0);
  const hasBlockedWeekPlanItems = weekPlanItems.some(isBlockedWeekPlanOverlap);
  const selectStepInfo = selectionInfoMessage(items);

  const resolvedEmployeeIds = useMemo(
    () => preview
      ? buildEmployeeIdsFromResourcePreviewSelection(preview, selectedIds, "replace")
      : baseEmployeeIds,
    [preview, baseEmployeeIds, selectedIds],
  );
  const hasEmployeesStep = resolvedEmployeeIds.length === 0;

  const stepIds = useMemo<MoveStep[]>(() => {
    const ids: MoveStep[] = [];
    if (hasRemovals) ids.push("warn");
    if (hasWeekPlanStep) ids.push("select");
    if (hasNotesStep) ids.push("notes");
    if (hasEmployeesStep) ids.push("employees");
    return ids;
  }, [hasRemovals, hasWeekPlanStep, hasNotesStep, hasEmployeesStep]);

  const currentStep = stepIds[stepIndex] ?? "warn";
  const isLastStep = stepIndex >= stepIds.length - 1;

  const selectionGroups: SelectionGroup[] = [];
  const blockedWeekPlanItems = weekPlanItems.filter(isBlockedWeekPlanOverlap);
  const selectableWeekPlanItems = weekPlanItems.filter((item) => !isBlockedWeekPlanOverlap(item));
  const hasWeekPlanItems = weekPlanItems.length > 0;
  if (blockedWeekPlanItems.length > 0) {
    selectionGroups.push({
      key: "week_plan_conflict",
      title: selectionGroupTitle("week_plan_conflict", hasWeekPlanItems),
      items: blockedWeekPlanItems,
    });
  }
  if (selectableWeekPlanItems.length > 0) {
    selectionGroups.push({
      key: "week_plan",
      title: selectionGroupTitle("week_plan", hasWeekPlanItems),
      items: selectableWeekPlanItems,
    });
  }
  if (availableItems.length > 0) {
    selectionGroups.push({
      key: "available",
      title: selectionGroupTitle("available", hasWeekPlanItems),
      items: availableItems,
    });
  }

  const steps: DialogBaseStep[] | undefined = stepIds.length > 1
    ? stepIds.map((id, index) => ({
        id,
        title: id === "select" && hasBlockedWeekPlanItems ? "Konfliktprüfung" : stepTitles[id],
        state: index < stepIndex ? "complete" : index === stepIndex ? "active" : "pending",
      }))
    : undefined;

  const footer = (
    <DialogBaseFooter
      backAction={stepIndex > 0 ? {
        label: "Zurück",
        onClick: () => setStepIndex((i) => Math.max(i - 1, 0)),
        disabled: isSubmitting,
      } : undefined}
      secondaryAction={{
        label: "Abbrechen",
        onClick: onClose,
        disabled: isSubmitting,
      }}
      primaryAction={
        !isLastStep
          ? { label: "Weiter", onClick: () => setStepIndex((i) => i + 1) }
          : {
              label: currentStep === "employees" ? "Trotzdem verschieben" : buildConfirmLabel(),
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

        {currentStep === "warn" && removedItems.length > 0 ? (
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
                    {buildRemovalWarningText()}
                  </p>
                </div>
                <div className="flex flex-col gap-2" data-testid="appointment-move-removed-employees">
                  {removedItems.map((item) => (
                    <EmployeeInfoBadge
                      key={item.employeeId}
                      id={item.employeeId}
                      fullName={item.employeeName}
                      size="sm"
                      fullWidth
                      renderMode="detail"
                      showPreview={false}
                      testId={`badge-appointment-move-removed-${item.employeeId}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === "select" ? (
          <>
            {selectStepInfo ? (
              <DialogBaseInlineMessage
                tone={selectStepInfo.tone}
                title={selectStepInfo.title}
              />
            ) : null}
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
                      {group.title ? (
                        <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                          {group.title}
                        </div>
                      ) : null}
                      <div className="divide-y">
                        {group.items.map((item) => {
                          const checked = selectedIds.includes(item.employeeId);
                          const statusLabel = resolveItemStatusLabel(item);
                          const StatusIcon = item.status === "conflict"
                            ? TriangleAlert
                            : item.status === "already_present"
                              ? CheckCircle2
                              : null;
                          const showCheckbox = !isBlockedWeekPlanOverlap(item);
                          const rowClassName = `flex items-start gap-3 p-4 ${showCheckbox && item.selectable ? "cursor-pointer" : "opacity-70"}`;
                          const rowContent = (
                            <>
                              {showCheckbox ? (
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
                              ) : null}
                              <div className="min-w-0 flex-1 space-y-1">
                                <EmployeeInfoBadge
                                  id={item.employeeId}
                                  fullName={item.employeeName}
                                  size="sm"
                                  fullWidth
                                  renderMode="detail"
                                  showPreview={false}
                                  testId={`badge-appointment-move-preview-${item.employeeId}`}
                                />
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
                            </>
                          );
                          return showCheckbox ? (
                            <label
                              key={item.employeeId}
                              className={rowClassName}
                              data-testid={`appointment-move-preview-row-${item.employeeId}`}
                            >
                              {rowContent}
                            </label>
                          ) : (
                            <div
                              key={item.employeeId}
                              className={rowClassName}
                              data-testid={`appointment-move-preview-row-${item.employeeId}`}
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
            </div>
          </>
        ) : null}

        {currentStep === "employees" ? (
          <section data-testid="appointment-move-step-no-employees">
            <DialogBaseInlineMessage
              tone="warning"
              title="Der Termin hat keine geplanten Mitarbeiter."
              description="Soll er trotzdem verschoben werden?"
            />
          </section>
        ) : null}

        {currentStep === "notes" && noteReview ? (
          <section className="space-y-4" data-testid="appointment-move-step-notes">
            <DialogBaseInlineMessage
              tone="warning"
              title="Terminnotizen prüfen"
              description="Datum, Uhrzeit oder Tour wurden geändert. Terminnotizen können bezugsabhängige Informationen enthalten."
            />
            <dl className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Bisher</dt>
                <dd className="font-semibold" data-testid="appointment-move-notes-previous-date">
                  {formatReviewRange(noteReview.previousStartDate, noteReview.previousEndDate, noteReview.previousStartTime)}
                </dd>
                {noteReview.previousTourName ? (
                  <dd className="text-xs text-muted-foreground" data-testid="appointment-move-notes-previous-tour">
                    Tour: {noteReview.previousTourName}
                  </dd>
                ) : null}
              </div>
              <div>
                <dt className="text-muted-foreground">Neu</dt>
                <dd className="font-semibold" data-testid="appointment-move-notes-next-date">
                  {formatReviewRange(noteReview.nextStartDate, noteReview.nextEndDate, noteReview.nextStartTime)}
                </dd>
                {noteReview.nextTourName ? (
                  <dd className="text-xs text-muted-foreground" data-testid="appointment-move-notes-next-tour">
                    Tour: {noteReview.nextTourName}
                  </dd>
                ) : null}
              </div>
            </dl>
            <NotesSection
              notes={noteReview.notes}
              onAdd={() => undefined}
              title="Betroffene Terminnotizen"
              readOnly
              maxVisibleNotes={2}
            />
          </section>
        ) : null}

      </div>
    </MutationPreviewDialogBase>
  );
}
