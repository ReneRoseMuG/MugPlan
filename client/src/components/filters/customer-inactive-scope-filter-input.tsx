import { BooleanToggleFilterInput } from "@/components/filters/boolean-toggle-filter-input";

interface CustomerInactiveScopeFilterInputProps {
  customerScope: "active" | "inactive";
  onCustomerScopeChange: (scope: "active" | "inactive") => void;
  className?: string;
}

export function CustomerInactiveScopeFilterInput({
  customerScope,
  onCustomerScopeChange,
  className,
}: CustomerInactiveScopeFilterInputProps) {
  return (
    <BooleanToggleFilterInput
      id="customer-filter-scope-inactive"
      label="Inaktive"
      checked={customerScope === "inactive"}
      onCheckedChange={(checked) => onCustomerScopeChange(checked ? "inactive" : "active")}
      className={className}
    />
  );
}
