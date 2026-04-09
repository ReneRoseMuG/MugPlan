import { CalendarWeekAppointmentPanelEmployee } from "./CalendarWeekAppointmentPanelEmployee";

type PreviewEmployee = {
  id: number;
  fullName: string;
};

type CalendarWeekTourLaneDayHoverPreviewProps = {
  weekEmployees: PreviewEmployee[];
  additionalDayEmployees: PreviewEmployee[];
};

function EmployeeSection({
  title,
  emptyText,
  employees,
  testId,
}: {
  title: string;
  emptyText: string;
  employees: PreviewEmployee[];
  testId: string;
}) {
  return (
    <section className="space-y-1" data-testid={testId}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {employees.length > 0 ? (
        <CalendarWeekAppointmentPanelEmployee employees={employees} />
      ) : (
        <div className="rounded-md border border-slate-200/90 px-2 py-1.5 text-xs text-slate-500">{emptyText}</div>
      )}
    </section>
  );
}

export function CalendarWeekTourLaneDayHoverPreview({
  weekEmployees,
  additionalDayEmployees,
}: CalendarWeekTourLaneDayHoverPreviewProps) {
  return (
    <div className="space-y-3 rounded-lg bg-white p-3" data-testid="week-tour-lane-day-hover-preview">
      <EmployeeSection
        title="Aus Wochenplanung"
        emptyText="Keine Mitarbeiter aus Wochenplanung."
        employees={weekEmployees}
        testId="week-tour-lane-day-hover-week-employees"
      />
      <EmployeeSection
        title="Zusätzliche Tageszuweisungen"
        emptyText="Keine zusätzlichen Tageszuweisungen."
        employees={additionalDayEmployees}
        testId="week-tour-lane-day-hover-additional-employees"
      />
    </div>
  );
}
