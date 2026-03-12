import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface ProjectTitleFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  maxLength?: number;
  id?: string;
  label?: string;
  helpKey?: string;
}

export function ProjectTitleFilterInput({
  value,
  onChange,
  onClear,
  className,
  maxLength,
  id = "project-filter-title",
  label = "Projektname",
  helpKey = "projects.filter.projectName",
}: ProjectTitleFilterInputProps) {
  return (
    <SearchFilterInput
      id={id}
      label={label}
      labelAdornment={<HelpIcon helpKey={helpKey} size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      maxLength={maxLength}
      className={className}
    />
  );
}
