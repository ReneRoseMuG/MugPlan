import React from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import type { Tour } from "@shared/schema";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CalendarFilterPanelProps {
  employeeId: number | null;
  onEmployeeIdChange: (employeeId: number | null) => void;
  showWeekDisplayMode?: boolean;
  selectedPrintTourId?: number | null;
  onSelectedPrintTourIdChange?: (tourId: number | null) => void;
  printWeekCount?: number;
  onPrintWeekCountChange?: (weekCount: number) => void;
  onOpenPrintPreview?: () => void;
  printStartNextWeek?: boolean;
  onPrintStartNextWeekChange?: (value: boolean) => void;
}

function buildStartDateTitle(nextWeek: boolean): string {
  return nextWeek ? "Startet nächste Woche" : "Start diese Woche";
}

function buildStartDateValue(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return format(targetMonday, "EEE dd.MM.yyyy", { locale: de });
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
  printStartNextWeek = false,
  onPrintStartNextWeekChange,
}: CalendarFilterPanelProps) {
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const showWeekPrintControls =
    showWeekDisplayMode &&
    typeof onSelectedPrintTourIdChange === "function" &&
    typeof onPrintWeekCountChange === "function" &&
    typeof onOpenPrintPreview === "function" &&
    typeof printWeekCount === "number";

  const startDateTitle = buildStartDateTitle(printStartNextWeek);
  const startDateValue = buildStartDateValue(printStartNextWeek);

  if (showWeekDisplayMode && showWeekPrintControls) {
    return (
      <FilterPanel title="Kalenderfilter" layout="stack">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="text-xs">Mitarbeiter</Label>
            <CalendarEmployeeFilter value={employeeId} onChange={onEmployeeIdChange} />
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 shadow-sm lg:justify-self-end">
            <div className="mb-3">
              <Label className="text-xs font-semibold text-primary">Wochenplanung drucken</Label>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Label className="text-xs">Tour</Label>
                <Select
                  value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
                  onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
                >
                  <SelectTrigger className="w-[12ch] bg-white" data-testid="select-tour-print-preview">
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

              <div className="flex w-[14ch] flex-col gap-1">
                <Label className="text-xs">Anzahl Wochen</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={String(printWeekCount)}
                  onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
                  data-testid="input-tour-print-week-count"
                />
              </div>

              {typeof onPrintStartNextWeekChange === "function" ? (
                <div className="flex min-w-0 flex-col gap-1">
                  <Label className="text-xs" data-testid="label-print-start-title">
                    {startDateTitle}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printStartNextWeek}
                      onCheckedChange={onPrintStartNextWeekChange}
                      data-testid="switch-print-start-next-week"
                    />
                    <span className="text-xs text-muted-foreground" data-testid="label-print-start-date">
                      {startDateValue}
                    </span>
                  </div>
                </div>
              ) : null}

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
      {showWeekPrintControls ? (
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 shadow-sm">
          <div className="mb-3">
            <Label className="text-xs font-semibold text-primary">Wochenplanung drucken</Label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-xs">Tour</Label>
              <Select
                value={selectedPrintTourId !== null ? String(selectedPrintTourId) : "none"}
                onValueChange={(value) => onSelectedPrintTourIdChange(value === "none" ? null : Number(value))}
              >
                <SelectTrigger className="w-[12ch] bg-white" data-testid="select-tour-print-preview">
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
            <div className="flex w-[14ch] flex-col gap-1">
              <Label className="text-xs">Anzahl Wochen</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={String(printWeekCount)}
                onChange={(event) => onPrintWeekCountChange(Number(event.target.value))}
                data-testid="input-tour-print-week-count"
              />
            </div>
            {showWeekPrintControls && typeof onPrintStartNextWeekChange === "function" ? (
              <div className="flex min-w-0 flex-col gap-1">
                <Label className="text-xs" data-testid="label-print-start-title">
                  {startDateTitle}
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={printStartNextWeek}
                    onCheckedChange={onPrintStartNextWeekChange}
                    data-testid="switch-print-start-next-week"
                  />
                  <span className="text-xs text-muted-foreground" data-testid="label-print-start-date">
                    {startDateValue}
                  </span>
                </div>
              </div>
            ) : null}
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
      ) : null}
    </FilterPanel>
  );
}
