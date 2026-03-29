import { CustomerInfoPanel } from "@/components/ui/customer-info-panel";

export function CalendarWeekAppointmentPanelCustomer({
  fullName,
  customerNumber,
  phone,
  email,
  addressLine1,
  postalCode,
  city,
}: {
  fullName: string;
  customerNumber: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  postalCode: string | null;
  city: string | null;
}) {
  return (
    <CustomerInfoPanel
      mode="collapsed"
      fullName={fullName || null}
      customerNumber={customerNumber}
      addressLine1={addressLine1}
      postalCode={postalCode}
      city={city}
      phone={phone}
      email={email}
      testId="week-customer-panel"
    />
  );
}
