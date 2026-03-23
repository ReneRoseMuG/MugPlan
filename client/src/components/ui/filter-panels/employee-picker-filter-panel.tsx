import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface EmployeePickerFilterPanelProps {
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  firstNameFilter: string;
  onFirstNameFilterChange: (value: string) => void;
}

export function EmployeePickerFilterPanel({
  nameFilter,
  onNameFilterChange,
  firstNameFilter,
  onFirstNameFilterChange,
}: EmployeePickerFilterPanelProps) {
  return (
    <FilterPanel title="Mitarbeiterfilter" layout="row">
      <SearchFilterInput
        id="employee-picker-lastname-filter"
        label="Nachname"
        value={nameFilter}
        onChange={onNameFilterChange}
        onClear={() => onNameFilterChange("")}
        className="min-w-[200px]"
      />
      <SearchFilterInput
        id="employee-picker-firstname-filter"
        label="Vorname"
        value={firstNameFilter}
        onChange={onFirstNameFilterChange}
        onClear={() => onFirstNameFilterChange("")}
        className="min-w-[200px]"
      />
    </FilterPanel>
  );
}
