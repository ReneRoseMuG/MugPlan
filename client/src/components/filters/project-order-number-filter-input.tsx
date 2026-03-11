import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface ProjectOrderNumberFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  label?: string;
  placeholderLabel?: string;
  maxLength?: number;
}

export function ProjectOrderNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
  label = "Auftragsnummer",
  placeholderLabel,
  maxLength,
}: ProjectOrderNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id="project-filter-order-number"
      label={label}
      placeholderLabel={placeholderLabel}
      labelAdornment={<HelpIcon helpKey="projects.filter.orderNumber" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      maxLength={maxLength}
      className={className}
    />
  );
}
