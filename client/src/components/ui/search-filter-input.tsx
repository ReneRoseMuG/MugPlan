import { FilterInput } from "@/components/ui/filter-input";

interface SearchFilterInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  numericOnly?: boolean;
  className?: string;
  placeholder?: string;
}

export function SearchFilterInput({
  id,
  label,
  value,
  onChange,
  onClear,
  numericOnly,
  className,
  placeholder,
}: SearchFilterInputProps) {
  const resolvedPlaceholder = placeholder ?? `Suche: ${label}`;

  return (
    <FilterInput
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      numericOnly={numericOnly}
      className={className}
      placeholder={resolvedPlaceholder}
    />
  );
}
