import { CustomerInfoPanel } from "@/components/ui/customer-info-panel";

export function CalendarWeekAppointmentPanelCustomer({
  mode = "collapsed",
  fullName,
  customerNumber,
  phone,
  email,
  addressLine1,
  postalCode,
  city,
  country,
  className,
}: {
  mode?: "collapsed" | "semiexpanded" | "expanded";
  fullName: string;
  customerNumber: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  postalCode: string | null;
  city: string | null;
  country?: string | null;
  className?: string;
}) {
  return (
    <CustomerInfoPanel
      mode={mode}
      fullName={fullName || null}
      customerNumber={customerNumber}
      addressLine1={addressLine1}
      postalCode={postalCode}
      city={city}
      country={country}
      phone={phone}
      email={email}
      testId="week-customer-panel"
      className={className}
    />
  );
}
