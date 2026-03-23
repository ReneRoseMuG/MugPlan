import { SearchFilterInput } from "@/components/ui/search-filter-input";

interface EmployeeFirstNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function EmployeeFirstNameFilterInput({
  value,
  onChange,
  onClear,
  className,
}: EmployeeFirstNameFilterInputProps) {
  return (
    <SearchFilterInput
      id="employee-filter-first-name"
      label="Vorname"
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
