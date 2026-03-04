import { CalendarDays, Clock3 } from "lucide-react";

export function CalendarWeekAppointmentPanelHeader({
  customerNumber,
  orderNumber,
  postalCode,
  color,
  hasStartTime,
  connectedToNextRow = false,
}: {
  customerNumber: string;
  orderNumber: string | null;
  postalCode: string | null;
  color: string;
  hasStartTime: boolean;
  connectedToNextRow?: boolean;
}) {
  const resolvedCustomerNumber = customerNumber.trim() || "-";
  const resolvedOrderNumber = orderNumber?.trim() || "-";
  const resolvedPostalCode = postalCode?.trim() || "-";
  const TimingIcon = hasStartTime ? Clock3 : CalendarDays;

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
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-[10px] font-semibold tracking-wide">
        <span className="inline-flex items-center justify-center" title={hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}>
          <TimingIcon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="truncate">K: {resolvedCustomerNumber}</span>
        <span className="truncate text-center">{resolvedOrderNumber}</span>
        <span className="truncate text-right">PLZ: {resolvedPostalCode}</span>
      </div>
    </div>
  );
}
