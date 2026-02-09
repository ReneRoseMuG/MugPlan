import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface ProjectTitleFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function ProjectTitleFilterInput({
  value,
  onChange,
  onClear,
  className,
}: ProjectTitleFilterInputProps) {
  return (
    <SearchFilterInput
      id="project-filter-title"
      label="Projekttitel"
      labelAdornment={<HelpIcon helpKey="projects.filter.title" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
