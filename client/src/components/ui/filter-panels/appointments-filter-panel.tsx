import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TagFilterInput } from "@/components/filters/tag-filter-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Tag, Tour } from "@shared/schema";
import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { ProjectOrderNumberFilterInput } from "@/components/filters/project-order-number-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";

export type AppointmentListFilters = {
  employeeId?: number;
  projectTitle: string;
  customerLastName: string;
  customerNumber: string;
  orderNumber: string;
  tagIds: number[];
  tourId?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type AppointmentListScope = "all" | "planned";

interface AppointmentsFilterPanelProps {
  filters: AppointmentListFilters;
  onChange: (patch: Partial<AppointmentListFilters>) => void;
  appointmentScope: AppointmentListScope;
  onAppointmentScopeChange: (scope: AppointmentListScope) => void;
  appointmentScopeHelpKey?: string;
  tours: Tour[];
  selectedTags: Tag[];
  availableTags: Tag[];
  tagPickerOpen: boolean;
  onTagPickerOpenChange: (open: boolean) => void;
  hideTourFilter?: boolean;
  splitDateRangeRow?: boolean;
}

export function AppointmentsFilterPanel({
  filters,
  onChange,
  appointmentScope,
  onAppointmentScopeChange,
  appointmentScopeHelpKey,
  tours,
  selectedTags,
  availableTags,
  tagPickerOpen,
  onTagPickerOpenChange,
  hideTourFilter = false,
  splitDateRangeRow = false,
}: AppointmentsFilterPanelProps) {
  const dateRangeFilters = (
    <>
      <div className="flex min-w-[150px] flex-col gap-1">
        <div className="flex min-h-5 items-center gap-1">
          <HelpIcon helpKey="appointments.filter.dateFrom" size="sm" />
          <Label htmlFor="appointments-date-from" className="text-xs">Datum von</Label>
        </div>
        <Input
          id="appointments-date-from"
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
        />
      </div>
      <div className="flex min-w-[150px] flex-col gap-1">
        <div className="flex min-h-5 items-center gap-1">
          <HelpIcon helpKey="appointments.filter.dateTo" size="sm" />
          <Label htmlFor="appointments-date-to" className="text-xs">Datum bis</Label>
        </div>
        <Input
          id="appointments-date-to"
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
        />
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterPanel title="Terminfilter" layout="row">
        <ProjectTitleFilterInput
          id="appointments-filter-project-title"
          value={filters.projectTitle}
          onChange={(value) => onChange({ projectTitle: value })}
          onClear={() => onChange({ projectTitle: "" })}
          label="Projektname"
          helpKey="appointments.filter.projectName"
          maxLength={18}
          className="w-full sm:min-w-[10rem] sm:max-w-[18ch]"
        />
        <CustomerNameFilterInput
          id="appointments-filter-customer-last-name"
          value={filters.customerLastName}
          onChange={(value) => onChange({ customerLastName: value })}
          onClear={() => onChange({ customerLastName: "" })}
          label="Nachname Kunde"
          helpKey="appointments.filter.customerLastName"
          maxLength={18}
          className="w-full sm:min-w-[10rem] sm:max-w-[18ch]"
        />
        <CustomerNumberFilterInput
          id="appointments-filter-customer-number"
          value={filters.customerNumber}
          onChange={(value) => onChange({ customerNumber: value })}
          onClear={() => onChange({ customerNumber: "" })}
          label="Kunde Nr."
          placeholderLabel="Nr."
          helpKey="appointments.filter.customerNumber"
          maxLength={8}
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
        />
        <ProjectOrderNumberFilterInput
          id="appointments-filter-order-number"
          value={filters.orderNumber}
          onChange={(value) => onChange({ orderNumber: value })}
          onClear={() => onChange({ orderNumber: "" })}
          label="Auftrag Nr."
          placeholderLabel="Nr."
          helpKey="appointments.filter.orderNumber"
          maxLength={8}
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
        />
        {!hideTourFilter ? (
          <div className="flex min-w-[150px] flex-col gap-1">
            <div className="flex min-h-5 items-center gap-1">
              <HelpIcon helpKey="appointments.filter.tour" size="sm" />
              <Label className="text-xs">Tour</Label>
            </div>
            <Select
              value={filters.tourId ? String(filters.tourId) : "all"}
              onValueChange={(value) => onChange({ tourId: value === "all" ? undefined : Number(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle Touren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Touren</SelectItem>
                {tours.map((tour) => (
                  <SelectItem key={tour.id} value={String(tour.id)}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="flex w-full min-w-[18rem] flex-col gap-1">
          <div className="flex min-h-5 items-center gap-1">
            {appointmentScopeHelpKey ? <HelpIcon helpKey={appointmentScopeHelpKey} size="sm" /> : null}
            <Label className="text-xs">Termine</Label>
          </div>
          <ToggleGroup
            type="single"
            value={appointmentScope}
            onValueChange={(value) => {
              if (value === "all" || value === "planned") {
                onAppointmentScopeChange(value);
              }
            }}
            variant="outline"
            size="sm"
            className="flex w-full flex-wrap justify-start"
            data-testid="toggle-appointments-scope"
          >
            <ToggleGroupItem value="all" data-testid="toggle-appointments-scope-all">
              Alle Termine
            </ToggleGroupItem>
            <ToggleGroupItem value="planned" data-testid="toggle-appointments-scope-planned">
              Geplante Termine
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <TagFilterInput
          selectedTags={selectedTags}
          availableTags={availableTags}
          isOpen={tagPickerOpen}
          onOpenChange={onTagPickerOpenChange}
          onAddTag={(tagId) => onChange({ tagIds: [...filters.tagIds, tagId] })}
          onRemoveTag={(tagId) => onChange({ tagIds: filters.tagIds.filter((id) => id !== tagId) })}
          helpKey="appointments.filter.tags"
          addButtonTestId="button-add-appointment-tag-filter"
          testIdPrefix="appointment-filter-tag"
          className="sm:min-w-[96px] sm:w-[96px]"
        />
        {!splitDateRangeRow ? dateRangeFilters : null}
      </FilterPanel>
      {splitDateRangeRow ? (
        <FilterPanel title="Terminfilter Datum" layout="row">
          {dateRangeFilters}
        </FilterPanel>
      ) : null}
    </div>
  );
}
