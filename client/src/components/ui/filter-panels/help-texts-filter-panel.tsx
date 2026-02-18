import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";

interface HelpTextsFilterPanelProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function HelpTextsFilterPanel({
  searchQuery,
  onSearchQueryChange,
}: HelpTextsFilterPanelProps) {
  return (
    <FilterPanel title="Hilfetextfilter" layout="row">
      <SearchFilterInput
        id="helptexts-search"
        label="Schluessel oder Titel"
        value={searchQuery}
        onChange={onSearchQueryChange}
        onClear={() => onSearchQueryChange("")}
        className="w-64"
      />
    </FilterPanel>
  );
}
