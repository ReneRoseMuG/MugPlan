import React from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  MutationPreviewDialogBase,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import {
  canExecuteSelection,
  formatBulkMoveDate,
  itemHasHoliday,
  itemHasNotes,
  summarizePreview,
  type BulkWeekMoveExecuteResponse,
  type BulkWeekMovePreviewItem,
  type BulkWeekMovePreviewResponse,
} from "@/lib/calendar-bulk-week-move";

export type BulkWeekMovePhase = "config" | "report" | "result";

type CatalogEntry = { id: number; name: string };

export interface CalendarBulkWeekMoveDialogProps {
  open: boolean;
  phase: BulkWeekMovePhase;
  tours: ReadonlyArray<CatalogEntry>;
  tags: ReadonlyArray<CatalogEntry>;
  isCatalogLoading: boolean;
  sourceTourIds: number[];
  onToggleTour: (tourId: number) => void;
  shiftWeeks: number;
  onShiftWeeksChange: (value: number) => void;
  blockingTagIds: number[];
  onToggleBlockingTag: (tagId: number) => void;
  onRunPreview: () => void;
  isPreviewPending: boolean;
  previewError: string | null;
  preview: BulkWeekMovePreviewResponse | null;
  selectedIds: number[];
  onToggleItem: (item: BulkWeekMovePreviewItem) => void;
  onBackToConfig: () => void;
  onConfirm: () => void;
  isExecutePending: boolean;
  executeResult: BulkWeekMoveExecuteResponse | null;
  onClose: () => void;
}

const stepTitles: Record<BulkWeekMovePhase, string> = {
  config: "Auswahl",
  report: "Zwischenreport",
  result: "Ergebnis",
};

function buildSteps(phase: BulkWeekMovePhase): DialogBaseStep[] {
  const order: BulkWeekMovePhase[] = ["config", "report", "result"];
  const activeIndex = order.indexOf(phase);
  return order.map((id, index) => ({
    id,
    title: stepTitles[id],
    state: index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending",
  }));
}

function blockReasonText(item: BulkWeekMovePreviewItem): string {
  return item.blockReasons.map((reason) => reason.message).join(" ");
}

