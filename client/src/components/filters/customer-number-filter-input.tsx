import { SearchFilterInput } from "@/components/ui/search-filter-input";

interface CustomerNumberFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function CustomerNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
}: CustomerNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-number"
      label="Kundennummer"
      value={value}
      onChange={onChange}
      onClear={onClear}
      numericOnly
      className={className}
    />
  );
}
