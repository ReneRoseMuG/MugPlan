import React from "react";
import { MeasuredPrintCardMeasurement } from "@/components/print/MeasuredPrintCardMeasurement";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { PrintSlimFooter } from "@/components/print/PrintSlimFooter";
import { TourenplanAppointmentCard } from "@/components/reports/TourenplanAppointmentCard";
import type {
  TourenplanFontSize,
  TourenplanOrientation,
  TourenplanPrintSection,
  TourenplanPrintMode,
  TourenplanResolvedAppointment,
} from "@/components/reports/tourenplan-model";

type TourenplanPaginationMeasurementProps = {
  sections: TourenplanPrintSection[];
  printMode: TourenplanPrintMode;
  fontSize: TourenplanFontSize;
  orientation: TourenplanOrientation;
  useShortCodes: boolean;
  onMeasured: (measurement: { pageCapacityPx: number; cardHeights: Record<string, number> }) => void;
};

type TourenplanMeasurementItem = {
  sectionKey: string;
  weekIndex: number;
  appointmentIndex: number;
  appointment: TourenplanResolvedAppointment;
};

export function TourenplanPaginationMeasurement({
  sections,
  printMode,
  fontSize,
  orientation,
  useShortCodes,
  onMeasured,
}: TourenplanPaginationMeasurementProps) {
  const measurementItems = React.useMemo<TourenplanMeasurementItem[]>(
    () => sections.flatMap((section) =>
      section.weeks.flatMap((week, weekIndex) =>
        week.appointments.map((appointment, appointmentIndex) => ({
          sectionKey: section.sectionKey,
          weekIndex,
          appointmentIndex,
          appointment,
        })),
      ),
    ),
    [sections],
  );

  return (
    <MeasuredPrintCardMeasurement
      items={measurementItems}
      getItemKey={(item) => item.appointment.id}
      measurementKey={`${printMode}-${fontSize}-${orientation}-${useShortCodes ? "short" : "full"}`}
      onMeasured={onMeasured}
      testId="tourenplan-pagination-measurement"
      getCardWrapperClassName={(item) => {
        if (item.weekIndex > 0 && item.appointmentIndex === 0) {
          return "mt-[22px]";
        }
        return item.appointmentIndex > 0 ? "mt-1.5" : undefined;
      }}
      renderCard={(item) => (
        <TourenplanAppointmentCard
          appointment={item.appointment}
          printMode={printMode}
          fontSize={fontSize}
          useShortCodes={useShortCodes}
        />
      )}
      renderMeasurementLayout={({ contentRef, cards }) => (
        <PrintPageShell
          orientation={orientation}
          paddingMm={10}
          pageGapClassName="gap-2.5"
          contentGapClassName="gap-2"
          footer={<PrintSlimFooter pageNumber={1} />}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <header className="border-b border-slate-200 pb-1 text-[10px] font-medium text-slate-500">
              {sections[0]?.tourName ?? "Tourenplan"}
            </header>

            <div ref={contentRef} className="flex min-h-0 flex-1 gap-0">
              <aside className="mr-2.5 w-7 shrink-0" />
              <div className="flex min-h-0 flex-1 flex-col">
                {cards}
              </div>
            </div>
          </div>
        </PrintPageShell>
      )}
    />
  );
}
