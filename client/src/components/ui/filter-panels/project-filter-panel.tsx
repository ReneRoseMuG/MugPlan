import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { ProjectOrderNumberFilterInput } from "@/components/filters/project-order-number-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { TagFilterInput } from "@/components/filters/tag-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Tag } from "@shared/schema";
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
          className="w-full sm:min-w-[11rem] sm:max-w-[18ch]"
          helpKey="projects.filter.projectName"
        />
        <CustomerNameFilterInput
          value={customerLastName}
          onChange={onCustomerLastNameChange}
          onClear={onCustomerLastNameClear}
          maxLength={20}
          className="w-full sm:min-w-[11rem] sm:max-w-[18ch]"
          label="Nachname Kunde"
          helpKey="projects.filter.customerLastName"
        />
        <CustomerNumberFilterInput
          value={customerNumber}
          onChange={onCustomerNumberChange}
          onClear={onCustomerNumberClear}
          placeholderLabel="Nr."
          maxLength={8}
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
          label="Kunde Nr."
          helpKey="projects.filter.customerNumber"
        />
        <ProjectOrderNumberFilterInput
          value={orderNumber}
          onChange={onOrderNumberChange}
          onClear={onOrderNumberClear}
          placeholderLabel="Nr."
          maxLength={8}
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
          label="Auftrag Nr."
          helpKey="projects.filter.orderNumber"
        />
        <div className="flex w-full min-w-[20rem] flex-col gap-1">
          <div className="flex min-h-5 items-center gap-1">
            <HelpIcon helpKey="projects.filter.scope.all" size="sm" />
            <Label className="text-xs">Projekte</Label>
          </div>
          <ToggleGroup
            type="single"
            value={projectScope}
            onValueChange={(value) => {
              if (value === "all" || value === "upcoming" || value === "noAppointments") {
                onProjectScopeChange(value);
              }
            }}
            variant="outline"
            size="sm"
            className="flex w-full flex-wrap justify-start"
            data-testid="toggle-project-scope"
          >
            <ToggleGroupItem value="all" data-testid="toggle-project-scope-all">
              Alle Projekte
            </ToggleGroupItem>
            <ToggleGroupItem value="upcoming" data-testid="toggle-project-scope-upcoming">
              Geplante Projekte
            </ToggleGroupItem>
            <ToggleGroupItem value="noAppointments" data-testid="toggle-project-scope-no-appointments">
              Projekte ohne Termin
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
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
          className="sm:min-w-[96px] sm:w-[96px]"
        />
      </FilterPanel>
    </div>
  );
}
