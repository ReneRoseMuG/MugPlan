import React from "react";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { PrintSlimFooter } from "@/components/print/PrintSlimFooter";
import { TourenplanAppointmentCard } from "@/components/reports/TourenplanAppointmentCard";
import type {
  TourenplanOrientation,
  TourenplanPrintMode,
  TourenplanPrintPageData,
} from "@/components/reports/tourenplan-model";

type TourenplanPrintPageProps = {
  page: TourenplanPrintPageData;
  printMode: TourenplanPrintMode;
  orientation: TourenplanOrientation;
  useShortCodes: boolean;
  testId?: string;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function TourenplanPrintPage({
  page,
  printMode,
  orientation,
  useShortCodes,
  testId,
}: TourenplanPrintPageProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [markerTops, setMarkerTops] = React.useState<Record<string, number>>(
    Object.fromEntries(page.weeks.map((week) => [week.weekStart, week.markerTopPx])),
  );

  useIsomorphicLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const nextTops: Record<string, number> = {};
    for (const week of page.weeks) {
      const firstCard = content.querySelector<HTMLElement>(`[data-kw-start="${week.weekStart}"]`);
      if (!firstCard) {
        nextTops[week.weekStart] = week.markerTopPx;
        continue;
      }
      nextTops[week.weekStart] = Math.max(4, firstCard.offsetTop + 4);
    }
    setMarkerTops(nextTops);
  }, [page.weeks]);

  return (
    <PrintPageShell
      orientation={orientation}
      paddingMm={10}
      pageGapClassName="gap-2.5"
      contentGapClassName="gap-2"
      testId={testId}
      footer={<PrintSlimFooter pageNumber={page.pageNumber} testId={testId ? `${testId}-footer` : undefined} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <header
          className="border-b border-slate-200 pb-1 text-[10px] font-medium text-slate-500"
          data-testid={testId ? `${testId}-header` : undefined}
        >
          {page.tourName}
        </header>

        <div ref={contentRef} className="flex min-h-0 flex-1 gap-0">
          <aside className="relative mr-2.5 w-7 shrink-0" data-testid={testId ? `${testId}-kw-rail` : undefined}>
            <div className="absolute bottom-1 left-[13px] top-1 w-0.5 rounded-sm bg-slate-200" />
            {page.weeks.map((week) => (
              <div
                key={week.weekStart}
                className="absolute left-0 flex flex-col items-center gap-[3px]"
                style={{ top: markerTops[week.weekStart] ?? week.markerTopPx }}
                data-testid={testId ? `${testId}-kw-marker-${week.weekNumber}` : undefined}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <div
                  className="mt-0.5 text-[9px] font-semibold tracking-[0.05em] text-slate-500"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: 1 }}
                >
                  {`KW ${week.weekNumber}`}
                </div>
              </div>
            ))}
          </aside>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            {page.weeks.map((week, weekIndex) => (
              <React.Fragment key={week.weekStart}>
                {week.appointments.map((appointment, appointmentIndex) => (
                  <TourenplanAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    printMode={printMode}
                    useShortCodes={useShortCodes}
                    dataKwStart={appointmentIndex === 0 ? week.weekStart : undefined}
                    testId={testId ? `${testId}-appointment-${appointment.id}` : undefined}
                  />
                ))}
                {weekIndex < page.weeks.length - 1 ? <div className="h-2.5" /> : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </PrintPageShell>
  );
}
