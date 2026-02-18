import { EmployeeInactiveScopeFilterInput } from "@/components/filters/employee-inactive-scope-filter-input";
import { EmployeeNameFilterInput } from "@/components/filters/employee-name-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface EmployeeFilterPanelProps {
  title: string;
  employeeLastName: string;
  onEmployeeLastNameChange: (value: string) => void;
  onEmployeeLastNameClear: () => void;
  employeeScope?: "active" | "inactive";
  onEmployeeScopeChange?: (scope: "active" | "inactive") => void;
}

export function EmployeeFilterPanel({
  title,
  employeeLastName,
  onEmployeeLastNameChange,
  onEmployeeLastNameClear,
  employeeScope,
  onEmployeeScopeChange,
}: EmployeeFilterPanelProps) {
  return (
    <FilterPanel title={title} layout="row">
      {employeeScope && onEmployeeScopeChange ? (
        <EmployeeInactiveScopeFilterInput
          employeeScope={employeeScope}
          onEmployeeScopeChange={onEmployeeScopeChange}
          className="w-full sm:w-auto sm:min-w-32"
        />
      ) : null}
      <EmployeeNameFilterInput
        value={employeeLastName}
        onChange={onEmployeeLastNameChange}
        onClear={onEmployeeLastNameClear}
        className="flex-1"
      />
    </FilterPanel>
  );
}
