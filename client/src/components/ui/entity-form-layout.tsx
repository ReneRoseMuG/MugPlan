import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

interface EntityFormLayoutProps {
  title: string;
  subtitle?: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  headerStartAction?: ReactNode;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  onSubmit?: () => Promise<void>;
  closeOnSubmitSuccess?: boolean;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  testIdPrefix?: string;
  footerActions?: ReactNode;
  contentScrollMode?: "auto" | "contained";
}

export function EntityFormLayout({
  title,
  subtitle,
  icon,
  children,
  headerStartAction,
  onClose,
  onCancel,
  onSave,
  onSubmit,
  closeOnSubmitSuccess = true,
  isSaving = false,
  saveLabel = "Speichern",
  cancelLabel = "Abbrechen",
  testIdPrefix = "entity",
  footerActions,
  contentScrollMode = "auto",
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
    <div className="flex h-full min-h-0 flex-col">
      <Card className="mx-auto flex h-full min-h-0 w-full flex-1 flex-col">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {headerStartAction}
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                  {icon}
                  {title}
                </h2>
                <EditFormContextText>{subtitle}</EditFormContextText>
              </div>
            </div>
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
        <CardContent className="flex min-h-0 flex-1 flex-col pt-6">
          <div className={contentScrollMode === "contained" ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"}>
            {children}
          </div>

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
            {footerActions}
            {submitAction && (
              <Button 
                onClick={() => {
                  void handleSubmit();
                }}
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
