import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useAdminCalendarMarkers,
  useCreateCalendarMarker,
  useDeleteCalendarMarker,
  useUpdateCalendarMarker,
  type CalendarMarker,
  type CalendarMarkerWriteInput,
} from "@/lib/calendar-markers";
import { formatDisplayDate } from "@/lib/date-display-format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CalendarMarkerFormState = {
  id: string | null;
  version: number | null;
  date: string;
  endDate: string;
  name: string;
  type: "company_holiday" | "company_vacation" | "public_holiday";
  source: "admin" | "automatic";
  scope: "company" | "national" | "regional";
  states: string[];
  active: boolean;
  note: string;
};

const germanStates = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
];

const emptyForm: CalendarMarkerFormState = {
  id: null,
  version: null,
  date: "",
  endDate: "",
  name: "",
  type: "company_holiday",
  source: "admin",
  scope: "company",
  states: [],
  active: true,
  note: "",
};

function markerTypeLabel(type: CalendarMarker["type"]): string {
  if (type === "company_vacation") return "Betriebsferien";
  if (type === "company_holiday") return "Betriebsfeiertag";
  return "Feiertag";
}

function markerSourceLabel(source: CalendarMarker["source"]): string {
  return source === "automatic" ? "Automatik" : "Admin";
}

function markerScopeLabel(marker: CalendarMarker): string {
  if (marker.scope === "company") return "Firma";
  if (marker.scope === "national") return "Bund";
  return marker.states.join(", ");
}

function toForm(marker: CalendarMarker): CalendarMarkerFormState {
  return {
    id: marker.id,
    version: marker.version,
    date: marker.date,
    endDate: marker.endDate ?? "",
    name: marker.name,
    type: marker.type,
    source: marker.source,
    scope: marker.scope,
    states: marker.states,
    active: marker.active,
    note: marker.note ?? "",
  };
}

function toWriteInput(form: CalendarMarkerFormState): CalendarMarkerWriteInput {
  return {
    date: form.date,
    endDate: form.type === "company_vacation" ? form.endDate : null,
    name: form.name.trim(),
    type: form.type,
    source: form.source,
    scope: form.scope,
    states: form.scope === "regional" ? form.states as CalendarMarkerWriteInput["states"] : [],
    active: form.active,
    note: form.note.trim() || null,
  };
}

export function CalendarMarkersAdminPage() {
  const { toast } = useToast();
  const { data: markers = [], isLoading } = useAdminCalendarMarkers();
  const createMutation = useCreateCalendarMarker();
  const updateMutation = useUpdateCalendarMarker();
  const deleteMutation = useDeleteCalendarMarker();
  const [form, setForm] = useState<CalendarMarkerFormState>(emptyForm);

  const sortedMarkers = useMemo(
    () => [...markers].sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)),
    [markers],
  );

  const resetForm = () => setForm(emptyForm);

  const submit = () => {
    const input = toWriteInput(form);
    if (!form.id) {
      createMutation.mutate(input, {
        onSuccess: resetForm,
        onError: (error) => toast({ title: error.message, variant: "destructive" }),
      });
      return;
    }
    updateMutation.mutate({
      id: form.id,
      input: {
        ...input,
        version: form.version ?? 1,
      },
    }, {
      onSuccess: resetForm,
      onError: (error) => toast({ title: error.message, variant: "destructive" }),
    });
  };

  const toggleState = (state: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      states: checked
        ? Array.from(new Set([...current.states, state])).sort()
        : current.states.filter((entry) => entry !== state),
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-3 border-b border-border/50 pb-4 md:grid-cols-[160px_160px_minmax(180px,1fr)_180px_120px]">
        <div className="space-y-1.5">
          <Label htmlFor="calendar-marker-date">Start</Label>
          <Input
            id="calendar-marker-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            data-testid="input-calendar-marker-date"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calendar-marker-end-date">Ende</Label>
          <Input
            id="calendar-marker-end-date"
            type="date"
            value={form.endDate}
            disabled={form.type !== "company_vacation"}
            onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            data-testid="input-calendar-marker-end-date"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calendar-marker-name">Name</Label>
          <Input
            id="calendar-marker-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            data-testid="input-calendar-marker-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select
            value={form.type}
            onValueChange={(value: CalendarMarkerFormState["type"]) => setForm((current) => ({
              ...current,
              type: value,
              source: value === "public_holiday" ? "automatic" : "admin",
              scope: value === "public_holiday" ? "national" : "company",
              endDate: value === "company_vacation" ? current.endDate : "",
              states: value === "public_holiday" ? current.states : [],
            }))}
          >
            <SelectTrigger data-testid="select-calendar-marker-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_holiday">Betriebsfeiertag</SelectItem>
              <SelectItem value="company_vacation">Betriebsferien</SelectItem>
              <SelectItem value="public_holiday">Feiertag-Override</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Switch
            checked={form.active}
            onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
            data-testid="switch-calendar-marker-active"
          />
          <Label>Aktiv</Label>
        </div>
        {form.type === "public_holiday" ? (
          <div className="space-y-1.5 md:col-span-2">
            <Label>Geltung</Label>
            <Select
              value={form.scope}
              onValueChange={(value: CalendarMarkerFormState["scope"]) => setForm((current) => ({
                ...current,
                scope: value,
                states: value === "regional" ? current.states : [],
              }))}
            >
              <SelectTrigger data-testid="select-calendar-marker-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">Bund</SelectItem>
                <SelectItem value="regional">Bundesländer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {form.type === "public_holiday" && form.scope === "regional" ? (
          <div className="grid grid-cols-8 gap-2 md:col-span-3">
            {germanStates.map((state) => (
              <label key={state} className="flex items-center gap-1 text-xs font-medium">
                <Checkbox
                  checked={form.states.includes(state)}
                  onCheckedChange={(checked) => toggleState(state, checked === true)}
                />
                {state}
              </label>
            ))}
          </div>
        ) : null}
        <div className="space-y-1.5 md:col-span-4">
          <Label htmlFor="calendar-marker-note">Bemerkung</Label>
          <Textarea
            id="calendar-marker-note"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            data-testid="textarea-calendar-marker-note"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={submit} disabled={!form.date || !form.name.trim()} data-testid="button-save-calendar-marker">
            {form.id ? "Speichern" : "Neu"}
          </Button>
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-calendar-marker">
            Zurücksetzen
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Quelle</TableHead>
              <TableHead>Geltung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMarkers.map((marker) => (
              <TableRow key={marker.id} className={form.id === marker.id ? "bg-slate-50" : undefined}>
                <TableCell>
                  {marker.endDate
                    ? `${formatDisplayDate(marker.date)} bis ${formatDisplayDate(marker.endDate)}`
                    : formatDisplayDate(marker.date)}
                </TableCell>
                <TableCell>{marker.name}</TableCell>
                <TableCell>{markerTypeLabel(marker.type)}</TableCell>
                <TableCell>{markerSourceLabel(marker.source)}</TableCell>
                <TableCell>{markerScopeLabel(marker)}</TableCell>
                <TableCell>{marker.active ? "Aktiv" : "Inaktiv"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setForm(toForm(marker))}>
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ id: marker.id, version: marker.version }, {
                      onError: (error) => toast({ title: error.message, variant: "destructive" }),
                    })}
                    data-testid={`button-delete-calendar-marker-${marker.id}`}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && sortedMarkers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Keine Kalendermarker vorhanden.</div>
        ) : null}
      </div>
    </div>
  );
}
