import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface ProjectOrderNumberFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function ProjectOrderNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
}: ProjectOrderNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id="project-filter-order-number"
      label="Auftragsnummer"
      labelAdornment={<HelpIcon helpKey="projects.filter.orderNumber" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
