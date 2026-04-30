import React, { type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-note-suggestion">
        <AlertDialogHeader>
          <AlertDialogTitle>Notiz anlegen?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Soll eine Notiz „${templateTitle ?? ""}“ für ${targetLabel} angelegt werden?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-note-suggestion-skip" onClick={onSkip}>
            Überspringen
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-note-suggestion-confirm"
            onClick={() => {
              void onConfirm();
            }}
          >
            Jetzt anlegen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-note-removal">
        <AlertDialogHeader>
          <AlertDialogTitle>Notiz entfernen?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-note-removal-keep" onClick={onKeep}>
            Behalten
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-note-removal-confirm"
            onClick={() => {
              void onConfirm();
            }}
          >
            Entfernen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
