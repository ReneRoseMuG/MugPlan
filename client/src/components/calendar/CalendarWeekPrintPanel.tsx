import { useQuery } from "@tanstack/react-query";
import type { Tour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CalendarWeekPrintPanelProps = {
  selectedTourId: number | null;
  onSelectedTourIdChange: (tourId: number | null) => void;
  weekCount: number;
  onWeekCountChange: (weekCount: number) => void;
  onOpenPreview: () => void;
};

export function CalendarWeekPrintPanel({
  selectedTourId,
  onSelectedTourIdChange,
  weekCount,
  onWeekCountChange,
  onOpenPreview,
}: CalendarWeekPrintPanelProps) {
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white px-4 py-3" data-testid="calendar-week-print-panel">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_140px_auto] md:items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Tour fuer Druck</Label>
          <Select
            value={selectedTourId !== null ? String(selectedTourId) : "none"}
            onValueChange={(value) => onSelectedTourIdChange(value === "none" ? null : Number(value))}
          >
            <SelectTrigger className="bg-white" data-testid="select-tour-print-preview">
              <SelectValue placeholder="Tour waehlen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Bitte waehlen</SelectItem>
              {tours.map((tour) => (
                <SelectItem key={tour.id} value={String(tour.id)}>
                  {tour.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Wochen</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={String(weekCount)}
            onChange={(event) => onWeekCountChange(Number(event.target.value))}
            data-testid="input-tour-print-week-count"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onOpenPreview}
          disabled={selectedTourId === null}
          data-testid="button-open-tour-print-preview"
        >
          Druckvorschau
        </Button>
      </div>
    </div>
  );
}
