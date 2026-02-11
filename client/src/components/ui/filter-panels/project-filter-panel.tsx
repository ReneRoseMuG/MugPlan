import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { ProjectStatusFilterInput } from "@/components/filters/project-status-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";
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
  customerLastName: string;
  onCustomerLastNameChange: (value: string) => void;
  onCustomerLastNameClear: () => void;
  customerNumber: string;
  onCustomerNumberChange: (value: string) => void;
  onCustomerNumberClear: () => void;
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
  customerLastName,
  onCustomerLastNameChange,
  onCustomerLastNameClear,
  customerNumber,
  onCustomerNumberChange,
  onCustomerNumberClear,
  selectedStatuses,
  availableStatuses,
  statusPickerOpen,
  onStatusPickerOpenChange,
  onAddStatus,
  onRemoveStatus,
  projectScope,
  onProjectScopeChange,
}: ProjectFilterPanelProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <FilterPanel title={title} layout="row" showTitle>
        <ProjectTitleFilterInput
          value={projectTitle}
          onChange={onProjectTitleChange}
          onClear={onProjectTitleClear}
          className="flex-1"
        />
        <div className="flex flex-wrap items-center gap-3 sm:h-9">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="project-scope-upcoming" className="text-xs font-semibold text-muted-foreground">
                Aktuelle Projekte
              </Label>
              <HelpIcon helpKey="projects.filter.scope.upcoming" size="sm" />
            </div>
            <Switch
              id="project-scope-upcoming"
              checked={projectScope === "upcoming"}
              onCheckedChange={(checked) => {
                onProjectScopeChange(checked ? "upcoming" : "all");
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="project-scope-no-appointments" className="text-xs font-semibold text-muted-foreground">
                Ohne Termine
              </Label>
              <HelpIcon helpKey="projects.filter.scope.noAppointments" size="sm" />
            </div>
            <Switch
              id="project-scope-no-appointments"
              checked={projectScope === "noAppointments"}
              onCheckedChange={(checked) => {
                onProjectScopeChange(checked ? "noAppointments" : "all");
              }}
            />
          </div>
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

      <FilterPanel title="Kundenfilter" layout="row" showTitle>
        <CustomerNameFilterInput
          value={customerLastName}
          onChange={onCustomerLastNameChange}
          onClear={onCustomerLastNameClear}
          className="flex-1"
        />
        <CustomerNumberFilterInput
          value={customerNumber}
          onChange={onCustomerNumberChange}
          onClear={onCustomerNumberClear}
          className="flex-1"
        />
      </FilterPanel>
    </div>
  );
}
