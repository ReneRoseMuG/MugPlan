import { Fragment, useMemo, useState } from "react";
import { addWeeks, endOfISOWeek, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { ChevronLeft, ChevronRight, ListChecks, Lock, LockOpen, MoreVertical, StickyNote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Note, Team, Tour } from "@shared/schema";
import { CalendarWeekNotesButton } from "@/components/calendar/CalendarWeekNotesButton";
import { CalendarWeekTourLaneHeaderBar } from "@/components/calendar/CalendarWeekTourLaneHeaderBar";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { TourWeekCard, type TourWeekCardData, type TourWeekCardMember } from "@/components/TourWeekCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatListDateRange } from "@/lib/list-display-format";

type TourWeekPlanningTour = Pick<Tour, "id" | "name" | "color">;

type TourWeekPlanningWeek = {
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
};

type TourWeekPlanningResponse = {
  weeks: TourWeekPlanningWeek[];
  tours: TourWeekPlanningTour[];
  cells: TourWeekCardData[];
};

type PendingWeekSelection = {
  tourId: number;
  isoYear: number;
  isoWeek: number;
};

const tourWeekPagingButtonClassName =
  "h-full w-7 border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 inline-flex items-center justify-center";

interface TourWeekPlanningViewProps {
  readOnly?: boolean;
  showInlineNotes?: boolean;
  isMutatingMembers?: boolean;
  isMutatingWeeks?: boolean;
  onAddWeekEmployee?: (params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number }) => Promise<void>;
  onAddWeekEmployees?: (params: { tourId: number; isoYear: number; isoWeek: number; employeeIds: number[] }) => Promise<void>;
  onApplyWeekEmployees?: (params: { tourId: number; isoYear: number; isoWeek: number; employeeIds: number[] }) => Promise<void>;
  onRemoveWeekEmployee?: (assignment: TourWeekCardMember & { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  onBlockWeek?: (params: { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  onUnblockWeek?: (params: { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  onOpenTourWeek?: (week: TourWeekCardData) => void;
}

function resolveInitialWeekStart(): Date {
  return startOfISOWeek(new Date());
}

function buildWeekRequestWindow(weekStart: Date) {
  const fromDate = format(weekStart, "yyyy-MM-dd");
  const toDate = format(endOfISOWeek(addWeeks(weekStart, 3)), "yyyy-MM-dd");
  return { fromDate, toDate };
}

function buildWeekKey(isoYear: number, isoWeek: number): string {
  return `${isoYear}-${String(isoWeek).padStart(2, "0")}`;
}

function htmlToExcerpt(value: string, maxLength = 180): string {
  const plainText = value
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  return plainText.length <= maxLength ? plainText : `${plainText.slice(0, maxLength - 1).trimEnd()}...`;
}

function TourWeekInlineNotes({
  week,
  visible,
}: {
  week: TourWeekCardData;
  visible: boolean;
}) {
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["calendarWeekNotes", week.isoYear, week.isoWeek, week.tourId, "inline"],
    enabled: visible && week.notesCount > 0,
    queryFn: async () => {
      const response = await fetch(`/api/calendar-weeks/${week.isoYear}/${week.isoWeek}/tours/${week.tourId}/notes`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Notizen konnten nicht geladen werden");
      return response.json() as Promise<Note[]>;
    },
  });

  if (!visible || notes.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2" data-testid={`tour-week-planning-inline-notes-${week.tourId}-${week.isoYear}-${week.isoWeek}`}>
      {notes.map((note) => (
        <article
          key={note.id}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"
          style={{ backgroundColor: note.cardColor ?? "#ffffff" }}
        >
          <div className="font-semibold text-slate-800">{note.title}</div>
          <div className="whitespace-pre-line text-slate-600">{htmlToExcerpt(note.body ?? "") || "-"}</div>
        </article>
      ))}
    </div>
  );
}

export function TourWeekPlanningView({
  readOnly = false,
  showInlineNotes = false,
  isMutatingMembers = false,
  isMutatingWeeks = false,
  onAddWeekEmployee,
  onAddWeekEmployees,
  onApplyWeekEmployees,
  onRemoveWeekEmployee,
  onBlockWeek,
  onUnblockWeek,
  onOpenTourWeek,
}: TourWeekPlanningViewProps) {
  const [windowStart, setWindowStart] = useState(resolveInitialWeekStart);
  const [pendingWeekSelection, setPendingWeekSelection] = useState<PendingWeekSelection | null>(null);
  const { fromDate, toDate } = useMemo(() => buildWeekRequestWindow(windowStart), [windowStart]);

  const planningQuery = useQuery<TourWeekPlanningResponse>({
    queryKey: ["tourWeekPlanningView", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      const response = await fetch(`/api/tours/week-planning?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Wochenplanung konnte nicht geladen werden");
      return response.json() as Promise<TourWeekPlanningResponse>;
    },
  });

  const { data: availableEmployees = [], isLoading: availableEmployeesLoading } = useQuery<Employee[]>({
    queryKey: pendingWeekSelection
      ? [`/api/tours/${pendingWeekSelection.tourId}/week-employees/available`, pendingWeekSelection.isoYear, pendingWeekSelection.isoWeek]
      : ["/api/tours/week-employees/available", "idle"],
    enabled: pendingWeekSelection !== null,
    queryFn: async () => {
      if (!pendingWeekSelection) return [];
      const params = new URLSearchParams({
        isoYear: String(pendingWeekSelection.isoYear),
        isoWeek: String(pendingWeekSelection.isoWeek),
      });
      const response = await fetch(`/api/tours/${pendingWeekSelection.tourId}/week-employees/available?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Verfügbare Mitarbeiter konnten nicht geladen werden");
      return response.json() as Promise<Employee[]>;
    },
  });

  const cellsByTourAndWeek = useMemo(() => {
    const result = new Map<string, TourWeekCardData>();
    for (const cell of planningQuery.data?.cells ?? []) {
      result.set(`${cell.tourId}-${buildWeekKey(cell.isoYear, cell.isoWeek)}`, cell);
    }
    return result;
  }, [planningQuery.data?.cells]);

  const confirmEmployeeSelection = (employeeIds: number[]) => {
    if (!pendingWeekSelection || employeeIds.length === 0) {
      setPendingWeekSelection(null);
      return;
    }
    const normalizedEmployeeIds = Array.from(new Set(employeeIds.filter((employeeId) => Number.isInteger(employeeId) && employeeId > 0)));
    if (normalizedEmployeeIds.length === 1) {
      void onAddWeekEmployee?.({
        ...pendingWeekSelection,
        employeeId: normalizedEmployeeIds[0],
      });
    } else if (normalizedEmployeeIds.length > 1) {
      void onAddWeekEmployees?.({
        ...pendingWeekSelection,
        employeeIds: normalizedEmployeeIds,
      });
    }
    setPendingWeekSelection(null);
  };

  const weeks = planningQuery.data?.weeks ?? [];
  const tours = planningQuery.data?.tours ?? [];
  const isBusy = isMutatingMembers || isMutatingWeeks;

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" data-testid="tour-week-planning-view">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
        <div className="min-w-[12rem] text-sm font-semibold text-slate-700" data-testid="text-tour-week-planning-range">
          KW {getISOWeek(windowStart)} / {getISOWeekYear(windowStart)}
        </div>
      </div>

      <div className="min-h-0 flex-1 grid grid-cols-[28px_minmax(0,1fr)_28px] bg-white">
        <button
          type="button"
          onClick={() => setWindowStart((current) => addWeeks(current, -4))}
          className={`${tourWeekPagingButtonClassName} border-r`}
          data-testid="button-tour-week-planning-prev"
          aria-label="Zurück"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="visible-horizontal-scrollbar min-w-0 h-full overflow-auto bg-white">
          <div className="min-w-[1040px] p-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(4, minmax(12.5rem, 1fr))" }}
              data-testid="grid-tour-week-planning-view"
            >
              {weeks.map((week) => (
                <div
                  key={buildWeekKey(week.isoYear, week.isoWeek)}
                  className="rounded-md border border-border bg-slate-50 px-3 py-2"
                  data-testid={`column-tour-week-planning-${week.isoYear}-${week.isoWeek}`}
                >
                  <div className="text-sm font-bold text-slate-800">KW {String(week.isoWeek).padStart(2, "0")} / {week.isoYear}</div>
                  <div className="text-xs text-slate-500">{formatListDateRange(week.weekStartDate, week.weekEndDate)}</div>
                </div>
              ))}

              {planningQuery.isLoading ? (
              <div className="col-span-4 rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Wochenplanung wird geladen...
              </div>
            ) : tours.length === 0 ? (
              <div className="col-span-4 rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Keine Touren mit Wochenplanung vorhanden.
              </div>
            ) : tours.map((tour) => (
              <Fragment key={`tour-week-planning-row-${tour.id}`}>
                <div className="col-span-4 pt-1">
                  <CalendarWeekTourLaneHeaderBar
                    label={tour.name}
                    color={tour.color}
                    isExpanded
                    reduced
                    testId={`tour-week-planning-lane-${tour.id}`}
                  />
                </div>
                {weeks.map((week) => {
                  const cell = cellsByTourAndWeek.get(`${tour.id}-${buildWeekKey(week.isoYear, week.isoWeek)}`);
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${tour.id}-${buildWeekKey(week.isoYear, week.isoWeek)}`}
                        className="min-h-[9rem] rounded-md border border-dashed border-slate-200"
                      />
                    );
                  }

                  return (
                    <CalendarWeekNotesButton
                      key={`cell-${tour.id}-${buildWeekKey(week.isoYear, week.isoWeek)}`}
                      yearNumber={cell.isoYear}
                      weekNumber={cell.isoWeek}
                      tourId={cell.tourId}
                      tourLabel={`${cell.tourName} - KW ${String(cell.isoWeek).padStart(2, "0")} / ${cell.isoYear}`}
                      readOnly={readOnly}
                    >
                      {({ dialog, openDialog }) => (
                        <>
                          <TourWeekCard
                            week={cell}
                            scope="tour"
                            borderColor={tour.color}
                            testId={`tour-week-planning-card-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                            memberTestIdPrefix={`tour-week-planning-member-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                            blockedTextTestId={`tour-week-planning-blocked-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                            blockedBadgeTestId={`tour-week-planning-blocked-badge-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                            onOpen={() => onOpenTourWeek?.(cell)}
                            onRemoveEmployee={!readOnly && !cell.isLocked && !cell.isBlocked ? (employee) => {
                              void onRemoveWeekEmployee?.({
                                ...employee,
                                tourId: cell.tourId,
                                isoYear: cell.isoYear,
                                isoWeek: cell.isoWeek,
                              });
                            } : undefined}
                            hideDateRange
                            inlineNotes={<TourWeekInlineNotes week={cell} visible={showInlineNotes} />}
                            actions={(
                              <>
                                {!readOnly && !cell.isLocked && !cell.isBlocked ? (
                                  <button
                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setPendingWeekSelection({ tourId: cell.tourId, isoYear: cell.isoYear, isoWeek: cell.isoWeek });
                                    }}
                                    disabled={isBusy}
                                    aria-label="Mitarbeiter zur KW hinzufügen"
                                    data-testid={`button-tour-week-planning-add-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                                  >
                                    +
                                  </button>
                                ) : null}
                                {!readOnly && !cell.isLocked && !cell.isBlocked ? (
                                  <button
                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void onApplyWeekEmployees?.({
                                        tourId: cell.tourId,
                                        isoYear: cell.isoYear,
                                        isoWeek: cell.isoWeek,
                                        employeeIds: cell.employees.map((employee) => employee.employeeId),
                                      });
                                    }}
                                    disabled={isBusy || cell.employees.length === 0}
                                    aria-label="Tour-KW-Planung auf Termine anwenden"
                                    data-testid={`button-tour-week-planning-apply-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                                  >
                                    <ListChecks className="h-4 w-4" />
                                  </button>
                                ) : null}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                      disabled={isMutatingWeeks}
                                      data-testid={`button-tour-week-planning-menu-${cell.tourId}-${cell.isoYear}-${cell.isoWeek}`}
                                      aria-label="Wochenplanungsaktionen"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[210px]">
                                    <DropdownMenuItem onClick={openDialog} className="gap-2 text-xs cursor-pointer">
                                      <StickyNote className="h-3.5 w-3.5 shrink-0" />
                                      {readOnly ? "Notizen anzeigen" : "Notiz hinzufügen"}
                                    </DropdownMenuItem>
                                    {!readOnly ? (
                                      cell.isBlocked ? (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            void onUnblockWeek?.({ tourId: cell.tourId, isoYear: cell.isoYear, isoWeek: cell.isoWeek });
                                          }}
                                          disabled={cell.isLocked || isMutatingWeeks}
                                          className="gap-2 text-xs cursor-pointer"
                                        >
                                          <LockOpen className="h-3.5 w-3.5 shrink-0" />
                                          Wochenplanung freigeben
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            void onBlockWeek?.({ tourId: cell.tourId, isoYear: cell.isoYear, isoWeek: cell.isoWeek });
                                          }}
                                          disabled={cell.isLocked || isMutatingWeeks}
                                          className="gap-2 text-xs cursor-pointer"
                                        >
                                          <Lock className="h-3.5 w-3.5 shrink-0" />
                                          Wochenplanung blockieren
                                        </DropdownMenuItem>
                                      )
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          />
                          {dialog}
                        </>
                      )}
                    </CalendarWeekNotesButton>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        </div>
        <button
          type="button"
          onClick={() => setWindowStart((current) => addWeeks(current, 4))}
          className={`${tourWeekPagingButtonClassName} border-l`}
          data-testid="button-tour-week-planning-next"
          aria-label="Vor"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={!readOnly && pendingWeekSelection !== null} onOpenChange={(open) => { if (!open) setPendingWeekSelection(null); }}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={[] as Team[]}
            tours={[]}
            isLoading={availableEmployeesLoading}
            allowBulkSelection
            viewModeSettingKey="appointmentEmployeePicker.viewMode"
            title="Mitarbeiter auswählen"
            onSelectEmployee={(employeeId) => confirmEmployeeSelection([employeeId])}
            onConfirmSelection={confirmEmployeeSelection}
            onClose={() => setPendingWeekSelection(null)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
