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

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="text-sm font-semibold text-foreground" data-testid={testId ? `${testId}-name` : undefined}>
        {resolveValue(customer.fullName)}
      </div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Kundennr.</dt>
        <dd data-testid={testId ? `${testId}-number` : undefined}>{resolveValue(customer.customerNumber)}</dd>
        <dt className="text-muted-foreground">Firma</dt>
        <dd>{resolveValue(customer.company)}</dd>
        <dt className="text-muted-foreground">Telefon</dt>
        <dd data-testid={testId ? `${testId}-phone` : undefined}>{resolveValue(customer.phone)}</dd>
        <dt className="text-muted-foreground">E-Mail</dt>
        <dd>{resolveValue(customer.email)}</dd>
        <dt className="text-muted-foreground">Adresse</dt>
        <dd>{resolveValue(customer.addressLine1)}</dd>
        <dt className="text-muted-foreground">PLZ/Ort</dt>
        <dd>{addressLine2}</dd>
      </dl>
    </div>
  );
}
