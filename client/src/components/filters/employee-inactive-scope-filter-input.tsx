import { BooleanToggleFilterInput } from "@/components/filters/boolean-toggle-filter-input";

interface EmployeeInactiveScopeFilterInputProps {
  employeeScope: "active" | "inactive";
  onEmployeeScopeChange: (scope: "active" | "inactive") => void;
  className?: string;
}

export function EmployeeInactiveScopeFilterInput({
  employeeScope,
  onEmployeeScopeChange,
  className,
}: EmployeeInactiveScopeFilterInputProps) {
  return (
    <BooleanToggleFilterInput
      id="employee-filter-scope-inactive"
      label="Inaktive"
      checked={employeeScope === "inactive"}
      onCheckedChange={(checked) => onEmployeeScopeChange(checked ? "inactive" : "active")}
      className={className}
    />
  );
}
