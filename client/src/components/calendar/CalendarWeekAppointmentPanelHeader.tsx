export function CalendarWeekAppointmentPanelHeader({
  customerNumber,
  postalCode,
}: {
  customerNumber: string;
  postalCode: string | null;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1">
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
        <span className="truncate">K: {customerNumber}</span>
        <span className="truncate text-right">PLZ: {postalCode ?? "-"}</span>
      </div>
    </div>
  );
}
