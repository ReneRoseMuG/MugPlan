import { useEffect, useMemo, useState } from "react";
import { LayoutList, Save, TriangleAlert } from "lucide-react";
import { DialogBaseFooter, DialogBaseInlineMessage, DialogBaseShell, DialogBaseStepper, type DialogBaseStep } from "@/components/ui/dialog-base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";

export type ProjectSaveReviewNoteDraft = {
  title: string;
  body: string;
  cardColor?: string | null;
  print: boolean;
  templateId?: number;
};

export type ProjectSaveReviewDuplicateSummary = {
  customer: number;
  project: number;
  employee: number;
};

export type ProjectSaveReviewResult = {
  adoptSaunaTitle: boolean;
  createReklamationNote: boolean;
  reklamationNote: ProjectSaveReviewNoteDraft | null;
  linkDuplicateAttachment: boolean;
};

type ProjectSaveReviewStepId = "articles" | "title" | "reklamation" | "attachment";

type ProjectSaveReviewDialogProps = {
  open: boolean;
  missingArticleLabels: string[];
  saunaModelName?: string | null;
  currentProjectName: string;
  reklamationNoteDraft?: ProjectSaveReviewNoteDraft | null;
  duplicateAttachmentSummary?: ProjectSaveReviewDuplicateSummary | null;
  isBusy?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: (result: ProjectSaveReviewResult) => void;
};

const stepTitles: Record<ProjectSaveReviewStepId, string> = {
  articles: "Artikelliste",
  title: "Projektname",
  reklamation: "Reklamation",
  attachment: "PDF-Duplikat",
};

