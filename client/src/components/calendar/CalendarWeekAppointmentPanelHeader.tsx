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
  const resolvedStartTime = startTime?.trim() || null;
  const formattedStartDate = Number.isNaN(startDateValue.getTime())
    ? startDate
    : new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(startDateValue);
  const dayCountLabel = `${dayCount} ${dayCount === 1 ? "Tag" : "Tage"}`;
  const TimingIcon = dayCount > 1 ? CalendarRange : hasStartTime ? Clock3 : CalendarDays;
  const topLineItems = [resolvedStartTime, formattedStartDate, dayCountLabel].filter(Boolean);

  const textColor = (() => {
    if (!color.startsWith("#")) return "#1a1a1a";
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
  })();

  return (
    <div
      className={connectedToNextRow ? "rounded-t-md rounded-b-none border px-2 py-1" : "rounded-md border px-2 py-1"}
      style={{
        backgroundColor: color,
        color: textColor,
        borderColor: "rgba(255,255,255,0.22)",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
      }}
    >
      <div className="space-y-1 text-[10px] font-semibold tracking-wide">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center"
            title={dayCount > 1 ? "Mehrtagestermin" : hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}
          >
            <TimingIcon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="truncate">{topLineItems.join(" | ")}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-1">
          <span className="truncate">K: {resolvedCustomerNumber}</span>
          <span className="truncate text-right">PLZ: {resolvedPostalCode}</span>
        </div>
      </div>
    </div>
  );
}
