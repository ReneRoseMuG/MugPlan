import React from "react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { domainIcons } from "@/lib/domain-icons";
import { cn } from "@/lib/utils";

const PANEL_PREVIEW_CURSOR_OFFSET_PX = 20;

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
  className?: string;
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

function CustomerInfoLine({
  value,
  testId,
}: {
  value?: string | null;
  testId?: string;
}) {
  const trimmedValue = value?.trim() ?? "";
  const hasValue = trimmedValue.length > 0;

  return (
    <div
      className={cn("min-h-[14px] text-[11px] leading-tight", hasValue ? "text-slate-600" : "select-none text-transparent")}
      data-testid={testId}
      aria-hidden={hasValue ? undefined : true}
    >
      {hasValue ? trimmedValue : "\u00A0"}
    </div>
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
  const cityLine = [postalCode, city].filter(Boolean).join(" ");

  if (hideHeader) {
    return (
      <div className="space-y-0.5">
        <CustomerInfoLine value={addressLine1} testId="customer-info-line-address" />
        <CustomerInfoLine value={cityLine} testId="customer-info-line-city" />
        <CustomerInfoLine value={phone} testId="customer-info-line-phone" />
        <CustomerInfoLine value={email} testId="customer-info-line-email" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
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
  className,
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
        mode="cursor"
        side="right"
        align="start"
        cursorOffsetX={PANEL_PREVIEW_CURSOR_OFFSET_PX}
        cursorOffsetY={PANEL_PREVIEW_CURSOR_OFFSET_PX}
        maxWidth={360}
      >
        <div
          className={cn("cursor-pointer rounded-md border border-slate-200/90 bg-white px-1.5 py-1", className)}
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
        className={cn("rounded-md border border-slate-200/90 bg-white px-1.5 py-1", className)}
        data-testid={testId ?? "customer-info-panel-semiexpanded"}
      >
        <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
        <AddressBlock addressLine1={addressLine1} postalCode={postalCode} city={city} />
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-md border border-slate-200/90 bg-white px-1.5 py-1", className)}
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
