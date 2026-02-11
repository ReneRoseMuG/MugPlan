export function CalendarWeekAppointmentPanelCustomer({
  fullName,
  addressLine1,
  addressLine2,
  postalCode,
  city,
  showSectionTitle = false,
}: {
  fullName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode: string | null;
  city: string | null;
  showSectionTitle?: boolean;
}) {
  const lineOne = addressLine1 ?? "-";
  const lineTwo = [postalCode, city].filter(Boolean).join(" ").trim() || addressLine2 || "-";

  return (
    <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Kunde</div>}
      <div className="text-xs font-semibold text-slate-800">{fullName}</div>
      <div className="text-[11px] text-slate-600 leading-tight">{lineOne}</div>
      <div className="text-[11px] text-slate-600 leading-tight">{lineTwo}</div>
    </div>
  );
}
