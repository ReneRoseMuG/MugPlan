import React from "react";
import type { Customer } from "@shared/schema";

export interface CustomerDetailCardProps {
  customer: Pick<
    Customer,
    | "fullName"
    | "firstName"
    | "lastName"
    | "customerNumber"
    | "company"
    | "phone"
    | "email"
    | "addressLine1"
    | "postalCode"
    | "city"
    | "country"
  >;
  testId?: string;
  variant?: "default" | "relationCompact";
}

const fallbackText = "nicht hinterlegt";

const resolveValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackText;
};

const resolveCompactCustomerNumber = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return fallbackText;
  return trimmed.slice(0, 10);
};

const resolveCompactPostalCode = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return fallbackText;
  return trimmed.slice(0, 6);
};

export function CustomerDetailCard({ customer, testId, variant = "default" }: CustomerDetailCardProps) {
  const addressParts = [customer.postalCode?.trim(), customer.city?.trim()].filter(Boolean);
  const addressLine2 = addressParts.length > 0 ? addressParts.join(" ") : fallbackText;

  const renderCompactItem = (label: string, value: string, dataTestId?: string) => (
    <div className="rounded-md border border-border/50 bg-background/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate" data-testid={dataTestId}>{value}</div>
    </div>
  );

  const detailItems = [
    { label: "Kundennr.", value: resolveValue(customer.customerNumber), dataTestId: testId ? `${testId}-number` : undefined },
    { label: "Firma", value: resolveValue(customer.company) },
    { label: "Telefon", value: resolveValue(customer.phone), dataTestId: testId ? `${testId}-phone` : undefined },
    { label: "E-Mail", value: resolveValue(customer.email) },
    { label: "Adresse", value: resolveValue(customer.addressLine1) },
    { label: "PLZ/Ort", value: addressLine2 },
    { label: "Land", value: resolveValue(customer.country), dataTestId: testId ? `${testId}-country` : undefined },
  ];

  return (
    <div className="space-y-2" data-testid={testId}>
      {variant === "default" ? (
        <div className="text-sm font-semibold text-foreground" data-testid={testId ? `${testId}-name` : undefined}>
          {resolveValue(customer.fullName)}
        </div>
      ) : null}
      {variant === "relationCompact" ? (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 gap-2">
            {renderCompactItem("Kundennr.", resolveCompactCustomerNumber(customer.customerNumber), testId ? `${testId}-number` : undefined)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {renderCompactItem("Vorname", resolveValue(customer.firstName), testId ? `${testId}-first-name` : undefined)}
            {renderCompactItem("Name", resolveValue(customer.lastName), testId ? `${testId}-last-name` : undefined)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {renderCompactItem("Telefon", resolveValue(customer.phone), testId ? `${testId}-phone` : undefined)}
            {renderCompactItem("Adresse", resolveValue(customer.addressLine1))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {renderCompactItem("PLZ", resolveCompactPostalCode(customer.postalCode), testId ? `${testId}-postal-code` : undefined)}
            {renderCompactItem("Ort", resolveValue(customer.city), testId ? `${testId}-city` : undefined)}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {renderCompactItem("Land", resolveValue(customer.country), testId ? `${testId}-country` : undefined)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {detailItems.map((item) => (
            <div key={item.label} className="rounded-md border border-border/50 bg-background/50 px-3 py-2">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="truncate" data-testid={item.dataTestId}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
