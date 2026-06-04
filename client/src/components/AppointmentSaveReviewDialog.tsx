import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Save, TriangleAlert } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { NotesSection } from "@/components/NotesSection";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  DialogBaseShell,
  DialogBaseStepper,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import {
  buildEmployeeIdsFromResourcePreviewSelection,
  type AppointmentResourcePreviewResponse,
  type AppointmentResourceResolutionMode,
} from "@/lib/resource-planning";
import type { Note } from "@shared/schema";

type AppointmentSaveReviewStepId = "resources" | "notes" | "employees";

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

const stepTitles: Record<AppointmentSaveReviewStepId, string> = {
  resources: "Mitarbeiter",
  notes: "Notizen",
  employees: "Ohne Mitarbeiter",
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

function groupTitle(source: AppointmentResourcePreviewResponse["items"][number]["source"], hasWeekPlanItems: boolean): string {
  if (source === "available") {
    return hasWeekPlanItems ? "Weitere konfliktfreie Mitarbeiter" : "Konfliktfrei zuweisbare Mitarbeiter";
  }
  if (source === "current") return "Bereits direkt am Termin";
  return "Tour-KW-Mitarbeiter";
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
    if (resolvedEmployeeIds.length === 0) ids.push("employees");
    return ids;
  }, [noteReview, resolvedEmployeeIds.length, resourceRequest]);

  useEffect(() => {
    if (activeStepIndex >= stepIds.length) {
      setActiveStepIndex(Math.max(stepIds.length - 1, 0));
    }
  }, [activeStepIndex, stepIds.length]);

  const activeStepId = stepIds[activeStepIndex];
  const isLastStep = activeStepIndex >= stepIds.length - 1;
  const dialogTitle = activeStepId === "employees" ? "Termin hat keine Mitarbeiter" : "Termin speichern";
  const dialogSize = stepIds.length === 1 && activeStepId === "employees" ? "md" : "xl";
  const steps = stepIds.map<DialogBaseStep>((stepId, index) => ({
    id: stepId,
    title: stepTitles[stepId],
    state: index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "pending",
  }));

  const groupedItems = useMemo(() => {
    const items = resourceRequest?.preview.items ?? [];
    const weekPlanItems = items.filter((item) => (item.source ?? "week_plan") === "week_plan");
    const availableItems = items.filter((item) => item.source === "available");
    const currentItems = items.filter((item) => item.source === "current");
    const hasWeekPlanItems = weekPlanItems.length > 0;
    return [
      { key: "week_plan" as const, title: groupTitle("week_plan", hasWeekPlanItems), items: weekPlanItems },
      { key: "available" as const, title: groupTitle("available", hasWeekPlanItems), items: availableItems },
      { key: "current" as const, title: groupTitle("current", hasWeekPlanItems), items: currentItems },
    ].filter((group) => group.items.length > 0);
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
            disabled: isBusy || stepIds.length === 0,
            isPending: isBusy,
            label: activeStepId === "employees" ? "Trotzdem speichern" : isLastStep ? "Termin speichern" : "Weiter",
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
      size={dialogSize}
      testId="dialog-appointment-save-review"
      title={dialogTitle}
    >
      <div className="space-y-5">
        {steps.length > 1 ? <DialogBaseStepper steps={steps} /> : null}

        {activeStepId === "resources" && resourceRequest ? (
          <section className="space-y-4" data-testid="appointment-save-review-step-resources">
            <DialogBaseInlineMessage
              tone="info"
              title="Wochenplanung vor dem Speichern prüfen"
              description="Prüfen Sie, welche Mitarbeiter übernommen oder wegen Konflikten entfernt werden sollen."
            />
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
                  <div className="sticky top-0 z-10 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                    {group.title}
                  </div>
                  <div className="divide-y">
                    {group.items.map((item) => {
                      const checked = selectedIds.includes(item.employeeId);
                      const statusLabel = resourceStatusLabel(item);
                      return (
                        <label
                          key={item.employeeId}
                          className={`flex items-start gap-3 p-4 ${item.selectable ? "cursor-pointer" : "opacity-70"}`}
                          data-testid={`appointment-week-preview-row-${item.employeeId}`}
                        >
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
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-medium text-slate-900">{item.employeeName}</div>
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
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
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
            />
          </section>
        ) : null}

        {activeStepId === "employees" ? (
          <section data-testid="appointment-save-review-step-no-employees">
            <DialogBaseInlineMessage
              tone="warning"
              title="Der Termin hat keine geplanten Mitarbeiter."
              description="Soll er trotzdem gespeichert werden?"
            />
          </section>
        ) : null}
      </div>
    </DialogBaseShell>
  );
}
