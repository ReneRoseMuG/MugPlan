import { Users } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { CalendarWeekAppointmentPanelEmployee } from "./CalendarWeekAppointmentPanelEmployee";

type AppointmentEmployee = {
  id: number;
  fullName: string;
};

export function CalendarWeekAppointmentEmployeesHover({
  employees,
}: {
  employees: AppointmentEmployee[];
}) {
  const hasEmployees = employees.length > 0;

  const trigger = (
    <div
      className={`mt-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
        hasEmployees
          ? "cursor-pointer border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100"
          : "cursor-not-allowed border-slate-200/70 bg-slate-100/70 text-slate-400"
      }`}
      data-testid="week-appointment-employees-hover-trigger"
      aria-disabled={!hasEmployees}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {hasEmployees ? "Mitarbeiter anzeigen" : "Keine Mitarbeiter"}
        </span>
        <span>{hasEmployees ? employees.length : 0}</span>
      </div>
    </div>
  );

  if (!hasEmployees) {
    return trigger;
  }

  return (
    <HoverPreview
      preview={(
        <div className="rounded-lg bg-white p-1">
          <CalendarWeekAppointmentPanelEmployee employees={employees} showSectionTitle />
        </div>
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={300}
      maxHeight={220}
      className="z-[9999] w-[300px]"
    >
      {trigger}
    </HoverPreview>
  );
}
