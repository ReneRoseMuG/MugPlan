import React from "react";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { PrintSlimFooter } from "@/components/print/PrintSlimFooter";
import { TourenplanAppointmentCard } from "@/components/reports/TourenplanAppointmentCard";
import type {
  TourenplanOrientation,
  TourenplanPrintMode,
  TourenplanWeekGroup,
} from "@/components/reports/tourenplan-model";
import {
  TOURENPLAN_WEEK_SECTION_GAP_PX,
} from "@/components/reports/tourenplan-model";

type TourenplanPaginationMeasurementProps = {
  tourName: string;
  weeks: TourenplanWeekGroup[];
  printMode: TourenplanPrintMode;
  orientation: TourenplanOrientation;
  useShortCodes: boolean;
  onMeasured: (measurement: { pageCapacityPx: number; cardHeights: Record<number, number> }) => void;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function TourenplanPaginationMeasurement({
  tourName,
  weeks,
  printMode,
  orientation,
  useShortCodes,
  onMeasured,
}: TourenplanPaginationMeasurementProps) {
  const pageContentRef = React.useRef<HTMLDivElement | null>(null);
  const cardNodesRef = React.useRef(new Map<number, HTMLDivElement | null>());

  const registerCardNode = React.useCallback((appointmentId: number) => (node: HTMLDivElement | null) => {
    cardNodesRef.current.set(appointmentId, node);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const pageContentNode = pageContentRef.current;
    if (!pageContentNode || weeks.length === 0) {
      return;
    }

    const cardHeights: Record<number, number> = {};
    for (const week of weeks) {
      for (const appointment of week.appointments) {
        const node = cardNodesRef.current.get(appointment.id);
        if (!node) {
          return;
        }
        cardHeights[appointment.id] = Math.ceil(node.getBoundingClientRect().height);
      }
    }

    onMeasured({
      pageCapacityPx: Math.floor(pageContentNode.getBoundingClientRect().height),
      cardHeights,
    });
  }, [onMeasured, orientation, printMode, useShortCodes, weeks]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 opacity-0"
      data-testid="tourenplan-pagination-measurement"
    >
      <PrintPageShell
        orientation={orientation}
        paddingMm={10}
        pageGapClassName="gap-2.5"
        contentGapClassName="gap-2"
        footer={<PrintSlimFooter pageNumber={1} />}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <header className="border-b border-slate-200 pb-1 text-[10px] font-medium text-slate-500">
            {tourName}
          </header>

          <div ref={pageContentRef} className="flex min-h-0 flex-1 gap-0">
            <aside className="mr-2.5 w-7 shrink-0" />

            <div className="flex min-h-0 flex-1 flex-col">
              {weeks.map((week, weekIndex) => (
                <React.Fragment key={`${week.weekStart}-${weekIndex}`}>
                  {week.appointments.map((appointment, appointmentIndex) => (
                    <div
                      key={appointment.id}
                      ref={registerCardNode(appointment.id)}
                      className={appointmentIndex > 0 ? "mt-1.5" : undefined}
                    >
                      <TourenplanAppointmentCard
                        appointment={appointment}
                        printMode={printMode}
                        useShortCodes={useShortCodes}
                      />
                    </div>
                  ))}
                  {weekIndex < weeks.length - 1 ? <div style={{ height: `${TOURENPLAN_WEEK_SECTION_GAP_PX}px` }} /> : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </PrintPageShell>
    </div>
  );
}
