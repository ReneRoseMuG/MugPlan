import { HoverPreview } from "@/components/ui/hover-preview";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";

export function CalendarWeekAppointmentPanelCustomer({
  fullName,
  customerNumber,
  addressLine1,
  addressLine2,
  postalCode,
  city,
  showSectionTitle = false,
}: {
  fullName: string;
  customerNumber: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode: string | null;
  city: string | null;
  showSectionTitle?: boolean;
}) {
  const lineOne = addressLine1 ?? "-";
  const lineTwo = [postalCode, city].filter(Boolean).join(" ").trim() || addressLine2 || "-";
  const customerPreview = {
    fullName: fullName || null,
    firstName: null,
    lastName: null,
    customerNumber,
    company: null,
    phone: null,
    email: null,
    addressLine1: addressLine1 ?? null,
    postalCode,
    city,
  };

  return (
    <HoverPreview
      preview={(
        <div className="rounded-lg bg-white p-3">
          <CustomerDetailCard customer={customerPreview} testId="week-customer-preview" />
        </div>
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={360}
      maxHeight={320}
      className="z-[9999] w-[360px]"
    >
      <div className="cursor-pointer rounded-md border border-slate-200/90 px-2 py-1.5" data-testid="week-customer-hover-trigger">
        {showSectionTitle && <div className="mb-1 text-[10px] font-semibold text-slate-500">Kunde</div>}
        <div className="text-xs font-semibold text-slate-800">{fullName}</div>
        <div className="text-[11px] leading-tight text-slate-600">{lineOne}</div>
        <div className="text-[11px] leading-tight text-slate-600">{lineTwo}</div>
      </div>
    </HoverPreview>
  );
}
