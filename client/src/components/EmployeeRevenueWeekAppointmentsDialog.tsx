import { format, isValid, parseISO } from "date-fns";
import { Receipt } from "lucide-react";
import type { EmployeeRevenueOverviewResponse } from "@shared/routes";
import { DialogBaseFooter, DialogBaseShell } from "@/components/ui/dialog-base";

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

interface EmployeeRevenueWeekAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeFullName: string;
  week: EmployeeRevenueOverviewWeek | null;
}

/**
 * Zeigt genau die in eine Umsatzwoche einbezogenen Termine (week.appointments).
 * Wird sowohl im Reports-Tab als auch im Mitarbeiter-Formular-Tab verwendet.
 */
export function EmployeeRevenueWeekAppointmentsDialog({
  open,
  onOpenChange,
  employeeFullName,
  week,
}: EmployeeRevenueWeekAppointmentsDialogProps) {
  const appointments = week?.appointments ?? [];

  return (
    <DialogBaseShell
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={<Receipt />}
      title="Aufträge der Woche"
      headerMeta={week ? `${employeeFullName} • ${week.weekLabel}` : employeeFullName}
      testId="revenue-week-appointments-dialog"
      footer={(
        <DialogBaseFooter
          primaryAction={{
            label: "Schließen",
            onClick: () => onOpenChange(false),
            testId: "revenue-week-appointments-dialog-close",
          }}
        />
      )}
    >
      {week ? (
        <div className="space-y-3" data-testid="revenue-week-appointments-list">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {week.orderCount} Auftrag{week.orderCount === 1 ? "" : "e"}
            </span>
            <span className="font-semibold text-foreground">{formatRevenueAmount(week.revenueAmount)}</span>
          </div>
          {appointments.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {appointments.map((appointment) => (
                <li
                  key={appointment.appointmentId}
                  className="flex items-center justify-between gap-4 px-3 py-2"
                  data-testid={`revenue-week-appointments-item-${appointment.appointmentId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{appointment.projectName}</p>
                    {appointment.orderNumber ? (
                      <p className="truncate text-xs text-muted-foreground">A-Nr. {appointment.orderNumber}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-xs font-semibold text-foreground">
                      {formatAppointmentDate(appointment.startDate)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRevenueAmount(appointment.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-testid="revenue-week-appointments-empty"
            >
              Keine Aufträge in dieser Woche.
            </p>
          )}
        </div>
      ) : null}
    </DialogBaseShell>
  );
}
