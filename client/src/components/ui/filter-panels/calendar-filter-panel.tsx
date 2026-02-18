import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Label } from "@/components/ui/label";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
}

export function CalendarFilterPanel({
  employeeId,
  onEmployeeIdChange,
}: CalendarFilterPanelProps) {
  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div className="flex min-w-[220px] flex-col gap-1">
        <Label className="text-xs">Mitarbeiter</Label>
        <CalendarEmployeeFilter
          value={employeeId}
          onChange={onEmployeeIdChange}
        />
      </div>
    </FilterPanel>
  );
}
