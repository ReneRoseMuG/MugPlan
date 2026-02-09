import { ProjectStatusFilterInput } from "@/components/filters/project-status-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import type { ProjectStatus } from "@shared/schema";
import type { ProjectScope } from "@/lib/project-filters";

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
  projectScope: ProjectScope;
  onProjectScopeChange: (scope: ProjectScope) => void;
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
  projectScope,
  onProjectScopeChange,
}: ProjectFilterPanelProps) {
  const scopeSwitchId = "project-scope-no-appointments";

  return (
    <FilterPanel title={title} layout="row">
      <ProjectTitleFilterInput
        value={projectTitle}
        onChange={onProjectTitleChange}
        onClear={onProjectTitleClear}
        className="flex-1"
      />
      <div className="flex items-center gap-3 sm:h-9">
        <Label htmlFor={scopeSwitchId} className="text-xs font-semibold text-muted-foreground">
          Ohne Termine
        </Label>
        <Switch
          id={scopeSwitchId}
          checked={projectScope === "noAppointments"}
          onCheckedChange={(checked) => onProjectScopeChange(checked ? "noAppointments" : "upcoming")}
        />
      </div>
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
