import { HoverPreview } from "@/components/ui/hover-preview";
import { domainIcons } from "@/lib/domain-icons";

type CustomerInfoPanelProps = {
  mode: "collapsed" | "semiexpanded" | "expanded";
  hideHeader?: boolean;
  fullName: string | null;
  customerNumber: string;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  testId?: string;
};

function CustomerHeader({ fullName, customerNumber }: { fullName: string | null; customerNumber: string }) {
  const CustomerIcon = domainIcons.customers;
  return (
    <div className="flex items-center gap-1.5">
      <CustomerIcon className="h-3 w-3 flex-shrink-0 text-slate-500" />
      <h5 className="text-xs font-semibold text-slate-800">{fullName ?? "-"}</h5>
      <span className="text-[11px] text-slate-500"> - {customerNumber}</span>
    </div>
  );
}

function AddressBlock({
  addressLine1,
  postalCode,
  city,
}: {
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  return (
    <>
      {addressLine1?.trim() && (
        <div className="text-[11px] leading-tight text-slate-600">{addressLine1}</div>
      )}
      {cityLine && (
        <div className="text-[11px] leading-tight text-slate-600">{cityLine}</div>
      )}
    </>
  );
}

function ExpandedContent({
  hideHeader,
  fullName,
  customerNumber,
  addressLine1,
  postalCode,
  city,
  phone,
  email,
}: Omit<CustomerInfoPanelProps, "mode" | "testId">) {
  return (
    <div className="space-y-0.5">
      {!hideHeader && <CustomerHeader fullName={fullName} customerNumber={customerNumber} />}
      <AddressBlock addressLine1={addressLine1} postalCode={postalCode} city={city} />
      {phone?.trim() && (
        <div className="text-[11px] leading-tight text-slate-600">{phone}</div>
      )}
      {email?.trim() && (
        <div className="text-[11px] leading-tight text-slate-600">{email}</div>
      )}
    </div>
  );
}

export function CustomerInfoPanel({
  mode,
  hideHeader,
  fullName,
  customerNumber,
  addressLine1,
  postalCode,
  city,
  phone,
  email,
  testId,
}: CustomerInfoPanelProps) {
  if (mode === "collapsed") {
    return (
      <HoverPreview
        preview={(
          <div className="rounded-lg bg-white p-3">
            <ExpandedContent
              hideHeader={false}
              fullName={fullName}
              customerNumber={customerNumber}
              addressLine1={addressLine1}
              postalCode={postalCode}
              city={city}
              phone={phone}
              email={email}
            />
          </div>
        )}
        closeDelay={80}
        side="right"
        align="start"
        maxWidth={360}
      >
        <div
          className="cursor-pointer rounded-md border border-slate-200/90 px-2 py-1.5"
          data-testid={testId ?? "customer-info-panel-collapsed"}
        >
          <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
        </div>
      </HoverPreview>
    );
  }

  if (mode === "semiexpanded") {
    return (
      <div
        className="rounded-md border border-slate-200/90 px-2 py-1.5"
        data-testid={testId ?? "customer-info-panel-semiexpanded"}
      >
        <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
        <AddressBlock addressLine1={addressLine1} postalCode={postalCode} city={city} />
      </div>
    );
  }

  return (
    <div
      className="rounded-md border border-slate-200/90 px-2 py-1.5"
      data-testid={testId ?? "customer-info-panel-expanded"}
    >
      <ExpandedContent
        hideHeader={hideHeader}
        fullName={fullName}
        customerNumber={customerNumber}
        addressLine1={addressLine1}
        postalCode={postalCode}
        city={city}
        phone={phone}
        email={email}
      />
    </div>
  );
}