export function CalendarBulkWeekMoveDialog(props: CalendarBulkWeekMoveDialogProps) {
  const {
    open,
    phase,
    tours,
    tags,
    isCatalogLoading,
    sourceTourIds,
    onToggleTour,
    shiftWeeks,
    onShiftWeeksChange,
    blockingTagIds,
    onToggleBlockingTag,
    onRunPreview,
    isPreviewPending,
    previewError,
    preview,
    selectedIds,
    onToggleItem,
    onBackToConfig,
    onConfirm,
    isExecutePending,
    executeResult,
    onClose,
  } = props;

  const canRunPreview = sourceTourIds.length > 0 && shiftWeeks >= 1 && !isPreviewPending;
  const summary = preview ? summarizePreview(preview.items) : null;
  const canConfirm = canExecuteSelection(selectedIds) && !isExecutePending;

  const footer = phase === "config"
    ? (
      <DialogBaseFooter
        secondaryAction={{ label: "Abbrechen", onClick: onClose, disabled: isPreviewPending }}
        primaryAction={{
          label: "Zwischenreport erstellen",
          onClick: onRunPreview,
          isPending: isPreviewPending,
          pendingLabel: "Wird ermittelt...",
          disabled: !canRunPreview,
          testId: "button-bulk-week-move-preview",
        }}
      />
    )
    : phase === "report"
      ? (
        <DialogBaseFooter
          backAction={{ label: "Zurück", onClick: onBackToConfig, disabled: isExecutePending }}
          secondaryAction={{ label: "Abbrechen", onClick: onClose, disabled: isExecutePending }}
          primaryAction={{
            label: "Sammelverschiebung ausführen",
            onClick: onConfirm,
            isPending: isExecutePending,
            pendingLabel: "Wird verschoben...",
            disabled: !canConfirm,
            testId: "button-bulk-week-move-confirm",
          }}
        />
      )
      : (
        <DialogBaseFooter
          primaryAction={{ label: "Schließen", onClick: onClose, testId: "button-bulk-week-move-close" }}
        />
      );

  return (
    <MutationPreviewDialogBase
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
      closeDisabled={isPreviewPending || isExecutePending}
      title="Termine kalenderwochenweise verschieben"
      size="xl"
      steps={buildSteps(phase)}
      footer={footer}
      testId="dialog-bulk-week-move"
    >
      <div className="space-y-4" data-testid="bulk-week-move-content">
        {phase === "config" ? (
          <section className="space-y-5" data-testid="bulk-week-move-config">
            <div className="space-y-2">
              <Label>Ausgangstouren</Label>
              {isCatalogLoading ? (
                <p className="text-sm text-muted-foreground">Touren werden geladen...</p>
              ) : tours.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Touren verfügbar.</p>
              ) : (
                <div className="max-h-48 overflow-auto rounded-md border divide-y" data-testid="bulk-week-move-tour-list">
                  {tours.map((tour) => (
                    <label
                      key={tour.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm"
                      data-testid={`bulk-week-move-tour-row-${tour.id}`}
                    >
                      <Checkbox
                        checked={sourceTourIds.includes(tour.id)}
                        onCheckedChange={() => onToggleTour(tour.id)}
                        data-testid={`bulk-week-move-tour-${tour.id}`}
                      />
                      <span>{tour.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-week-move-shift-weeks">Verschiebung um Kalenderwochen (nur vorwärts)</Label>
              <Input
                id="bulk-week-move-shift-weeks"
                type="number"
                min={1}
                max={52}
                value={String(shiftWeeks)}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  onShiftWeeksChange(Number.isFinite(parsed) ? parsed : 1);
                }}
                className="w-32"
                data-testid="bulk-week-move-shift-weeks"
              />
            </div>

            <div className="space-y-2">
              <Label>Blockierende Tags</Label>
              <p className="text-xs text-muted-foreground">
                Termine mit mindestens einem dieser Tags werden von der Verschiebung ausgeschlossen.
              </p>
              {isCatalogLoading ? (
                <p className="text-sm text-muted-foreground">Tags werden geladen...</p>
              ) : tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Tags verfügbar.</p>
              ) : (
                <div className="max-h-48 overflow-auto rounded-md border divide-y" data-testid="bulk-week-move-tag-list">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm"
                      data-testid={`bulk-week-move-tag-row-${tag.id}`}
                    >
                      <Checkbox
                        checked={blockingTagIds.includes(tag.id)}
                        onCheckedChange={() => onToggleBlockingTag(tag.id)}
                        data-testid={`bulk-week-move-tag-${tag.id}`}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {previewError ? (
              <DialogBaseInlineMessage tone="warning" title={previewError} />
            ) : null}
          </section>
        ) : null}

        {phase === "report" && preview ? (
          <section className="space-y-4" data-testid="bulk-week-move-report">
            {summary ? (
              <p className="text-sm text-muted-foreground" data-testid="bulk-week-move-summary">
                {summary.total} Termine ermittelt, {summary.movable} verschiebbar, {summary.blocked} blockiert.
              </p>
            ) : null}
            {preview.items.length === 0 ? (
              <DialogBaseInlineMessage
                tone="info"
                title="Keine Termine in der Ausgangswoche"
                description="Für die ausgewählten Touren wurden in dieser Kalenderwoche keine Termine gefunden."
              />
            ) : (
              <div className="max-h-[55vh] overflow-auto rounded-md border divide-y" data-testid="bulk-week-move-item-list">
                {preview.items.map((item) => {
                  const checked = selectedIds.includes(item.appointmentId);
                  const holiday = itemHasHoliday(item);
                  const notes = itemHasNotes(item);
                  return (
                    <div
                      key={item.appointmentId}
                      className={`flex items-start gap-3 p-3 ${item.selectable ? "" : "opacity-70"}`}
                      data-testid={`bulk-week-move-row-${item.appointmentId}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!item.selectable || isExecutePending}
                        onCheckedChange={() => onToggleItem(item)}
                        data-testid={`bulk-week-move-item-${item.appointmentId}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{item.title}</span>
                          {item.tourName ? (
                            <span className="shrink-0 text-xs text-muted-foreground">({item.tourName})</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span data-testid={`bulk-week-move-dates-${item.appointmentId}`}>
                            {formatBulkMoveDate(item.sourceStartDate)} → {formatBulkMoveDate(item.targetStartDate)}
                          </span>
                        </div>
                        {item.status === "blocked" ? (
                          <div
                            className="flex items-start gap-1.5 text-sm text-red-600"
                            data-testid={`bulk-week-move-block-${item.appointmentId}`}
                          >
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{blockReasonText(item)}</span>
                          </div>
                        ) : null}
                        {holiday ? (
                          <div
                            className="flex items-start gap-1.5 text-sm font-medium text-red-600"
                            data-testid={`bulk-week-move-holiday-${item.appointmentId}`}
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{item.hints.find((hint) => hint.code === "PUBLIC_HOLIDAY")?.message}</span>
                          </div>
                        ) : null}
                        {notes ? (
                          <div
                            className="flex items-start gap-1.5 text-sm text-amber-700"
                            data-testid={`bulk-week-move-notes-${item.appointmentId}`}
                          >
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{item.hints.find((hint) => hint.code === "NOTES")?.message}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {phase === "result" && executeResult ? (
          <section className="space-y-4" data-testid="bulk-week-move-result">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700" data-testid="bulk-week-move-result-moved">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{executeResult.moved.length} Termine verschoben</span>
            </div>
            {executeResult.failed.length > 0 ? (
              <div className="space-y-2" data-testid="bulk-week-move-result-failed">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                  <span>{executeResult.failed.length} Termine nicht verschoben</span>
                </div>
                <ul className="rounded-md border divide-y text-sm">
                  {executeResult.failed.map((failure) => (
                    <li key={failure.appointmentId} className="px-3 py-2 text-red-700">
                      Termin {failure.appointmentId}: {failure.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </MutationPreviewDialogBase>
  );
}
