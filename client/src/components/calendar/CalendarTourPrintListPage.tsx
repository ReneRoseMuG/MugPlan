import React from "react";
import { format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { PrintPageHeader } from "@/components/print/PrintPageHeader";
import {
  TOUR_PRINT_PAGE_HEIGHT_MM,
  TOUR_PRINT_PAGE_PADDING_MM,
  TOUR_PRINT_PAGE_WIDTH_MM,
  formatTourPrintDate,
  getTourPrintKwRange,
  type TourPrintPreviewPage,
} from "@/lib/tour-print-preview";
import { CalendarTourPrintTourNoteBlock } from "./CalendarTourPrintTourNoteBlock";
import { CalendarTourPrintWeekTable } from "./CalendarTourPrintWeekTable";
import { CalendarTourPrintZusatzinformationen } from "./CalendarTourPrintZusatzinformationen";

type Props = {
  page: Extract<TourPrintPreviewPage, { kind: "list" }>;
};

function formatWeekdayLabel(value: string): string {
  return format(parseISO(value), "EE", { locale: de });
}

export function CalendarTourPrintListPage({ page }: Props) {
  const kwRange = getTourPrintKwRange(page.weeks, page.fromDate, page.toDate);

  return (
    <section
      className="mx-auto flex flex-col bg-white text-slate-900 shadow-lg print:shadow-none"
      data-testid="tour-print-list-page"
      style={{
        width: `${TOUR_PRINT_PAGE_WIDTH_MM}mm`,
        minHeight: `${TOUR_PRINT_PAGE_HEIGHT_MM}mm`,
        padding: `${TOUR_PRINT_PAGE_PADDING_MM}mm`,
        boxSizing: "border-box",
        border: "1px solid #cbd5e1",
      }}
    >
        <PrintPageHeader
          eyebrow="Tourplan"
          headline={page.tourName}
          rightSlot={(
            <div className="text-right">
              <p className="text-sm font-medium text-slate-600">{kwRange}</p>
              <p className="text-xs text-slate-400">{page.rangeLabel}</p>
              <p className="text-[10px] font-medium text-slate-500">{`Seite ${page.pageNumber}`}</p>
            </div>
          )}
        />

        <div className="mt-5 flex flex-1 flex-col">
          {page.weeks.map((week) => (
            <section
              key={`${week.weekStart}-${week.continuedFromPrevious ? "continued" : "start"}-${week.appointments[0]?.id ?? "empty"}`}
              className="mb-6"
              data-testid={`tour-print-week-${week.weekStart}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {`KW ${getISOWeek(parseISO(week.weekStart))}`}
                  </h3>
                  {week.continuedFromPrevious ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500">
                      Fortsetzung
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-400">
                  {formatTourPrintDate(week.weekStart)} - {formatTourPrintDate(week.weekEnd)}
                </p>
              </div>

              {week.showWeekNotes ? <CalendarTourPrintTourNoteBlock notes={week.weekNotes} /> : null}
              <CalendarTourPrintWeekTable week={week} />

              {week.appointments.length === 0 ? (
                <p className="text-[10px] text-slate-400" data-testid={`tour-print-week-empty-${week.weekStart}`}>
                  {`Keine Termine fuer ${formatWeekdayLabel(week.weekStart)}-${formatWeekdayLabel(week.weekEnd)}`}
                </p>
              ) : null}
            </section>
          ))}

          <CalendarTourPrintZusatzinformationen
            cards={page.additionalInfoCards}
            showHeading={page.showAdditionalInfoHeading}
            continued={page.additionalInfoContinued}
          />
        </div>
    </section>
  );
}
