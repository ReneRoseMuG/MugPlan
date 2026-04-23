import type { Tour } from "@shared/schema";
import {
  MONITORING_TRIGGER_CODES,
  MONITORING_TRIGGER_NAMES,
  type MonitoringTriggerCode,
} from "@shared/monitoring";
import { CustomerNameFilterInput } from "@/components/filters/customer-name-filter-input";
import { CustomerNumberFilterInput } from "@/components/filters/customer-number-filter-input";
import { ProjectOrderNumberFilterInput } from "@/components/filters/project-order-number-filter-input";
import { ProjectTitleFilterInput } from "@/components/filters/project-title-filter-input";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MonitoringFilters } from "@/lib/monitoring-filters";
import { sortToursForDisplay } from "@/lib/tourDisplayOrder";

interface MonitoringFilterPanelProps {
  filters: MonitoringFilters;
  onChange: (patch: Partial<MonitoringFilters>) => void;
  tours: Tour[];
}

export function MonitoringFilterPanel({
  filters,
  onChange,
  tours,
}: MonitoringFilterPanelProps) {
  const sortedTours = sortToursForDisplay(tours);

  return (
    <div className="flex w-full flex-col gap-4">
      <FilterPanel title="Monitoringfilter" layout="row">
        <CustomerNameFilterInput
          id="monitoring-filter-customer-last-name"
          value={filters.customerLastName}
          onChange={(value) => onChange({ customerLastName: value })}
          onClear={() => onChange({ customerLastName: "" })}
          label="Nachname Kunde"
          helpKey="appointments.filter.customerLastName"
          maxLength={18}
          className="w-full sm:min-w-[10rem] sm:max-w-[18ch]"
        />
        <CustomerNumberFilterInput
          id="monitoring-filter-customer-number"
          value={filters.customerNumber}
          onChange={(value) => onChange({ customerNumber: value })}
          onClear={() => onChange({ customerNumber: "" })}
          label="Kunde Nr."
          placeholderLabel="Nr."
          helpKey="appointments.filter.customerNumber"
          numericOnly={false}
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
        />
        <ProjectTitleFilterInput
          id="monitoring-filter-project-title"
          value={filters.projectTitle}
          onChange={(value) => onChange({ projectTitle: value })}
          onClear={() => onChange({ projectTitle: "" })}
          label="Projektname"
          helpKey="appointments.filter.projectName"
          maxLength={18}
          className="w-full sm:min-w-[10rem] sm:max-w-[18ch]"
        />
        <ProjectOrderNumberFilterInput
          id="monitoring-filter-order-number"
          value={filters.orderNumber}
          onChange={(value) => onChange({ orderNumber: value })}
          onClear={() => onChange({ orderNumber: "" })}
          label="Auftrag Nr."
          placeholderLabel="Nr."
          helpKey="appointments.filter.orderNumber"
          className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"
        />
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
              {sortedTours.map((tour) => (
                <SelectItem key={tour.id} value={String(tour.id)}>
                  {tour.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[170px] flex-col gap-1">
          <div className="flex min-h-5 items-center">
            <Label className="text-xs">Trigger</Label>
          </div>
          <Select
            value={filters.triggerCode ?? "all"}
            onValueChange={(value) => onChange({
              triggerCode: value === "all" ? undefined : value as MonitoringTriggerCode,
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Trigger</SelectItem>
              {MONITORING_TRIGGER_CODES.map((triggerCode) => (
                <SelectItem key={triggerCode} value={triggerCode}>
                  {MONITORING_TRIGGER_NAMES[triggerCode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>
    </div>
  );
}
