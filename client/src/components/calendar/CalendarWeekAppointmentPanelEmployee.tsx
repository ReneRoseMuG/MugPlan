import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";

type AppointmentEmployee = {
  id: number;
  fullName: string;
};

export function CalendarWeekAppointmentPanelEmployee({
  employees,
  showSectionTitle = false,
}: {
  employees: AppointmentEmployee[];
  showSectionTitle?: boolean;
}) {
  if (employees.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Mitarbeiter</div>}
      <div className="flex flex-wrap gap-1.5">
        {employees.map((employee) => (
          <EmployeeInfoBadge
            key={employee.id}
            id={employee.id}
            fullName={employee.fullName}
            size="sm"
            showPreview={false}
            testId={`week-employee-badge-${employee.id}`}
          />
        ))}
      </div>
    </div>
  );
}
