import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface CustomerFilterPanelProps {
  title: string;
  customerLastName: string;
  onCustomerLastNameChange: (value: string) => void;
  onCustomerLastNameClear: () => void;
  customerNumber: string;
  onCustomerNumberChange: (value: string) => void;
  onCustomerNumberClear: () => void;
}

export function CustomerFilterPanel({
  title,
  customerLastName,
  onCustomerLastNameChange,
  onCustomerLastNameClear,
  customerNumber,
  onCustomerNumberChange,
  onCustomerNumberClear,
}: CustomerFilterPanelProps) {
  return (
    <FilterPanel title={title} layout="row">
      <CustomerNameFilterInput
        value={customerLastName}
        onChange={onCustomerLastNameChange}
        onClear={onCustomerLastNameClear}
        className="flex-1"
      />
      <CustomerNumberFilterInput
        value={customerNumber}
        onChange={onCustomerNumberChange}
        onClear={onCustomerNumberClear}
        className="flex-1"
      />
    </FilterPanel>
  );
}
