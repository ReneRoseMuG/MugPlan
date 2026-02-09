import { SearchFilterInput } from "@/components/ui/search-filter-input";

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
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
