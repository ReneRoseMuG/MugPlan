import { SearchFilterInput } from "@/components/ui/search-filter-input";

interface CustomerNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function CustomerNameFilterInput({
  value,
  onChange,
  onClear,
  className,
}: CustomerNameFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-last-name"
      label="Nachname"
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
