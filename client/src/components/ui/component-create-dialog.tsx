import { useState } from "react";
import { Boxes } from "lucide-react";
import { DialogBaseFooter, DialogBaseInlineMessage, DialogBaseShell } from "@/components/ui/dialog-base";
import { ComponentDetails, type ComponentDetailsDraft } from "@/components/ui/component-details";

export type ComponentCreateInput = {
  name: string;
  shortCode: string | null;
  description: string | null;
  categoryId: number;
};

interface ComponentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName?: string;
  categoryId: number;
  onConfirm: (input: ComponentCreateInput) => Promise<unknown>;
}

function emptyDraft(): ComponentDetailsDraft {
  return { name: "", shortCode: "", description: "", isActive: true };
}

export function ComponentCreateDialog({
  open,
  onClose,
  categoryName,
  categoryId,
  onConfirm,
}: ComponentCreateDialogProps) {
  const [draft, setDraft] = useState<ComponentDetailsDraft>(emptyDraft);
  const [error, setError] = useState<unknown | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDraft(emptyDraft());
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      reset();
    }
  };

  const handleConfirm = async () => {
    if (!draft.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        name: draft.name.trim(),
        shortCode: draft.shortCode.trim() || null,
        description: draft.description.trim() || null,
        categoryId,
      });
      onClose();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Komponente konnte nicht angelegt werden."));
      setSubmitting(false);
    }
  };

  return (
    <DialogBaseShell
      closeDisabled={submitting}
      footer={(
        <DialogBaseFooter
          secondaryAction={{
            disabled: submitting,
            label: "Abbrechen",
            onClick: () => handleOpenChange(false),
          }}
          primaryAction={{
            disabled: submitting || !draft.name.trim(),
            isPending: submitting,
            label: "Bestätigen",
            onClick: () => void handleConfirm(),
            pendingLabel: "Speichere...",
          }}
        />
      )}
      icon={<Boxes className="h-5 w-5 text-primary" />}
      onOpenChange={handleOpenChange}
      open={open}
      testId="dialog-create-component"
      title={`Neue Komponente${categoryName ? ` - ${categoryName}` : ""}`}
    >
      <div className="space-y-3">
        <ComponentDetails
          draft={draft}
          disabled={submitting}
          isAdmin={false}
          hideIsActive={true}
          onDraftChange={setDraft}
        />
        {error ? <DialogBaseInlineMessage error={error} /> : null}
      </div>
    </DialogBaseShell>
  );
}
