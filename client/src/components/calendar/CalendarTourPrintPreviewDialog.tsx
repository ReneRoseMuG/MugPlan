import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import {
  buildPrintNotesText,
  buildTourPrintDateRange,
  buildTourPrintSummaryRows,
  buildTourPrintWeekPages,
  formatTourPrintDateShort,
  getAppointmentPrimaryLocation,
  normalizeTourPrintWeekCount,
  type TourPrintPreviewAppointment,
  type TourPrintPreviewResponse,
} from "@/lib/tour-print-preview";

type CalendarTourPrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: number | null;
  weekCount: number;
  fromDate: string;
  weekendColumnPercent: number;
};

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : "Ganztag";
}

function PrintAppointmentCard({ appointment }: { appointment: TourPrintPreviewAppointment }) {
  const notes = buildPrintNotesText(appointment);

  return (
    <article className="rounded-md border border-slate-300 bg-white p-2 text-[11px] shadow-sm">
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span>{formatTime(appointment.startTime)}</span>
        <span>{appointment.durationDays} T</span>
      </div>
      <div className="mt-1 font-semibold text-slate-900">{appointment.projectName}</div>
      <div className="mt-1 text-slate-700">{getAppointmentPrimaryLocation(appointment)}</div>
      {appointment.saunaModel ? <div className="mt-1 text-slate-700">Sauna: {appointment.saunaModel}</div> : null}
      {notes.length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-slate-700">
          {notes.map((note, index) => (
            <p key={`${appointment.id}-note-${index}`} className="line-clamp-4">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CalendarTourPrintPreviewDialog({
  open,
  onOpenChange,
  tourId,
  weekCount,
  fromDate,
  weekendColumnPercent,
}: CalendarTourPrintPreviewDialogProps) {
  const normalizedWeekCount = normalizeTourPrintWeekCount(weekCount);

  const { data, isLoading, isError } = useQuery<TourPrintPreviewResponse>({
    queryKey: ["tourPrintPreview", tourId, fromDate, normalizedWeekCount],
    enabled: open && typeof tourId === "number",
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate,
        weekCount: String(normalizedWeekCount),
      });
      const response = await fetch(`/api/tours/${tourId}/print-preview?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Druckvorschau konnte nicht geladen werden");
      }
      return (await response.json()) as TourPrintPreviewResponse;
    },
  });

  const dayGridTemplate = buildDayGridTemplate(getDayWeights(normalizeWeekendColumnPercent(weekendColumnPercent)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[92vh] w-[96vw] max-w-[1400px] overflow-hidden p-0 print:left-0 print:top-0 print:h-auto print:w-auto print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-0 print:bg-white print:shadow-none"
        data-testid="dialog-tour-print-preview"
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border px-6 py-4 print:hidden">
            <DialogTitle>Druckvorschau Tour-Zeitleiste</DialogTitle>
            <DialogDescription>
              Vorschau ohne echten Druck. Der finale Druckablauf folgt spaeter.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-slate-200 px-6 py-6 print:bg-white" data-testid="tour-print-preview-pages">
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  [data-testid="dialog-tour-print-preview"] {
                    position: static !important;
                    inset: auto !important;
                    display: block !important;
                  }
                  [data-testid="tour-print-preview-pages"], [data-testid="tour-print-preview-pages"] * {
                    visibility: visible;
                  }
                  [data-testid="tour-print-preview-pages"] {
                    position: static;
                    left: 0;
                    top: 0;
                    width: 100%;
                    min-height: auto;
                    overflow: visible;
                    background: white;
                    padding: 0;
                  }
                  .tour-print-page {
                    box-shadow: none !important;
                    margin: 0 !important;
                    border: none !important;
                    page-break-after: always;
                  }
                  .tour-print-page:last-child {
                    page-break-after: auto;
                  }
                  .tour-print-page--portrait {
                    width: 210mm;
                    min-height: 297mm;
                  }
                  .tour-print-page--landscape {
                    width: 297mm;
                    min-height: 210mm;
                  }
                }
              `}
            </style>

            {isLoading ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
            {isError ? <div className="text-sm text-destructive">Druckvorschau konnte nicht geladen werden.</div> : null}

            {data ? (
              <div className="space-y-6">
                <section
                  className="tour-print-page tour-print-page--portrait mx-auto flex min-h-[1020px] w-[720px] flex-col gap-6 border border-slate-300 bg-white p-8 shadow-lg"
                  data-testid="tour-print-summary-page"
                >
                  <header className="space-y-4 border-b border-slate-200 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Tour-Druckvorschau</p>
                        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{data.tour.name}</h2>
                      </div>
                      <div
                        className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: data.tour.color }}
                      >
                        {buildTourPrintDateRange(data)}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Betroffene Mitarbeiter</p>
                      <div className="mt-2 flex flex-wrap gap-2" data-testid="tour-print-members">
                        {data.members.map((member) => (
                          <span key={member.id} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-800">
                            {member.fullName}
                          </span>
                        ))}
                        {data.members.length === 0 ? <span className="text-sm text-slate-500">Keine Tour-Mitglieder</span> : null}
                      </div>
                    </div>
                  </header>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terminliste</p>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-sm" data-testid="tour-print-summary-table">
                        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Datum</th>
                            <th className="px-3 py-2">Dauer</th>
                            <th className="px-3 py-2">Saunamodell</th>
                            <th className="px-3 py-2">Postleitzahl</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildTourPrintSummaryRows(data).map((row) => (
                            <tr key={row.id} className="border-t border-slate-200">
                              <td className="px-3 py-2">{row.dateLabel}</td>
                              <td className="px-3 py-2">{row.durationDays}</td>
                              <td className="px-3 py-2">{row.saunaModel}</td>
                              <td className="px-3 py-2">{row.postalCode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {buildTourPrintWeekPages(data).map((week, weekIndex) => (
                  <section
                    key={week.weekStart}
                    className="tour-print-page tour-print-page--landscape mx-auto flex min-h-[720px] w-[1080px] flex-col gap-4 border border-slate-300 bg-white p-6 shadow-lg"
                    data-testid={`tour-print-week-page-${weekIndex + 1}`}
                  >
                    <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wochenansicht</p>
                        <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                          {data.tour.name} · KW {format(parseISO(week.weekStart), "II", { locale: de })}
                        </h3>
                      </div>
                      <div className="text-sm font-medium text-slate-700">
                        {buildTourPrintDateRange({
                          ...data,
                          fromDate: week.weekStart,
                          toDate: week.weekEnd,
                        })}
                      </div>
                    </header>

                    <div className="grid gap-3" style={{ gridTemplateColumns: dayGridTemplate }}>
                      {week.days.map((day) => (
                        <div key={day.dateKey} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50">
                          <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
                            {formatTourPrintDateShort(day.dateKey)}
                          </div>
                          <div className="flex min-h-[540px] flex-col gap-2 px-2 py-2" data-testid={`tour-print-day-${day.dateKey}`}>
                            {day.appointments.map((appointment) => (
                              <PrintAppointmentCard key={`${day.dateKey}-${appointment.id}`} appointment={appointment} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
