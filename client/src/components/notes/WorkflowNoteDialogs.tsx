import React, { type ReactNode } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import { DialogBaseFooter, DialogBaseShell } from "@/components/ui/dialog-base";

type WorkflowNoteSuggestionDialogProps = {
  open: boolean;
  templateTitle: string | null | undefined;
  targetLabel: string;
  onOpenChange: (open: boolean) => void;
  onSkip?: () => void;
  onConfirm: () => void | Promise<void>;
};

type WorkflowNoteRemovalDialogProps = {
  open: boolean;
  description: ReactNode;
  onOpenChange: (open: boolean) => void;
  onKeep?: () => void;
  onConfirm: () => void | Promise<void>;
};

export function WorkflowNoteSuggestionDialog({
  open,
  templateTitle,
  targetLabel,
  onOpenChange,
  onSkip,
  onConfirm,
}: WorkflowNoteSuggestionDialogProps) {
  const description = `Soll eine Notiz „${templateTitle ?? ""}“ für ${targetLabel} angelegt werden?`;

  return (
    <DialogBaseShell
      footer={(
        <DialogBaseFooter
          secondaryAction={{
            label: "Überspringen",
            onClick: onSkip,
            testId: "button-note-suggestion-skip",
            variant: "outline",
          }}
          primaryAction={{
            label: "Jetzt anlegen",
            onClick: () => {
              void onConfirm();
            },
            testId: "button-note-suggestion-confirm",
          }}
        />
      )}
      icon={<StickyNote />}
      onOpenChange={onOpenChange}
      open={open}
      testId="dialog-note-suggestion"
      title="Notiz anlegen?"
    >
      <p className="text-base leading-relaxed text-slate-700">{description}</p>
    </DialogBaseShell>
  );
}

export function WorkflowNoteRemovalDialog({
  open,
  description,
  onOpenChange,
  onKeep,
  onConfirm,
}: WorkflowNoteRemovalDialogProps) {
  return (
    <DialogBaseShell
      footer={(
        <DialogBaseFooter
          secondaryAction={{
            label: "Behalten",
            onClick: onKeep,
            testId: "button-note-removal-keep",
            variant: "outline",
          }}
          primaryAction={{
            label: "Entfernen",
            onClick: () => {
              void onConfirm();
            },
            testId: "button-note-removal-confirm",
            variant: "destructive",
          }}
        />
      )}
      icon={<Trash2 />}
      onOpenChange={onOpenChange}
      open={open}
      testId="dialog-note-removal"
      title="Notiz entfernen?"
    >
      <div className="text-base leading-relaxed text-slate-700">{description}</div>
    </DialogBaseShell>
  );
}
