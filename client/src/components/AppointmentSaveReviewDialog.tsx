import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Save, TriangleAlert } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { NotesSection } from "@/components/NotesSection";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  DialogBaseShell,
  DialogBaseStepper,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import {
  buildEmployeeIdsFromResourcePreviewSelection,
  isBlockedWeekPlanOverlap,
  isCurrentEmployeeOverlapRemoval,
  type AppointmentResourcePreviewResponse,
  type AppointmentResourceResolutionMode,
} from "@/lib/resource-planning";
import type { Note } from "@shared/schema";

type AppointmentSaveReviewStepId = "resources" | "notes";

export type AppointmentSaveReviewResult = {
  employeeIds: number[];
  resourceResolutionKey: string | null;
  notesReviewed: boolean;
};

export type AppointmentSaveReviewResourceRequest = {
  preview: AppointmentResourcePreviewResponse;
  resolutionKey: string;
  selectedIds: number[];
  resolutionMode: AppointmentResourceResolutionMode;
  showResolutionMode?: boolean;
  resolutionNotice?: string | null;
};

export type AppointmentSaveReviewNoteReview = {
  previousStartDate: string;
  previousEndDate: string | null;
  previousStartTime: string | null;
  previousTourName?: string | null;
  nextStartDate: string;
  nextEndDate: string | null;
  nextStartTime: string | null;
  nextTourName?: string | null;
  notes: Note[];
};

type AppointmentSaveReviewDialogProps = {
  open: boolean;
  currentEmployeeIds: number[];
  resourceRequest?: AppointmentSaveReviewResourceRequest | null;
  noteReview?: AppointmentSaveReviewNoteReview | null;
  isBusy?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: (result: AppointmentSaveReviewResult) => void;
};

type ResourceReviewKind = "current_conflict" | "week_plan_conflict" | "target_week_plan" | "default";
type ResourceGroupKey = "week_plan_conflict" | "week_plan" | "available" | "current_conflict" | "current";
type ResourceGroup = {
  key: ResourceGroupKey;
  title: string | null;
  items: AppointmentResourcePreviewResponse["items"];
};

const stepTitles: Record<AppointmentSaveReviewStepId, string> = {
  resources: "Mitarbeiter",
  notes: "Notizen",
};

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

