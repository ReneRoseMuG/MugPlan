import { useState } from "react";
import { Package } from "lucide-react";
import { DialogBaseFooter, DialogBaseInlineMessage, DialogBaseShell } from "@/components/ui/dialog-base";
import { ProductDetails, type ProductDetailsDraft } from "@/components/ui/product-details";

export type ProductCreateInput = {
  name: string;
  shortCode: string | null;
  description: string | null;
  categoryId: number;
};

interface ProductCreateDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName?: string;
  categoryId: number;
  onConfirm: (input: ProductCreateInput) => Promise<unknown>;
}

function emptyDraft(): ProductDetailsDraft {
  return { name: "", shortCode: "", description: "", isActive: true };
}

export function ProductCreateDialog({
  open,
  onClose,
  categoryName,
  categoryId,
  onConfirm,
}: ProductCreateDialogProps) {
  const [draft, setDraft] = useState<ProductDetailsDraft>(emptyDraft);
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
      setError(err instanceof Error ? err : new Error("Produkt konnte nicht angelegt werden."));
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
      icon={<Package className="h-5 w-5 text-primary" />}
      onOpenChange={handleOpenChange}
      open={open}
      testId="dialog-create-product"
      title={`Neues Produkt${categoryName ? ` - ${categoryName}` : ""}`}
    >
      <div className="space-y-3">
        <ProductDetails
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
