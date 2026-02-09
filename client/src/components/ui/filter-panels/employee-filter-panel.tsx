import { EmployeeNameFilterInput } from "@/components/filters/employee-name-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface EmployeeFilterPanelProps {
  title: string;
  employeeLastName: string;
  onEmployeeLastNameChange: (value: string) => void;
  onEmployeeLastNameClear: () => void;
}

export function EmployeeFilterPanel({
  title,
  employeeLastName,
  onEmployeeLastNameChange,
  onEmployeeLastNameClear,
}: EmployeeFilterPanelProps) {
  return (
    <FilterPanel title={title} layout="row">
      <EmployeeNameFilterInput
        value={employeeLastName}
        onChange={onEmployeeLastNameChange}
        onClear={onEmployeeLastNameClear}
        className="flex-1"
      />
    </FilterPanel>
  );
}
