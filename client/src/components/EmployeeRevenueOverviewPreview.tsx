import { format, isValid, parseISO } from "date-fns";
import type { EmployeeRevenueOverviewResponse } from "@shared/routes";

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatRevenueAmount(value: string): string {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? euroFormatter.format(numericValue) : value;
}

function formatAppointmentDate(value: string): string {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd.MM.yy") : value;
}

type EmployeeRevenueOverviewWeek = EmployeeRevenueOverviewResponse["weeks"][number];

interface EmployeeRevenueOverviewPreviewProps {
  employeeFullName: string;
  week: EmployeeRevenueOverviewWeek;
}

export function EmployeeRevenueOverviewPreview({
  employeeFullName,
  week,
}: EmployeeRevenueOverviewPreviewProps) {
  return (
    <div
      className="flex w-full min-w-[20rem] flex-col gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg"
      data-testid="employee-revenue-overview-preview"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{employeeFullName}</p>
          <p className="text-xs text-muted-foreground">
            {week.orderCount} Auftrag{week.orderCount === 1 ? "" : "e"} • {formatRevenueAmount(week.revenueAmount)}
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {week.weekLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {week.appointments.map((appointment) => (
          <div
            key={appointment.appointmentId}
            className="min-w-[11rem] max-w-full rounded-md border border-border/70 bg-background/80 px-3 py-2"
            data-testid={`employee-revenue-overview-preview-appointment-${appointment.appointmentId}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">
                {formatAppointmentDate(appointment.startDate)}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {formatRevenueAmount(appointment.amount)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-medium text-foreground">{appointment.projectName}</p>
            {appointment.orderNumber ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">A-Nr. {appointment.orderNumber}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
