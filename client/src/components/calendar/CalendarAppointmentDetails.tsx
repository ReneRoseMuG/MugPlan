import { Badge } from "@/components/ui/badge";
import { Calendar, Route, Users } from "lucide-react";
import { formatDateLabel, getAppointmentEndDate, getAppointmentTimeLabel } from "@/lib/calendar-utils";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type Variant = "popover" | "panel";

export function CalendarAppointmentDetails({
  appointment,
  variant,
}: {
  appointment: CalendarAppointment;
  variant: Variant;
}) {
  const startLabel = formatDateLabel(appointment.startDate);
  const endLabel = formatDateLabel(getAppointmentEndDate(appointment));
  const timeLabel = getAppointmentTimeLabel(appointment);
  const hasEmployees = appointment.employees.length > 0;
  const hasStatuses = appointment.projectStatuses.length > 0;

  return (
    <div className={variant === "popover" ? "space-y-3" : "space-y-4"}>
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Projekt</div>
        <div className="font-semibold text-sm text-slate-800">{appointment.projectName}</div>
        {appointment.projectDescription && (
          <p className="text-xs text-slate-600 leading-relaxed">{appointment.projectDescription}</p>
        )}
        {hasStatuses && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {appointment.projectStatuses.map((status) => (
              <Badge
                key={status.id}
                variant="secondary"
                className="text-[10px] font-semibold border"
                style={{ borderColor: status.color, color: status.color }}
              >
                {status.title}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Kunde</div>
        <div className="text-sm font-medium text-slate-800">{appointment.customer.fullName}</div>
        <div className="text-xs text-slate-600">
          Nr. {appointment.customer.customerNumber}
          {appointment.customer.postalCode && (
            <span> · {appointment.customer.postalCode}</span>
          )}
          {appointment.customer.city && (
            <span> {appointment.customer.city}</span>
          )}
        </div>
      </div>

      {hasEmployees && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>Mitarbeiter</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs text-slate-700">
            {appointment.employees.map((employee) => (
              <span
                key={employee.id}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {employee.fullName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>
            {startLabel}
            {startLabel !== endLabel && <span> – {endLabel}</span>}
            {timeLabel && <span> · {timeLabel} Uhr</span>}
          </span>
        </div>
        {appointment.tourName && (
          <div className="flex items-center gap-1.5">
            <Route className="w-3 h-3" style={{ color: appointment.tourColor ?? undefined }} />
            <span>{appointment.tourName}</span>
          </div>
        )}
      </div>

    </div>
  );
}
