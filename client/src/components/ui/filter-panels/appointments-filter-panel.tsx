import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer, Employee, Project, Tour } from "@shared/schema";

export type AppointmentListFilters = {
  employeeId?: number;
  projectId?: number;
  customerId?: number;
  tourId?: number;
  dateFrom?: string;
  dateTo?: string;
};

interface AppointmentsFilterPanelProps {
  filters: AppointmentListFilters;
  onChange: (patch: Partial<AppointmentListFilters>) => void;
  showAllAppointments: boolean;
  onShowAllAppointmentsChange: (checked: boolean) => void;
  showAllAppointmentsHelpKey?: string;
  employees: Employee[];
  projects: Project[];
  customers: Customer[];
  tours: Tour[];
  hideEmployeeFilter?: boolean;
  hideTourFilter?: boolean;
}

export function AppointmentsFilterPanel({
  filters,
  onChange,
  showAllAppointments,
  onShowAllAppointmentsChange,
  showAllAppointmentsHelpKey,
  employees,
  projects,
  customers,
  tours,
  hideEmployeeFilter = false,
  hideTourFilter = false,
}: AppointmentsFilterPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <FilterPanel title="Terminfilter" layout="row">
        {!hideEmployeeFilter && (
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Mitarbeiter</Label>
            <Select
              value={filters.employeeId ? String(filters.employeeId) : "all"}
              onValueChange={(value) => onChange({ employeeId: value === "all" ? undefined : Number(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex min-w-[180px] flex-col gap-1">
          <Label className="text-xs">Projekt</Label>
          <Select
            value={filters.projectId ? String(filters.projectId) : "all"}
            onValueChange={(value) => onChange({ projectId: value === "all" ? undefined : Number(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Projekte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Projekte</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[180px] flex-col gap-1">
          <Label className="text-xs">Kunde</Label>
          <Select
            value={filters.customerId ? String(filters.customerId) : "all"}
            onValueChange={(value) => onChange({ customerId: value === "all" ? undefined : Number(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Kunden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={String(customer.id)}>
                  {customer.fullName} (K: {customer.customerNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hideTourFilter && (
          <div className="flex min-w-[150px] flex-col gap-1">
            <Label className="text-xs">Tour</Label>
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
        )}
      </FilterPanel>

      <FilterPanel title="Datums- und Statusfilter" layout="row">
        <div className="flex min-w-[160px] flex-col gap-1">
          <Label htmlFor="appointments-date-from" className="text-xs">Datum von</Label>
          <Input
            id="appointments-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          />
        </div>

        <div className="flex min-w-[160px] flex-col gap-1">
          <Label htmlFor="appointments-date-to" className="text-xs">Datum bis</Label>
          <Input
            id="appointments-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          />
        </div>
        <div className="flex min-w-[160px] flex-col gap-1">
          <div className="flex items-center gap-1 min-h-5">
            <Label htmlFor="appointments-show-all" className="text-xs font-semibold text-muted-foreground">
              Alle Termine
            </Label>
            {showAllAppointmentsHelpKey ? <HelpIcon helpKey={showAllAppointmentsHelpKey} size="sm" /> : null}
          </div>
          <Switch
            id="appointments-show-all"
            checked={showAllAppointments}
            onCheckedChange={onShowAllAppointmentsChange}
          />
        </div>
      </FilterPanel>
    </div>
  );
}
