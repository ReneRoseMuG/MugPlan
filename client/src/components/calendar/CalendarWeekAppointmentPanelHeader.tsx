import { CalendarDays, CalendarRange, Clock3 } from "lucide-react";

export function CalendarWeekAppointmentPanelHeader({
  customerNumber,
  postalCode,
  color,
  startDate,
  endDate,
  startTime,
  connectedToNextRow = false,
}: {
  customerNumber: string;
  postalCode: string | null;
  color: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  connectedToNextRow?: boolean;
}) {
  const resolvedCustomerNumber = customerNumber.trim() || "-";
  const resolvedPostalCode = postalCode?.trim() || "-";
  const hasStartTime = Boolean(startTime?.trim());
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const endDateValue = endDate ? new Date(`${endDate}T00:00:00`) : startDateValue;
  const dayCount = Number.isNaN(startDateValue.getTime()) || Number.isNaN(endDateValue.getTime())
    ? 1
    : Math.max(1, Math.round((endDateValue.getTime() - startDateValue.getTime()) / 86400000) + 1);
  const formattedStartDate = Number.isNaN(startDateValue.getTime())
    ? startDate
    : new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(startDateValue);
  const dayCountLabel = `${dayCount} ${dayCount === 1 ? "Tag" : "Tage"}`;
  const TimingIcon = dayCount > 1 ? CalendarRange : hasStartTime ? Clock3 : CalendarDays;
  const resolvedStartTime = startTime?.trim().slice(0, 5) || null;
  const topLineItems = [resolvedStartTime, formattedStartDate].filter(Boolean);

  return (
    <div
      className={connectedToNextRow ? "rounded-t-md rounded-b-none border px-2 py-1" : "rounded-md border px-2 py-1"}
      style={{
        backgroundColor: color,
        color: "#ffffff",
        borderColor: "rgba(255,255,255,0.22)",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
      }}
    >
      <div className="space-y-1 text-[10px] font-semibold tracking-wide">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span
            className="inline-flex items-center justify-center"
            title={dayCount > 1 ? "Mehrtagestermin" : hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}
          >
            <TimingIcon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 text-center">
            <span className="truncate">{topLineItems.join(" | ")}</span>
          </div>
          <span
            className="shrink-0 text-right justify-self-end"
            title={dayCount > 1 ? "Mehrtagestermin" : hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}
          >
            {dayCountLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-1">
          <span className="truncate">K: {resolvedCustomerNumber}</span>
          <span className="truncate text-right">PLZ: {resolvedPostalCode}</span>
        </div>
      </div>
    </div>
  );
}