function resourceStatusLabel(item: AppointmentResourcePreviewResponse["items"][number]): string | null {
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

function groupTitle(groupKey: ResourceGroupKey, hasWeekPlanItems: boolean): string | null {
  if (groupKey === "week_plan_conflict") return null;
  if (groupKey === "week_plan") return null;
  if (groupKey === "current_conflict") return "Zwingend zu entfernen";
  if (groupKey === "available") {
    return hasWeekPlanItems ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter";
  }
  return "Bereits direkt am Termin";
}

function getResourceReviewKind(items: AppointmentResourcePreviewResponse["items"]): ResourceReviewKind {
  if (items.some(isCurrentEmployeeOverlapRemoval)) return "current_conflict";
  if (items.some(isBlockedWeekPlanOverlap)) return "week_plan_conflict";
  if (items.some((item) => (item.source ?? "week_plan") === "week_plan" && item.status === "will_add")) {
    return "target_week_plan";
  }
  return "default";
}

function resourceInfoMessage(
  kind: ResourceReviewKind,
): { title: string; description?: string; tone: "info" | "warning" } {
  if (kind === "current_conflict") {
    return { title: "Mitarbeiter wegen doppelter Planung nicht verfügbar.", tone: "warning" };
  }
  if (kind === "week_plan_conflict") {
    return {
      title: "Mitarbeiter aus der Wochenplanung sind am Zieltermin wegen doppelter Planung nicht verfügbar.",
      tone: "warning",
    };
  }
  if (kind === "target_week_plan") {
    return {
      title: "Mitarbeiter aus der Wochenplanung sind am Zieltermin verfügbar.",
      tone: "info",
    };
  }
  return {
    title: "Wochenplanung vor dem Speichern prüfen",
    description: "Prüfen Sie, welche Mitarbeiter übernommen oder wegen Konflikten entfernt werden sollen.",
    tone: "info",
  };
}

export function AppointmentSaveReviewDialog({
  open,
  currentEmployeeIds,
  resourceRequest = null,
  noteReview = null,
  isBusy = false,
  onOpenChange,
  onCancel,
  onConfirm,
}: AppointmentSaveReviewDialogProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>(resourceRequest?.selectedIds ?? []);
  const [resolutionMode, setResolutionMode] = useState<AppointmentResourceResolutionMode>(resourceRequest?.resolutionMode ?? "additive");

  useEffect(() => {
    if (!open) return;
    setActiveStepIndex(0);
    setSelectedIds(resourceRequest?.selectedIds ?? []);
    setResolutionMode(resourceRequest?.resolutionMode ?? "additive");
  }, [noteReview, open, resourceRequest]);

  const resolvedEmployeeIds = useMemo(() => {
    if (!resourceRequest) return currentEmployeeIds;
    return buildEmployeeIdsFromResourcePreviewSelection(resourceRequest.preview, selectedIds, resolutionMode);
  }, [currentEmployeeIds, resolutionMode, resourceRequest, selectedIds]);

  const stepIds = useMemo<AppointmentSaveReviewStepId[]>(() => {
    const ids: AppointmentSaveReviewStepId[] = [];
    if (resourceRequest) ids.push("resources");
    if (noteReview && noteReview.notes.length > 0) ids.push("notes");
    return ids;
  }, [noteReview, resourceRequest]);

  useEffect(() => {
    if (activeStepIndex >= stepIds.length) {
      setActiveStepIndex(Math.max(stepIds.length - 1, 0));
    }
  }, [activeStepIndex, stepIds.length]);

  const activeStepId = stepIds[activeStepIndex];
  const isLastStep = activeStepIndex >= stepIds.length - 1;
  const resourceReviewKind = getResourceReviewKind(resourceRequest?.preview.items ?? []);
  const resourceMessage = resourceInfoMessage(resourceReviewKind);
  const steps = stepIds.map<DialogBaseStep>((stepId, index) => ({
    id: stepId,
    title: stepId === "resources" && (resourceReviewKind === "current_conflict" || resourceReviewKind === "week_plan_conflict")
      ? "Konfliktprüfung"
      : stepTitles[stepId],
    state: index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "pending",
  }));

  const groupedItems = useMemo(() => {
    const items = resourceRequest?.preview.items ?? [];
    const weekPlanConflictItems = items.filter(isBlockedWeekPlanOverlap);
    const weekPlanItems = items.filter((item) =>
      (item.source ?? "week_plan") === "week_plan" && !isBlockedWeekPlanOverlap(item),
    );
    const availableItems = items.filter((item) => item.source === "available");
    const currentConflictItems = items.filter(isCurrentEmployeeOverlapRemoval);
    const currentItems = items.filter((item) => item.source === "current" && !isCurrentEmployeeOverlapRemoval(item));
    const hasWeekPlanItems = weekPlanConflictItems.length > 0 || weekPlanItems.length > 0;
    return [
      { key: "week_plan_conflict" as const, title: groupTitle("week_plan_conflict", hasWeekPlanItems), items: weekPlanConflictItems },
      { key: "week_plan" as const, title: groupTitle("week_plan", hasWeekPlanItems), items: weekPlanItems },
      { key: "available" as const, title: groupTitle("available", hasWeekPlanItems), items: availableItems },
      { key: "current_conflict" as const, title: groupTitle("current_conflict", hasWeekPlanItems), items: currentConflictItems },
      { key: "current" as const, title: groupTitle("current", hasWeekPlanItems), items: currentItems },
    ].filter((group): group is ResourceGroup => group.items.length > 0);
  }, [resourceRequest]);

  const handlePrimaryAction = () => {
    if (!isLastStep) {
      setActiveStepIndex((current) => current + 1);
      return;
    }
    onConfirm({
      employeeIds: resolvedEmployeeIds,
      resourceResolutionKey: resourceRequest?.resolutionKey ?? null,
      notesReviewed: Boolean(noteReview),
    });
  };

  return (
    <DialogBaseShell
      closeDisabled={isBusy}
      footer={(
        <DialogBaseFooter
          backAction={activeStepIndex > 0 ? {
            disabled: isBusy,
            label: "Zurück",
            onClick: () => setActiveStepIndex((current) => Math.max(current - 1, 0)),
            testId: "button-appointment-save-review-back",
          } : undefined}
          secondaryAction={{
            disabled: isBusy,
            label: "Abbrechen",
            onClick: onCancel,
            testId: "button-appointment-save-review-cancel",
            variant: "outline",
          }}
          primaryAction={{
            disabled: isBusy,
            isPending: isBusy,
            label: stepIds.length === 0 ? "Trotzdem speichern" : isLastStep ? "Termin speichern" : "Weiter",
            onClick: handlePrimaryAction,
            pendingLabel: "Speichern...",
            testId: isLastStep ? "button-appointment-save-review-confirm" : "button-appointment-save-review-next",
          }}
        />
      )}
      icon={<Save />}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
        onOpenChange(nextOpen);
      }}
      open={open}
      size="xl"
      testId="dialog-appointment-save-review"
      title="Termin speichern"
    >
      <div className="space-y-5">
        {steps.length >= 1 ? <DialogBaseStepper steps={steps} /> : null}

        {activeStepId === "resources" && resourceRequest ? (
          <section className="space-y-4" data-testid="appointment-save-review-step-resources">
            <DialogBaseInlineMessage
              tone={resourceMessage.tone}
              title={resourceMessage.title}
              description={resourceMessage.description}
            />
            {resolvedEmployeeIds.length === 0 ? (
              <DialogBaseInlineMessage
                tone="warning"
                title="Der Termin wird ohne Mitarbeiter gespeichert."
              />
            ) : null}
            {resourceRequest.showResolutionMode ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-3" data-testid="appointment-week-resolution-mode">
              <span className="text-sm font-medium text-slate-700">Übernahme:</span>
              <Button
                type="button"
                variant={resolutionMode === "additive" ? "default" : "outline"}
                size="sm"
                onClick={() => setResolutionMode("additive")}
                disabled={isBusy}
                data-testid="button-appointment-week-mode-additive"
              >
                Additiv
              </Button>
              <Button
                type="button"
                variant={resolutionMode === "replace" ? "default" : "outline"}
                size="sm"
                onClick={() => setResolutionMode("replace")}
                disabled={isBusy}
                data-testid="button-appointment-week-mode-replace"
              >
                Ersetzen
              </Button>
            </div>
            ) : null}
            {!resourceRequest.showResolutionMode && resourceRequest.resolutionNotice ? (
              <DialogBaseInlineMessage
                tone="info"
                title="Mitarbeiter werden ersetzt"
                description={resourceRequest.resolutionNotice}
              />
            ) : null}
            <div className="max-h-[60vh] overflow-auto rounded-md border" data-testid="list-appointment-save-review-preview">
              {groupedItems.map((group) => (
                <section key={group.key} className="border-b last:border-b-0" data-testid={`appointment-week-preview-group-${group.key}`}>
                  {group.title ? (
                    <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                      {group.title}
                    </div>
                  ) : null}
                  <div className="divide-y">
                    {group.items.map((item) => {
                      const checked = selectedIds.includes(item.employeeId);
                      const statusLabel = resourceStatusLabel(item);
                      const showCheckbox = !isCurrentEmployeeOverlapRemoval(item) && !isBlockedWeekPlanOverlap(item);
                      const rowClassName = `flex items-start gap-3 p-4 ${showCheckbox && item.selectable ? "cursor-pointer" : "opacity-70"}`;
                      const rowContent = (
                        <>
                          {showCheckbox ? (
                            <Checkbox
                              checked={checked}
                              disabled={!item.selectable || isBusy}
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
                              testId={`badge-appointment-save-review-employee-${item.employeeId}`}
                            />
                            {statusLabel ? (
                              <div
                                className={item.status === "conflict" ? "flex items-center gap-1 text-sm text-red-600" : "flex items-center gap-1 text-sm text-slate-600"}
                                data-testid={`appointment-week-preview-status-${item.employeeId}`}
                              >
                                {item.status === "conflict" ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
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
          </section>
        ) : null}

        {stepIds.length === 0 ? (
          <section className="space-y-4" data-testid="appointment-save-review-step-no-employees">
            <DialogBaseInlineMessage
              tone="warning"
              title="Termin hat keine Mitarbeiter"
              description="Der Termin hat keine geplanten Mitarbeiter. Soll er trotzdem gespeichert werden?"
            />
          </section>
        ) : null}

        {activeStepId === "notes" && noteReview ? (
          <section className="space-y-4" data-testid="appointment-save-review-step-notes">
            <DialogBaseInlineMessage
              tone="warning"
              title="Terminnotizen prüfen"
              description="Datum, Uhrzeit oder Tour wurden geändert. Terminnotizen können bezugsabhängige Informationen enthalten."
            />
            <dl className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Bisher</dt>
                <dd className="font-semibold" data-testid="appointment-save-review-notes-previous-date">
                  {formatReviewRange(noteReview.previousStartDate, noteReview.previousEndDate, noteReview.previousStartTime)}
                </dd>
                {noteReview.previousTourName ? (
                  <dd className="text-xs text-muted-foreground" data-testid="appointment-save-review-notes-previous-tour">
                    Tour: {noteReview.previousTourName}
                  </dd>
                ) : null}
              </div>
              <div>
                <dt className="text-muted-foreground">Neu</dt>
                <dd className="font-semibold" data-testid="appointment-save-review-notes-next-date">
                  {formatReviewRange(noteReview.nextStartDate, noteReview.nextEndDate, noteReview.nextStartTime)}
                </dd>
                {noteReview.nextTourName ? (
                  <dd className="text-xs text-muted-foreground" data-testid="appointment-save-review-notes-next-tour">
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
    </DialogBaseShell>
  );
}
