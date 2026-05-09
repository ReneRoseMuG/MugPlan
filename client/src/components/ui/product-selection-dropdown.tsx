import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import type { Product } from "@shared/schema";
import { CollectionDropDown } from "@/components/ui/collection-drop-down";
import { DialogBaseShell } from "@/components/ui/dialog-base";

interface ProductSelectionDropdownProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  label?: string;
  placeholder?: string;
  testId?: string;
  dialogMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
}

function ProductSelectionDropdownPanel({
  products,
  selectedProductId,
  onSelect,
  onApply,
  label,
  placeholder,
  testId,
}: {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  onApply: () => void;
  label?: string;
  placeholder?: string;
  testId?: string;
}) {
  const [draftSelection, setDraftSelection] = useState(selectedProductId);

  useEffect(() => {
    setDraftSelection(selectedProductId);
  }, [selectedProductId]);

  const options = useMemo(
    () =>
      products
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
        .map((product) => ({
          value: String(product.id),
          label: product.name,
        })),
    [products],
  );

  return (
    <CollectionDropDown
      label={label ?? "Sauna"}
      value={draftSelection}
      options={options}
      placeholder={placeholder ?? "Sauna auswählen"}
      onSelect={setDraftSelection}
      showAdopt
      onAdopt={() => {
        onSelect(draftSelection);
        onApply();
      }}
      adoptDisabled={!draftSelection}
      testId={testId ?? "select-project-product-saunamodel"}
    />
  );
}

export function ProductSelectionDropdown({
  products,
  selectedProductId,
  onSelect,
  label,
  placeholder,
  testId,
  dialogMode = false,
  open = true,
  onOpenChange,
  title,
}: ProductSelectionDropdownProps) {
  const panel = (
    <ProductSelectionDropdownPanel
      products={products}
      selectedProductId={selectedProductId}
      onSelect={onSelect}
      label={label}
      placeholder={placeholder}
      testId={testId}
      onApply={() => {
        if (dialogMode) {
          onOpenChange?.(false);
        }
      }}
    />
  );

  if (!dialogMode) {
    return panel;
  }

  return (
    <DialogBaseShell
      icon={<Package className="h-5 w-5 text-primary" />}
      onOpenChange={onOpenChange ?? (() => undefined)}
      open={open}
      testId="dialog-select-product"
      title={title ?? `${label ?? "Sauna"} auswählen`}
    >
      {panel}
    </DialogBaseShell>
  );
}
