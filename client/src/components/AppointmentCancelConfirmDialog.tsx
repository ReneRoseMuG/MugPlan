import React from "react";
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
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR } from "@shared/appointmentCancellation";

export const APPOINTMENT_CANCEL_DIALOG_TITLE = "Termin stornieren?";
export const APPOINTMENT_CANCEL_DIALOG_DESCRIPTION = "Der Termin wird dauerhaft als storniert markiert. Alle Mitarbeiter werden vom Termin abgezogen und sind im Terminzeitraum zur erneuten Planung verfügbar. Der Auftragswert wird im System auf 0,- Euro gesetzt. Stornierte Termine können nicht reaktiviert werden.";
export const APPOINTMENT_CANCEL_DIALOG_CONFIRM_LABEL = "Termin stornieren";
export const APPOINTMENT_CANCEL_DIALOG_CONFIRM_PENDING_LABEL = "Termin stornieren...";

type AppointmentCancelConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  disabled?: boolean;
  isPending?: boolean;
};

export function AppointmentCancelConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  disabled = false,
  isPending = false,
}: AppointmentCancelConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{APPOINTMENT_CANCEL_DIALOG_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            {APPOINTMENT_CANCEL_DIALOG_DESCRIPTION}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={disabled || isPending}
            style={{
              backgroundColor: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
              borderColor: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
            }}
          >
            {isPending ? APPOINTMENT_CANCEL_DIALOG_CONFIRM_PENDING_LABEL : APPOINTMENT_CANCEL_DIALOG_CONFIRM_LABEL}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
