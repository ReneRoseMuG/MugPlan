import React from "react";
import type { Customer } from "@shared/schema";

export interface CustomerDetailCardProps {
  customer: Pick<
    Customer,
    | "fullName"
    | "customerNumber"
    | "company"
    | "phone"
    | "email"
    | "addressLine1"
    | "postalCode"
    | "city"
  >;
  testId?: string;
}

const fallbackText = "nicht hinterlegt";

const resolveValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackText;
};

export function CustomerDetailCard({ customer, testId }: CustomerDetailCardProps) {
  const addressParts = [customer.postalCode?.trim(), customer.city?.trim()].filter(Boolean);
  const addressLine2 = addressParts.length > 0 ? addressParts.join(" ") : fallbackText;

  const detailItems = [
    { label: "Kundennr.", value: resolveValue(customer.customerNumber), dataTestId: testId ? `${testId}-number` : undefined },
    { label: "Firma", value: resolveValue(customer.company) },
    { label: "Telefon", value: resolveValue(customer.phone), dataTestId: testId ? `${testId}-phone` : undefined },
    { label: "E-Mail", value: resolveValue(customer.email) },
    { label: "Adresse", value: resolveValue(customer.addressLine1) },
    { label: "PLZ/Ort", value: addressLine2 },
  ];

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="text-sm font-semibold text-foreground" data-testid={testId ? `${testId}-name` : undefined}>
        {resolveValue(customer.fullName)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {detailItems.map((item) => (
          <div key={item.label} className="rounded-md border border-border/50 bg-background/50 px-3 py-2">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="truncate" data-testid={item.dataTestId}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
