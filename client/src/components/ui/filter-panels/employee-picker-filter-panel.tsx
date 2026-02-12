import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface EmployeePickerFilterPanelProps {
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
}

export function EmployeePickerFilterPanel({
  nameFilter,
  onNameFilterChange,
}: EmployeePickerFilterPanelProps) {
  return (
    <FilterPanel title="Mitarbeiterfilter" layout="row">
      <SearchFilterInput
        id="employee-picker-name-filter"
        label="Name"
        value={nameFilter}
        onChange={onNameFilterChange}
        onClear={() => onNameFilterChange("")}
        className="min-w-[260px]"
      />
    </FilterPanel>
  );
}
