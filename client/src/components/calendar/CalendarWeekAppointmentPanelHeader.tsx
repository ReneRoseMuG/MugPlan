export function CalendarWeekAppointmentPanelHeader({
  customerNumber,
  postalCode,
  color,
}: {
  customerNumber: string;
  postalCode: string | null;
  color: string;
}) {
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
      className="rounded-md border px-2 py-1"
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
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span className="truncate">K: {customerNumber}</span>
        <span className="truncate text-right">PLZ: {postalCode ?? "-"}</span>
      </div>
    </div>
  );
}
