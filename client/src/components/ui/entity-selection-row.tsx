import { CollectionDropDown } from "@/components/ui/collection-drop-down";

type SelectionOption = {
  value: string;
  label: string;
};

interface EntitySelectionRowProps {
  itemLabel: string;
  itemValue: string;
  itemOptions: SelectionOption[];
  itemPlaceholder: string;
  categoryLabel: string;
  categoryValue: string;
  categoryOptions: SelectionOption[];
  categoryPlaceholder: string;
  onItemSelect: (value: string) => void;
  onCategorySelect: (value: string) => void;
  showAdd?: boolean;
  showRemove?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  addDisabled?: boolean;
  removeDisabled?: boolean;
  selectDisabled?: boolean;
  itemTestId?: string;
  categoryTestId?: string;
}

export function EntitySelectionRow({
  itemLabel,
  itemValue,
  itemOptions,
  itemPlaceholder,
  categoryLabel,
  categoryValue,
  categoryOptions,
  categoryPlaceholder,
  onItemSelect,
  onCategorySelect,
  showAdd = false,
  showRemove = false,
  onAdd,
  onRemove,
  addDisabled = false,
  removeDisabled = false,
  selectDisabled = false,
  itemTestId,
  categoryTestId,
}: EntitySelectionRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <CollectionDropDown
        label={itemLabel}
        value={itemValue}
        options={itemOptions}
        placeholder={itemPlaceholder}
        onSelect={onItemSelect}
        showRemove={showRemove}
        showAdd={showAdd}
        onRemove={onRemove}
        onAdd={onAdd}
        removeDisabled={removeDisabled}
        addDisabled={addDisabled}
        selectDisabled={selectDisabled}
        testId={itemTestId}
      />
      <CollectionDropDown
        label={categoryLabel}
        value={categoryValue}
        options={categoryOptions}
        placeholder={categoryPlaceholder}
        onSelect={onCategorySelect}
        testId={categoryTestId}
      />
    </div>
  );
}
