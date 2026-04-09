import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type WeekPreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  tourName?: string | null;
  customerNumber?: string | null;
  projectName?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
  status?: "will_add" | "conflict" | "already_assigned" | "will_remove" | "understaffed" | "keep";
  selectable?: boolean;
  eligible?: boolean;
  conflictReason: string | null;
  isUnderstaffed?: boolean;
};

type AppointmentPreviewItem = {
  employeeId: number;
  employeeName: string;
  status: "will_add" | "conflict" | "already_present" | "current_only";
  selectable: boolean;
  conflictReason: string | null;
};

interface TourEmployeeCascadeDialogProps {
  open: boolean;
  variant?: "week" | "appointment";
  mode?: "add" | "remove";
  employeeName?: string;
  title?: string;
  description?: string;
  weekLabel?: string | null;
  previewItems: Array<WeekPreviewItem | AppointmentPreviewItem>;
  selectedIds?: number[];
  selectedAppointmentIds?: number[];
  isSubmitting: boolean;
  onSelectedIdsChange?: (ids: number[]) => void;
  onSelectedAppointmentIdsChange?: (ids: number[]) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  resolutionMode?: "additive" | "replace";
  onResolutionModeChange?: (mode: "additive" | "replace") => void;
  showResolutionMode?: boolean;
}

function formatShortDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}.${month}.${year.slice(-2)}`;
}

function buildWeekTitle(props: TourEmployeeCascadeDialogProps): string {
  if (props.title) return props.title;
  if (props.mode === "remove") return "Mitarbeiter von Tour-Terminen abziehen";
  return "Mitarbeiter zu Tour-Terminen hinzufuegen";
}

function buildWeekDescription(props: TourEmployeeCascadeDialogProps): string {
  if (props.description) return props.description;
  if (props.mode === "remove") {
    return props.employeeName
      ? `Waehlen Sie die Termine aus, von denen ${props.employeeName} abgezogen werden soll.`
      : "Waehlen Sie die Termine aus, von denen der Mitarbeiter abgezogen werden soll.";
  }
  return props.employeeName
    ? `Waehlen Sie die Termine aus, fuer die ${props.employeeName} geplant werden soll.`
    : "Waehlen Sie die Termine aus, fuer die der Mitarbeiter geplant werden soll.";
}

function weekStatusLabel(item: WeekPreviewItem): string | null {
  const normalizedStatus = item.status
    ?? (item.isUnderstaffed ? "understaffed" : item.eligible === false ? "conflict" : "will_add");
  if (normalizedStatus === "conflict") return "Ueberschneidung mit bestehendem Termin";
  if (normalizedStatus === "already_assigned") return "Bereits auf diesem Termin zugewiesen";
  if (normalizedStatus === "understaffed") return "Warnung: Termin wird unterbesetzt";
  if (normalizedStatus === "will_remove") return "Wird vom Termin entfernt";
  if (normalizedStatus === "will_add") return "Wird zum Termin hinzugefuegt";
  return null;
}

function appointmentStatusLabel(item: AppointmentPreviewItem): string | null {
  if (item.status === "conflict") return "Ueberschneidung mit bestehendem Termin";
  if (item.status === "already_present") return "Bereits im Termin";
  if (item.status === "current_only") return "Bleibt nur durch aktuelle Terminzuweisung erhalten";
  if (item.status === "will_add") return "Kann aus der Wochenplanung uebernommen werden";
  return null;
}

function buildRangeLabel(items: WeekPreviewItem[]): string | null {
  if (items.length === 0) return null;
  let minDate = items[0].startDate;
  let maxDate = items[0].endDate ?? items[0].startDate;

  for (const item of items) {
    const endDate = item.endDate ?? item.startDate;
    if (item.startDate < minDate) minDate = item.startDate;
    if (endDate > maxDate) maxDate = endDate;
  }

  return `Termine (${items.length}) - Termine im Zeitraum von ${formatShortDate(minDate)} bis ${formatShortDate(maxDate)}`;
}

export function TourEmployeeCascadeDialog(props: TourEmployeeCascadeDialogProps) {
  const variant = props.variant ?? "week";
  const selectedIds = props.selectedIds ?? props.selectedAppointmentIds ?? [];
  const setSelectedIds = props.onSelectedIdsChange ?? props.onSelectedAppointmentIdsChange ?? (() => undefined);
  const [filterDateFrom, setFilterDateFrom] = useState<string | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<string | undefined>(undefined);

  const weekPreviewItems = useMemo(
    () => variant === "week" ? props.previewItems as WeekPreviewItem[] : [],
    [props.previewItems, variant],
  );
  const appointmentPreviewItems = useMemo(
    () => variant === "appointment" ? props.previewItems as AppointmentPreviewItem[] : [],
    [props.previewItems, variant],
  );

  const filteredWeekItems = useMemo(() => {
    if (variant !== "week") return weekPreviewItems;
    return weekPreviewItems.filter((item) => {
      if (filterDateFrom && item.startDate < filterDateFrom) return false;
      if (filterDateTo && item.startDate > filterDateTo) return false;
      return true;
    });
  }, [filterDateFrom, filterDateTo, variant, weekPreviewItems]);

  const allSelectableIds = useMemo(() => {
    if (variant === "week") {
      return filteredWeekItems
        .filter((item) => item.selectable ?? item.eligible ?? false)
        .map((item) => item.appointmentId);
    }
    return appointmentPreviewItems
      .filter((item) => item.selectable)
      .map((item) => item.employeeId);
  }, [appointmentPreviewItems, filteredWeekItems, variant]);

  const weekRangeLabel = variant === "week" ? buildRangeLabel(weekPreviewItems) : null;
  const isFilterActive = filterDateFrom !== undefined || filterDateTo !== undefined;

  return (
    <Dialog open={props.open} onOpenChange={(nextOpen) => !nextOpen && props.onClose()}>
      <DialogContent className="max-w-3xl" data-testid="dialog-tour-employee-cascade">
        <DialogHeader>
          <DialogTitle>{variant === "week" ? buildWeekTitle(props) : props.title}</DialogTitle>
          <DialogDescription>{variant === "week" ? buildWeekDescription(props) : props.description}</DialogDescription>
          {variant === "week" && (props.weekLabel || weekRangeLabel) ? (
            <p className="text-sm text-slate-500" data-testid="text-tour-employee-cascade-range">
              {[props.weekLabel, weekRangeLabel].filter(Boolean).join(" - ")}
            </p>
          ) : null}
        </DialogHeader>

        {variant === "appointment" && props.showResolutionMode ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3" data-testid="appointment-week-resolution-mode">
            <span className="text-sm font-medium text-slate-700">Uebernahme:</span>
            <Button
              type="button"
              variant={props.resolutionMode === "additive" ? "default" : "outline"}
              size="sm"
              onClick={() => props.onResolutionModeChange?.("additive")}
              disabled={props.isSubmitting}
              data-testid="button-appointment-week-mode-additive"
            >
              Additiv
            </Button>
            <Button
              type="button"
              variant={props.resolutionMode === "replace" ? "default" : "outline"}
              size="sm"
              onClick={() => props.onResolutionModeChange?.("replace")}
              disabled={props.isSubmitting}
              data-testid="button-appointment-week-mode-replace"
            >
              Ersetzen
            </Button>
          </div>
        ) : null}

        {variant === "week" ? (
          <div className="flex items-center gap-4" data-testid="filter-tour-cascade-date-range">
            <label className="flex items-center gap-2 text-sm">
              Datum von
              <Input
                type="date"
                value={filterDateFrom ?? ""}
                onChange={(event) => setFilterDateFrom(event.target.value || undefined)}
                data-testid="input-tour-cascade-date-from"
                className="w-36"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Datum bis
              <Input
                type="date"
                value={filterDateTo ?? ""}
                onChange={(event) => setFilterDateTo(event.target.value || undefined)}
                data-testid="input-tour-cascade-date-to"
                className="w-36"
              />
            </label>
            {isFilterActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDateFrom(undefined);
                  setFilterDateTo(undefined);
                }}
                data-testid="button-tour-cascade-date-filter-reset"
              >
                Zuruecksetzen
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(allSelectableIds)}
            disabled={props.isSubmitting}
            data-testid={variant === "week" ? "button-tour-cascade-select-all" : "button-appointment-week-select-all"}
          >
            Alle waehlen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={props.isSubmitting}
            data-testid={variant === "week" ? "button-tour-cascade-deselect-all" : "button-appointment-week-deselect-all"}
          >
            Alle abwaehlen
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-md border" data-testid="list-tour-employee-cascade-preview">
          {variant === "week" ? (
            filteredWeekItems.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                Keine zukuenftigen Termine betroffen.
              </div>
            ) : (
              <div className="divide-y">
                {filteredWeekItems.map((item) => {
                  const checked = selectedIds.includes(item.appointmentId);
                  const selectable = item.selectable ?? item.eligible ?? false;
                  const projectLabel = item.orderNumber && item.projectName
                    ? `${item.orderNumber} - ${item.projectName}`
                    : item.orderNumber ?? item.projectName ?? null;
                  const customerLabel = item.customerNumber
                    ? (item.customerName ? `K: ${item.customerNumber} - ${item.customerName}` : `K: ${item.customerNumber}`)
                    : item.customerName ?? null;
                  return (
                    <label
                      key={item.appointmentId}
                      className={`flex items-start gap-3 p-4 ${selectable ? "cursor-pointer" : "opacity-70"}`}
                      data-testid={`tour-employee-cascade-row-${item.appointmentId}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!selectable || props.isSubmitting}
                        onCheckedChange={(nextChecked) => {
                          if (!selectable) return;
                          if (nextChecked) {
                            setSelectedIds([...selectedIds, item.appointmentId]);
                            return;
                          }
                          setSelectedIds(selectedIds.filter((id) => id !== item.appointmentId));
                        }}
                        data-testid={`tour-employee-cascade-checkbox-${item.appointmentId}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{formatShortDate(item.startDate)}</span>
                          {item.endDate ? <span className="text-sm text-slate-500">bis {formatShortDate(item.endDate)}</span> : null}
                        </div>
                        {projectLabel ? <div className="text-sm text-slate-700">{projectLabel}</div> : null}
                        {customerLabel ? <div className="text-sm text-slate-600">{customerLabel}</div> : null}
                        {weekStatusLabel(item) ? (
                          <div
                            className={item.status === "conflict" || item.eligible === false ? "text-sm text-red-600" : "text-sm text-amber-700"}
                            data-testid={`tour-employee-cascade-status-${item.appointmentId}`}
                          >
                            {weekStatusLabel(item)}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )
          ) : appointmentPreviewItems.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              Keine Mitarbeiter fuer die Vorschau vorhanden.
            </div>
          ) : (
            <div className="divide-y">
              {appointmentPreviewItems.map((item) => {
                const checked = selectedIds.includes(item.employeeId);
                return (
                  <label
                    key={item.employeeId}
                    className={`flex items-start gap-3 p-4 ${item.selectable ? "cursor-pointer" : "opacity-70"}`}
                    data-testid={`appointment-week-preview-row-${item.employeeId}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!item.selectable || props.isSubmitting}
                      onCheckedChange={(nextChecked) => {
                        if (!item.selectable) return;
                        if (nextChecked) {
                          setSelectedIds([...selectedIds, item.employeeId]);
                          return;
                        }
                        setSelectedIds(selectedIds.filter((id) => id !== item.employeeId));
                      }}
                      data-testid={`appointment-week-preview-checkbox-${item.employeeId}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium text-slate-900">{item.employeeName}</div>
                      {appointmentStatusLabel(item) ? (
                        <div
                          className={item.status === "conflict" ? "text-sm text-red-600" : "text-sm text-slate-600"}
                          data-testid={`appointment-week-preview-status-${item.employeeId}`}
                        >
                          {appointmentStatusLabel(item)}
                        </div>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={props.isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={props.onConfirm} disabled={props.isSubmitting} data-testid="button-tour-employee-cascade-confirm">
            {props.isSubmitting ? "Speichern..." : (props.confirmLabel ?? "Bestaetigen")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
