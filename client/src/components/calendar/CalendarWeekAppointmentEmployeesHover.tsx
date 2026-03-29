import { Users } from "lucide-react";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
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

  return (
    <HoverPreview
      preview={(
        <div className="rounded-lg bg-white p-1">
          {hasEmployees ? (
            <CalendarWeekAppointmentPanelEmployee employees={employees} showSectionTitle />
          ) : (
            <div className="px-2 py-1 text-xs text-slate-500">Keine Mitarbeiter vorhanden.</div>
          )}
        </div>
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={300}
      maxHeight={220}
      className="z-[9999] w-[300px]"
    >
      <FooterChildCollectionBadge
        icon={<Users className="h-3 w-3" />}
        label="Mitarbeiter"
        count={hasEmployees ? employees.length : 0}
        testId="week-appointment-employees-hover-trigger"
        inactive={!hasEmployees}
      />
    </HoverPreview>
  );
}
