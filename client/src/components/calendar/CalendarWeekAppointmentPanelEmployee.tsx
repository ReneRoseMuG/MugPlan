import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";

type AppointmentEmployee = {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
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
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold text-slate-500">Mitarbeiter</div>}
      <div className="flex flex-col gap-1.5">
        {employees.map((employee) => (
          <EmployeeInfoBadge
            key={employee.id}
            id={employee.id}
            firstName={employee.firstName}
            lastName={employee.lastName}
            fullName={employee.fullName}
            renderMode="standard"
            size="sm"
            fullWidth
            showPreview={false}
            testId={`week-employee-badge-${employee.id}`}
          />
        ))}
      </div>
    </div>
  );
}
