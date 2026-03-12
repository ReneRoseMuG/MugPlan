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
  id?: string;
  helpKey?: string;
}

export function ProjectOrderNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
  label = "Auftrag Nr.",
  placeholderLabel,
  maxLength,
  id = "project-filter-order-number",
  helpKey = "projects.filter.orderNumber",
}: ProjectOrderNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id={id}
      label={label}
      placeholderLabel={placeholderLabel}
      labelAdornment={<HelpIcon helpKey={helpKey} size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      maxLength={maxLength}
      className={className}
    />
  );
}
