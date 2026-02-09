import { ProjectStatusFilterInput } from "@/components/filters/project-status-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import type { ProjectStatus } from "@shared/schema";

interface ProjectFilterPanelProps {
  title: string;
  projectTitle: string;
  onProjectTitleChange: (value: string) => void;
  onProjectTitleClear: () => void;
  selectedStatuses: ProjectStatus[];
  availableStatuses: ProjectStatus[];
  statusPickerOpen: boolean;
  onStatusPickerOpenChange: (open: boolean) => void;
  onAddStatus: (statusId: number) => void;
  onRemoveStatus: (statusId: number) => void;
}

export function ProjectFilterPanel({
  title,
  projectTitle,
  onProjectTitleChange,
  onProjectTitleClear,
  selectedStatuses,
  availableStatuses,
  statusPickerOpen,
  onStatusPickerOpenChange,
  onAddStatus,
  onRemoveStatus,
}: ProjectFilterPanelProps) {
  return (
    <FilterPanel title={title} layout="row">
      <ProjectTitleFilterInput
        value={projectTitle}
        onChange={onProjectTitleChange}
        onClear={onProjectTitleClear}
        className="flex-1"
      />
      <ProjectStatusFilterInput
        selectedStatuses={selectedStatuses}
        availableStatuses={availableStatuses}
        isOpen={statusPickerOpen}
        onOpenChange={onStatusPickerOpenChange}
        onAddStatus={onAddStatus}
        onRemoveStatus={onRemoveStatus}
      />
    </FilterPanel>
  );
}
