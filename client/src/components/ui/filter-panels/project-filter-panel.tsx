import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { ProjectOrderNumberFilterInput } from "@/components/filters/project-order-number-filter-input";
import { ProjectStatusFilterInput } from "@/components/filters/project-status-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { TagFilterInput } from "@/components/filters/tag-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import type { ProjectStatus, Tag } from "@shared/schema";
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
  orderNumber: string;
  onOrderNumberChange: (value: string) => void;
  onOrderNumberClear: () => void;
  selectedStatuses: ProjectStatus[];
  availableStatuses: ProjectStatus[];
  statusPickerOpen: boolean;
  onStatusPickerOpenChange: (open: boolean) => void;
  onAddStatus: (statusId: number) => void;
  onRemoveStatus: (statusId: number) => void;
  selectedTags: Tag[];
  availableTags: Tag[];
  tagPickerOpen: boolean;
  onTagPickerOpenChange: (open: boolean) => void;
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
  projectScope: ProjectScope;
  onProjectScopeChange: (scope: ProjectScope) => void;
}

export function ProjectFilterPanel({
  title: _title,
  projectTitle,
  onProjectTitleChange,
  onProjectTitleClear,
  customerLastName,
  onCustomerLastNameChange,
  onCustomerLastNameClear,
  customerNumber,
  onCustomerNumberChange,
  onCustomerNumberClear,
  orderNumber,
  onOrderNumberChange,
  onOrderNumberClear,
  selectedStatuses,
  availableStatuses,
  statusPickerOpen,
  onStatusPickerOpenChange,
  onAddStatus,
  onRemoveStatus,
  selectedTags,
  availableTags,
  tagPickerOpen,
  onTagPickerOpenChange,
  onAddTag,
  onRemoveTag,
  projectScope,
  onProjectScopeChange,
}: ProjectFilterPanelProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <FilterPanel title="Projektfilter" layout="row">
        <ProjectTitleFilterInput
          value={projectTitle}
          onChange={onProjectTitleChange}
          onClear={onProjectTitleClear}
          maxLength={20}
          className="w-full sm:min-w-[12rem] sm:max-w-[20ch]"
        />
        <CustomerNameFilterInput
          value={customerLastName}
          onChange={onCustomerLastNameChange}
          onClear={onCustomerLastNameClear}
          maxLength={20}
          className="w-full sm:min-w-[12rem] sm:max-w-[20ch]"
        />
          <CustomerNumberFilterInput
            value={customerNumber}
            onChange={onCustomerNumberChange}
            onClear={onCustomerNumberClear}
            placeholderLabel="Nr."
            maxLength={8}
            className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
          />
          <ProjectOrderNumberFilterInput
            value={orderNumber}
            onChange={onOrderNumberChange}
            onClear={onOrderNumberClear}
            placeholderLabel="Nr."
            maxLength={8}
            className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
          />
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-[150px] flex-col gap-1">
            <div className="flex items-center gap-1 min-h-5">
              <Label htmlFor="project-scope-all" className="text-xs font-semibold text-muted-foreground">
                Alle Projekte
              </Label>
              <HelpIcon helpKey="projects.filter.scope.upcoming" size="sm" />
            </div>
            <Switch
              id="project-scope-all"
              checked={projectScope === "all"}
              onCheckedChange={(checked) => {
                onProjectScopeChange(checked ? "all" : "upcoming");
              }}
            />
          </div>
          <div className="flex min-w-[150px] flex-col gap-1">
            <div className="flex items-center gap-1 min-h-5">
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
        <TagFilterInput
          selectedTags={selectedTags}
          availableTags={availableTags}
          isOpen={tagPickerOpen}
          onOpenChange={onTagPickerOpenChange}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          helpKey="projects.filter.tags"
          addButtonTestId="button-add-project-tag-filter"
          testIdPrefix="project-filter-tag"
        />
      </FilterPanel>
    </div>
  );
}
