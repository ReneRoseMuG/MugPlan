import { useQuery } from "@tanstack/react-query";
import type { Tour } from "@shared/schema";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
  showWeekDisplayMode?: boolean;
  selectedPrintTourId?: number | null;
  onSelectedPrintTourIdChange?: (tourId: number | null) => void;
  printWeekCount?: number;
  onPrintWeekCountChange?: (weekCount: number) => void;
  onOpenPrintPreview?: () => void;
}

export function CalendarFilterPanel({
  employeeId,
  onEmployeeIdChange,
  showWeekDisplayMode = false,
  selectedPrintTourId,
  onSelectedPrintTourIdChange,
  printWeekCount,
  onPrintWeekCountChange,
  onOpenPrintPreview,
}: CalendarFilterPanelProps) {
  const { toast } = useToast();
  const { setSetting } = useSettings();
  const weekDisplayMode = useSetting("calendar.weekAppointmentDisplayMode");
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const userRole = window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER";
  const canEditWeekDisplayMode = userRole === "ADMIN" || userRole === "DISPATCHER";
  const showWeekPrintControls =
    showWeekDisplayMode &&
    typeof onSelectedPrintTourIdChange === "function" &&
    typeof onPrintWeekCountChange === "function" &&
    typeof onOpenPrintPreview === "function" &&
    typeof printWeekCount === "number";

  if (showWeekDisplayMode && showWeekPrintControls) {
    return (
      <FilterPanel title="Kalenderfilter" layout="stack">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-xs">Mitarbeiter</Label>
              <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-xs">Darstellungsmodus</Label>
              <Select
                value={weekDisplayMode ?? "standard"}
                onValueChange={(value: "standard" | "compact" | "detail" | "split") => {
                  if (!canEditWeekDisplayMode) return;
                  void setSetting({
                    key: "calendar.weekAppointmentDisplayMode",
                    scopeType: "USER",
                    value,
                  }).catch((error) => {
                    console.error("[calendar-filter-panel] week display mode persist failed", error);
                    toast({
                      title: "Darstellungsmodus konnte nicht gespeichert werden",
                      description: "Bitte erneut versuchen.",
                      variant: "destructive",
                    });
                  });
                }}
                disabled={!canEditWeekDisplayMode}
              >
                <SelectTrigger className="w-56 bg-white" data-testid="select-week-appointment-display-mode">
                  <SelectValue placeholder="Darstellungsmodus wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="compact">Zentriert</SelectItem>
                  <SelectItem value="detail">Gefüllt</SelectItem>
                  <SelectItem value="split">Geteilt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1 lg:justify-self-end">
            <Label className="text-xs">Wochenplanung drucken</Label>
            <div className="flex items-end gap-3">
              <Select
                value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
                onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
              >
                <SelectTrigger className="w-[10ch] bg-white" data-testid="select-tour-print-preview">
                  <SelectValue placeholder="Tour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tour</SelectItem>
                  <SelectItem value="0">Ohne Tour</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={String(tour.id)}>
                      {tour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex w-[10ch] flex-col gap-1">
                <Label className="text-xs">Wochen</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={String(printWeekCount)}
                  onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
                  data-testid="input-tour-print-week-count"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={onOpenPrintPreview}
                disabled={selectedPrintTourId === null}
                data-testid="button-open-tour-print-preview"
              >
                Drucken
              </Button>
            </div>
          </div>
        </div>
      </FilterPanel>
    );
  }

  return (
    <FilterPanel title="Kalenderfilter" layout="row">
      <div className="flex min-w-[220px] flex-col gap-1">
        <Label className="text-xs">Mitarbeiter</Label>
        <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
      </div>
      {showWeekDisplayMode ? (
        <div className="flex min-w-[220px] flex-col gap-1">
          <Label className="text-xs">Darstellungsmodus</Label>
          <Select
            value={weekDisplayMode ?? "standard"}
            onValueChange={(value: "standard" | "compact" | "detail" | "split") => {
              if (!canEditWeekDisplayMode) return;
              void setSetting({
                key: "calendar.weekAppointmentDisplayMode",
                scopeType: "USER",
                value,
              }).catch((error) => {
                console.error("[calendar-filter-panel] week display mode persist failed", error);
                toast({
                  title: "Darstellungsmodus konnte nicht gespeichert werden",
                  description: "Bitte erneut versuchen.",
                  variant: "destructive",
                });
              });
            }}
            disabled={!canEditWeekDisplayMode}
          >
            <SelectTrigger className="w-56 bg-white" data-testid="select-week-appointment-display-mode">
              <SelectValue placeholder="Darstellungsmodus wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="compact">Zentriert</SelectItem>
              <SelectItem value="detail">Gefüllt</SelectItem>
              <SelectItem value="split">Geteilt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {showWeekPrintControls ? (
        <div className="flex min-w-[220px] flex-col gap-1">
          <Label className="text-xs">Wochenplanung drucken</Label>
          <Select
            value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
            onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
          >
            <SelectTrigger className="w-[10ch] bg-white" data-testid="select-tour-print-preview">
              <SelectValue placeholder="Tour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tour</SelectItem>
              <SelectItem value="0">Ohne Tour</SelectItem>
              {tours.map((tour) => (
                <SelectItem key={tour.id} value={String(tour.id)}>
                  {tour.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {showWeekPrintControls ? (
        <div className="flex w-[10ch] flex-col gap-1">
          <Label className="text-xs">Wochen</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={String(printWeekCount)}
            onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
            data-testid="input-tour-print-week-count"
          />
        </div>
      ) : null}
      {showWeekPrintControls ? (
        <Button
          type="button"
          variant="outline"
          onClick={onOpenPrintPreview}
          disabled={selectedPrintTourId === null}
          data-testid="button-open-tour-print-preview"
        >
          Drucken
        </Button>
      ) : null}
    </FilterPanel>
  );
}
