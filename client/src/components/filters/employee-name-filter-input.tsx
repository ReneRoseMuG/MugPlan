import { SearchFilterInput } from "@/components/ui/search-filter-input";

interface EmployeeNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function EmployeeNameFilterInput({
  value,
  onChange,
  onClear,
  className,
}: EmployeeNameFilterInputProps) {
  return (
    <SearchFilterInput
      id="employee-filter-last-name"
      label="Nachname"
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
