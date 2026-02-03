import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LucideIcon } from "lucide-react";

export interface EntityEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  onSave?: () => void;
  onSubmit?: () => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  closeOnSubmitSuccess?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  maxWidth?: string;
  headerExtra?: ReactNode;
  saveTestId?: string;
  cancelTestId?: string;
}

export function EntityEditDialog({
  open,
  onOpenChange,
  title,
  icon: Icon,
  children,
  onSave,
  onSubmit,
  onCancel,
  isSaving = false,
  closeOnSubmitSuccess = true,
  saveDisabled = false,
  saveLabel = "Speichern",
  cancelLabel = "Abbrechen",
  maxWidth = "max-w-md",
  headerExtra,
  saveTestId = "button-save-entity",
  cancelTestId = "button-cancel-entity",
}: EntityEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAction = onSubmit ?? (onSave ? async () => onSave() : undefined);
  const shouldAutoClose = closeOnSubmitSuccess && !!onSubmit;
  const isBusy = isSaving || isSubmitting;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onCancel();
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!submitAction) return;
    try {
      setIsSubmitting(true);
      await submitAction();
      if (shouldAutoClose) {
        handleOpenChange(false);
      }
    } catch {
      // keep dialog open on submit errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Icon className="w-5 h-5" />
            {title}
            {headerExtra}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {children}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={onCancel} data-testid={cancelTestId}>
              {cancelLabel}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isBusy || saveDisabled} 
              data-testid={saveTestId}
            >
              {isBusy ? "Speichern..." : saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
