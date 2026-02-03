import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

interface EntityFormLayoutProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  onSubmit?: () => Promise<void>;
  closeOnSubmitSuccess?: boolean;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  testIdPrefix?: string;
}

export function EntityFormLayout({
  title,
  icon,
  children,
  onClose,
  onCancel,
  onSave,
  onSubmit,
  closeOnSubmitSuccess = true,
  isSaving = false,
  saveLabel = "Speichern",
  cancelLabel = "Abbrechen",
  testIdPrefix = "entity",
}: EntityFormLayoutProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAction = onSubmit ?? (onSave ? async () => onSave() : undefined);
  const shouldAutoClose = closeOnSubmitSuccess && !!onSubmit;
  const isBusy = isSaving || isSubmitting;

  const handleSubmit = async () => {
    if (!submitAction) return;
    try {
      setIsSubmitting(true);
      await submitAction();
      if (shouldAutoClose) {
        (onClose ?? onCancel)?.();
      }
    } catch {
      // keep dialog open on submit errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
              {icon}
              {title}
            </h2>
            {onClose && (
              <Button 
                size="lg" 
                variant="ghost" 
                onClick={onClose} 
                data-testid={`button-close-${testIdPrefix}`}
              >
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {children}

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel} 
                data-testid={`button-cancel-${testIdPrefix}`}
              >
                {cancelLabel}
              </Button>
            )}
            {submitAction && (
              <Button 
                onClick={handleSubmit} 
                disabled={isBusy}
                data-testid={`button-save-${testIdPrefix}`}
              >
                {isBusy ? `${saveLabel}...` : saveLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
