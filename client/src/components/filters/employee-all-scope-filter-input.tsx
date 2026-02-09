import { BooleanToggleFilterInput } from "@/components/filters/boolean-toggle-filter-input";

interface EmployeeAllScopeFilterInputProps {
  employeeScope: "active" | "all";
  onEmployeeScopeChange: (scope: "active" | "all") => void;
  className?: string;
}

export function EmployeeAllScopeFilterInput({
  employeeScope,
  onEmployeeScopeChange,
  className,
}: EmployeeAllScopeFilterInputProps) {
  return (
    <BooleanToggleFilterInput
      id="employee-filter-scope-all"
      label="Alle"
      checked={employeeScope === "all"}
      onCheckedChange={(checked) => onEmployeeScopeChange(checked ? "all" : "active")}
      className={className}
    />
  );
}

