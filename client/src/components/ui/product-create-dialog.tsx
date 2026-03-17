import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductDetails, type ProductDetailsDraft } from "@/components/ui/product-details";

interface ProductCreateDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName?: string;
  categoryId: number;
  onConfirm: (input: { name: string; shortCode: string | null; description: string | null; categoryId: number }) => Promise<unknown>;
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
  const [error, setError] = useState<string | null>(null);
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
      setError(err instanceof Error ? err.message : "Produkt konnte nicht angelegt werden.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Produkt{categoryName ? ` — ${categoryName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <ProductDetails
            draft={draft}
            disabled={submitting}
            isAdmin={false}
            hideIsActive={true}
            onDraftChange={setDraft}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Abbrechen</Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={submitting || !draft.name.trim()}
          >
            {submitting ? "Speichere..." : "Bestätigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
