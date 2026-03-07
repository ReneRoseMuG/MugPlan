import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Label } from "@/components/ui/label";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
  showWeekDisplayMode?: boolean;
}

export function CalendarFilterPanel({
  employeeId,
  onEmployeeIdChange,
  showWeekDisplayMode = false,
}: CalendarFilterPanelProps) {
  const { toast } = useToast();
  const { setSetting } = useSettings();
  const weekDisplayMode = useSetting("calendar.weekAppointmentDisplayMode");
  const userRole = window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER";
  const canEditWeekDisplayMode = userRole === "ADMIN" || userRole === "DISPATCHER";

  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div className="flex min-w-[220px] flex-col gap-1">
        <Label className="text-xs">Mitarbeiter</Label>
        <CalendarEmployeeFilter
          value={employeeId}
          onChange={onEmployeeIdChange}
        />
      </div>
      {showWeekDisplayMode ? (
        <div className="flex min-w-[220px] flex-col gap-1">
          <Label className="text-xs">Wochenmodus</Label>
          <Select
            value={weekDisplayMode ?? "standard"}
            onValueChange={(value: "standard" | "compact" | "detail") => {
              if (!canEditWeekDisplayMode) return;
              void setSetting({
                key: "calendar.weekAppointmentDisplayMode",
                scopeType: "USER",
                value,
              }).catch((error) => {
                console.error("[calendar-filter-panel] week display mode persist failed", error);
                toast({
                  title: "Wochenmodus konnte nicht gespeichert werden",
                  description: "Bitte erneut versuchen.",
                  variant: "destructive",
                });
              });
            }}
            disabled={!canEditWeekDisplayMode}
          >
            <SelectTrigger className="w-56 bg-white" data-testid="select-week-appointment-display-mode">
              <SelectValue placeholder="Wochenmodus wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="detail">Detail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </FilterPanel>
  );
}
