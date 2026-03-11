import { Button } from "@/components/ui/button";

type CollectionOption = {
  value: string;
  label: string;
};

interface CollectionDropDownProps {
  label: string;
  value: string;
  options: CollectionOption[];
  placeholder: string;
  onSelect?: (value: string) => void;
  showRemove?: boolean;
  showAdd?: boolean;
  showAdopt?: boolean;
  onRemove?: () => void;
  onAdd?: () => void;
  onAdopt?: () => void;
  removeDisabled?: boolean;
  addDisabled?: boolean;
  adoptDisabled?: boolean;
  selectDisabled?: boolean;
  testId?: string;
}

export function CollectionDropDown({
  label,
  value,
  options,
  placeholder,
  onSelect,
  showRemove = false,
  showAdd = false,
  showAdopt = false,
  onRemove,
  onAdd,
  onAdopt,
  removeDisabled = false,
  addDisabled = false,
  adoptDisabled = false,
  selectDisabled = false,
  testId,
}: CollectionDropDownProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="flex min-w-0 items-center gap-2">
        {showRemove ? (
          <Button type="button" variant="outline" onClick={onRemove} disabled={removeDisabled} className="shrink-0">
            -
          </Button>
        ) : null}
        <select
          value={value}
          onChange={(event) => onSelect?.(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-sm"
          disabled={selectDisabled}
          data-testid={testId}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {showAdd ? (
          <Button type="button" variant="outline" onClick={onAdd} disabled={addDisabled} className="shrink-0">
            +
          </Button>
        ) : null}
        {showAdopt ? (
          <Button type="button" variant="outline" onClick={onAdopt} disabled={adoptDisabled} className="shrink-0">
            Übernehmen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