export function ProjectSaveReviewDialog({
  open,
  missingArticleLabels,
  saunaModelName = null,
  currentProjectName,
  reklamationNoteDraft = null,
  duplicateAttachmentSummary = null,
  isBusy = false,
  onOpenChange,
  onCancel,
  onConfirm,
}: ProjectSaveReviewDialogProps) {
  const stepIds = useMemo<ProjectSaveReviewStepId[]>(() => {
    const nextSteps: ProjectSaveReviewStepId[] = [];
    if (missingArticleLabels.length > 0) nextSteps.push("articles");
    if (saunaModelName) nextSteps.push("title");
    if (reklamationNoteDraft) nextSteps.push("reklamation");
    if (duplicateAttachmentSummary) nextSteps.push("attachment");
    return nextSteps;
  }, [duplicateAttachmentSummary, missingArticleLabels.length, reklamationNoteDraft, saunaModelName]);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [adoptSaunaTitle, setAdoptSaunaTitle] = useState(true);
  const [createReklamationNote, setCreateReklamationNote] = useState(true);
  const [noteTitle, setNoteTitle] = useState(reklamationNoteDraft?.title ?? "");
  const [noteBody, setNoteBody] = useState(reklamationNoteDraft?.body ?? "");
  const [notePrint, setNotePrint] = useState(reklamationNoteDraft?.print ?? true);
  const [linkDuplicateAttachment, setLinkDuplicateAttachment] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveStepIndex(0);
    setAdoptSaunaTitle(true);
    setCreateReklamationNote(true);
    setNoteTitle(reklamationNoteDraft?.title ?? "");
    setNoteBody(reklamationNoteDraft?.body ?? "");
    setNotePrint(reklamationNoteDraft?.print ?? true);
    setLinkDuplicateAttachment(false);
  }, [open, reklamationNoteDraft]);

  useEffect(() => {
    if (activeStepIndex >= stepIds.length) {
      setActiveStepIndex(Math.max(stepIds.length - 1, 0));
    }
  }, [activeStepIndex, stepIds.length]);

  const activeStepId = stepIds[activeStepIndex];
  const isLastStep = activeStepIndex >= stepIds.length - 1;
  const noteTitleInvalid = activeStepId === "reklamation" && createReklamationNote && noteTitle.trim().length === 0;
  const steps = stepIds.map<DialogBaseStep>((stepId, index) => ({
    id: stepId,
    title: stepTitles[stepId],
    state: index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "pending",
  }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel();
    }
    onOpenChange(nextOpen);
  };

  const handlePrimaryAction = () => {
    if (!isLastStep) {
      setActiveStepIndex((current) => current + 1);
      return;
    }
    onConfirm({
      adoptSaunaTitle: Boolean(saunaModelName && adoptSaunaTitle),
      createReklamationNote: Boolean(reklamationNoteDraft && createReklamationNote),
      reklamationNote: reklamationNoteDraft && createReklamationNote
        ? {
            ...reklamationNoteDraft,
            title: noteTitle.trim(),
            body: noteBody,
            print: notePrint,
          }
        : null,
      linkDuplicateAttachment: Boolean(duplicateAttachmentSummary && linkDuplicateAttachment),
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
            testId: "button-project-save-review-back",
          } : undefined}
          secondaryAction={{
            disabled: isBusy,
            label: "Abbrechen",
            onClick: onCancel,
            testId: "button-project-save-review-cancel",
            variant: "outline",
          }}
          primaryAction={{
            disabled: isBusy || noteTitleInvalid || stepIds.length === 0,
            isPending: isBusy,
            label: isLastStep ? "Projekt speichern" : "Weiter",
            onClick: handlePrimaryAction,
            pendingLabel: "Speichern...",
            testId: isLastStep ? "button-project-save-review-confirm" : "button-project-save-review-next",
          }}
        />
      )}
      icon={<Save />}
      onOpenChange={handleOpenChange}
      open={open}
      size="lg"
      testId="dialog-project-save-review"
      title="Projekt speichern"
    >
      {steps.length > 1 ? (
        <DialogBaseStepper className="mb-5" steps={steps} />
      ) : null}

      {activeStepId === "articles" ? (
        <section className="space-y-4" data-testid="project-save-review-step-articles">
          <DialogBaseInlineMessage
            tone="warning"
            title="Artikelliste enthält offene Auswahlen"
            description="Diese Einträge stehen auf nicht ausgewählt. Das Speichern bleibt möglich."
          />
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="project-save-review-missing-articles">
            {missingArticleLabels.map((label) => (
              <li key={label} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="min-w-0 truncate">{label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeStepId === "title" ? (
        <section className="space-y-4" data-testid="project-save-review-step-title">
          <DialogBaseInlineMessage
            tone="info"
            title="Projektname kann aus dem Sauna-Modell übernommen werden"
            description={`Aktueller Projektname: ${currentProjectName || "ohne Titel"}`}
          />
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <input
              checked={adoptSaunaTitle}
              className="mt-0.5 h-4 w-4 shrink-0"
              data-testid="checkbox-project-save-review-adopt-sauna-title"
              onChange={(event) => setAdoptSaunaTitle(event.target.checked)}
              type="checkbox"
            />
            <span>
              Projektname auf <span className="font-semibold">{saunaModelName}</span> setzen.
            </span>
          </label>
        </section>
      ) : null}

      {activeStepId === "reklamation" ? (
        <section className="space-y-4" data-testid="project-save-review-step-reklamation">
          <DialogBaseInlineMessage
            tone="info"
            title="Reklamationsnotiz vorbereiten"
            description="Die Notiz wird zusammen mit dem neuen Projekt gespeichert."
          />
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <input
              checked={createReklamationNote}
              className="mt-0.5 h-4 w-4 shrink-0"
              data-testid="checkbox-project-save-review-create-reklamation-note"
              onChange={(event) => setCreateReklamationNote(event.target.checked)}
              type="checkbox"
            />
            <span>Reklamationsnotiz anlegen.</span>
          </label>
          {createReklamationNote ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-save-review-note-title">Titel *</Label>
                <Input
                  id="project-save-review-note-title"
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  data-testid="input-project-save-review-note-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Inhalt</Label>
                <RichTextEditor
                  value={noteBody}
                  onChange={setNoteBody}
                  className="min-h-[150px]"
                />
              </div>
              <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  checked={notePrint}
                  className="h-4 w-4 shrink-0"
                  data-testid="checkbox-project-save-review-note-print"
                  onChange={(event) => setNotePrint(event.target.checked)}
                  type="checkbox"
                />
                <span>In Druckausgaben berücksichtigen</span>
              </label>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeStepId === "attachment" ? (
        <section className="space-y-4" data-testid="project-save-review-step-attachment">
          <DialogBaseInlineMessage
            tone="warning"
            title="PDF-Dateiname ist bereits vorhanden"
            description="Das extrahierte PDF kann trotzdem verknüpft oder für diesen Speichern-Vorgang übersprungen werden."
          />
          <dl className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Kunde</dt>
              <dd className="font-semibold">{duplicateAttachmentSummary?.customer ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Projekt</dt>
              <dd className="font-semibold">{duplicateAttachmentSummary?.project ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mitarbeiter</dt>
              <dd className="font-semibold">{duplicateAttachmentSummary?.employee ?? 0}</dd>
            </div>
          </dl>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <input
              checked={linkDuplicateAttachment}
              className="mt-0.5 h-4 w-4 shrink-0"
              data-testid="checkbox-project-save-review-link-duplicate-attachment"
              onChange={(event) => setLinkDuplicateAttachment(event.target.checked)}
              type="checkbox"
            />
            <span>PDF trotzdem als Projektdokument verknüpfen.</span>
          </label>
        </section>
      ) : null}

      {activeStepId == null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutList className="h-4 w-4" />
          <span>Keine zusätzlichen Speichern-Hinweise vorhanden.</span>
        </div>
      ) : null}
    </DialogBaseShell>
  );
}
