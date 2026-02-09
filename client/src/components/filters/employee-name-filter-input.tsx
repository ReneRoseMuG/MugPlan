import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

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
      labelAdornment={<HelpIcon helpKey="employees.filter.name" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
