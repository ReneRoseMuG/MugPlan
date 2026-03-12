import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { CustomerInactiveScopeFilterInput } from "@/components/filters/customer-inactive-scope-filter-input";
import { TagFilterInput } from "@/components/filters/tag-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import type { Tag } from "@shared/schema";

interface CustomerFilterPanelProps {
  title: string;
  customerLastName: string;
  onCustomerLastNameChange: (value: string) => void;
  onCustomerLastNameClear: () => void;
  customerNumber: string;
  onCustomerNumberChange: (value: string) => void;
  onCustomerNumberClear: () => void;
  selectedTags: Tag[];
  availableTags: Tag[];
  tagPickerOpen: boolean;
  onTagPickerOpenChange: (open: boolean) => void;
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
  customerScope?: "active" | "inactive";
  onCustomerScopeChange?: (scope: "active" | "inactive") => void;
}

export function CustomerFilterPanel({
  title,
  customerLastName,
  onCustomerLastNameChange,
  onCustomerLastNameClear,
  customerNumber,
  onCustomerNumberChange,
  onCustomerNumberClear,
  selectedTags,
  availableTags,
  tagPickerOpen,
  onTagPickerOpenChange,
  onAddTag,
  onRemoveTag,
  customerScope,
  onCustomerScopeChange,
}: CustomerFilterPanelProps) {
  return (
    <FilterPanel title={title} layout="row">
      {customerScope && onCustomerScopeChange ? (
        <CustomerInactiveScopeFilterInput
          customerScope={customerScope}
          onCustomerScopeChange={onCustomerScopeChange}
          className="w-full sm:w-auto sm:min-w-32"
        />
      ) : null}
      <CustomerNameFilterInput
        value={customerLastName}
        onChange={onCustomerLastNameChange}
        onClear={onCustomerLastNameClear}
        className="w-full sm:min-w-[12rem] sm:max-w-[18ch]"
        label="Nachname Kunde"
        helpKey="customers.filter.lastName"
      />
      <CustomerNumberFilterInput
        value={customerNumber}
        onChange={onCustomerNumberChange}
        onClear={onCustomerNumberClear}
        className="w-full sm:min-w-[8rem] sm:max-w-[12ch]"
        label="Kunde Nr."
        placeholderLabel="Nr."
        maxLength={12}
        helpKey="customers.filter.customerNumber"
      />
      <TagFilterInput
        selectedTags={selectedTags}
        availableTags={availableTags}
        isOpen={tagPickerOpen}
        onOpenChange={onTagPickerOpenChange}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        helpKey="customers.filter.tags"
        addButtonTestId="button-add-customer-tag-filter"
        testIdPrefix="customer-filter-tag"
      />
    </FilterPanel>
  );
}
