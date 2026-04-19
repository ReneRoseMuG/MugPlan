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
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  testId?: string;
  className?: string;
};

const CUSTOMER_DETAIL_TEXT_INDENT_CLASSNAME = "pl-[18px]";

function CustomerHeader({ fullName, customerNumber }: { fullName: string | null; customerNumber: string }) {
  const CustomerIcon = domainIcons.customers;
  return (
    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      <CustomerIcon className="h-3 w-3 flex-shrink-0 text-slate-500" />
      <h5 className="min-w-0 truncate text-xs font-semibold text-slate-800">{fullName ?? "-"}</h5>
      <span className="shrink-0 text-[11px] text-slate-500"> - {customerNumber}</span>
    </div>
  );
}

function StructuredInfoLine({
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
      className={cn(
        "min-w-0 overflow-hidden text-[11px] leading-tight whitespace-nowrap text-ellipsis",
        hasValue ? "text-slate-600" : "select-none text-transparent",
      )}
      data-testid={testId}
      aria-hidden={hasValue ? undefined : true}
    >
      {hasValue ? trimmedValue : "\u00A0"}
    </div>
  );
}

function AddressBlock({
  addressLine1,
  postalCode,
  city,
  country,
}: {
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  return (
    <div className="min-w-0 space-y-0.5">
      {addressLine1?.trim() && <StructuredInfoLine value={addressLine1} testId="customer-info-line-address" />}
      {cityLine && <StructuredInfoLine value={cityLine} testId="customer-info-line-city" />}
      {country?.trim() && <StructuredInfoLine value={country} testId="customer-info-line-country" />}
    </div>
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
      className={cn(
        "min-h-[14px] min-w-0 overflow-hidden text-[11px] leading-tight whitespace-nowrap text-ellipsis",
        hasValue ? "text-slate-600" : "select-none text-transparent",
      )}
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
  country,
  phone,
  email,
}: Omit<CustomerInfoPanelProps, "mode" | "testId">) {
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  const detailTextBlockClassName = cn("min-w-0 space-y-0.5", !hideHeader && CUSTOMER_DETAIL_TEXT_INDENT_CLASSNAME);

  if (hideHeader) {
    return (
      <div className="space-y-0.5">
        <CustomerInfoLine value={addressLine1} testId="customer-info-line-address" />
        <CustomerInfoLine value={cityLine} testId="customer-info-line-city" />
        <CustomerInfoLine value={country} testId="customer-info-line-country" />
        <CustomerInfoLine value={phone} testId="customer-info-line-phone" />
        <CustomerInfoLine value={email} testId="customer-info-line-email" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-0.5">
      <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
      <div className={detailTextBlockClassName} data-testid="customer-info-detail-block">
        <AddressBlock addressLine1={addressLine1} postalCode={postalCode} city={city} country={country} />
        {phone?.trim() && <StructuredInfoLine value={phone} testId="customer-info-line-phone" />}
        {email?.trim() && <StructuredInfoLine value={email} testId="customer-info-line-email" />}
      </div>
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
  country,
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
              country={country}
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
          className={cn("cursor-pointer rounded-md border border-slate-200/90 bg-white px-2 py-1.5", className)}
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
        className={cn("rounded-md border border-slate-200/90 bg-white px-2 py-1.5", className)}
        data-testid={testId ?? "customer-info-panel-semiexpanded"}
      >
        <CustomerHeader fullName={fullName} customerNumber={customerNumber} />
        <AddressBlock addressLine1={addressLine1} postalCode={postalCode} city={city} country={country} />
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-md border border-slate-200/90 bg-white px-2 py-1.5", className)}
      data-testid={testId ?? "customer-info-panel-expanded"}
    >
      <ExpandedContent
        hideHeader={hideHeader}
        fullName={fullName}
        customerNumber={customerNumber}
        addressLine1={addressLine1}
        postalCode={postalCode}
        city={city}
        country={country}
        phone={phone}
        email={email}
      />
    </div>
  );
}
