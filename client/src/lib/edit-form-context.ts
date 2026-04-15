import { formatListDate, formatListDateRange, formatListTime } from "@/lib/list-display-format";

type OptionalText = string | null | undefined;

type CustomerLabelSource = {
  fullName?: OptionalText;
  firstName?: OptionalText;
  lastName?: OptionalText;
  company?: OptionalText;
  customerNumber?: OptionalText;
};

type EmployeeLabelSource = {
  fullName?: OptionalText;
  firstName?: OptionalText;
  lastName?: OptionalText;
};

function normalizeText(value: OptionalText): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function joinEditFormContext(parts: OptionalText[]): string | null {
  const visibleParts = parts
    .map((part) => normalizeText(part))
    .filter((part): part is string => part !== null);

  return visibleParts.length > 0 ? visibleParts.join(" • ") : null;
}

export function resolveCustomerEditLabel(customer: CustomerLabelSource | null | undefined): string | null {
  if (!customer) return null;

  return (
    normalizeText(customer.fullName)
    ?? normalizeText(customer.company)
    ?? joinEditFormContext([customer.firstName, customer.lastName])
    ?? normalizeText(customer.customerNumber)
  );
}

export function resolveEmployeeEditLabel(employee: EmployeeLabelSource | null | undefined): string | null {
  if (!employee) return null;

  return (
    normalizeText(employee.fullName)
    ?? joinEditFormContext([employee.firstName, employee.lastName])
  );
}

export function formatAppointmentEditContext(params: {
  startDate?: OptionalText;
  startTime?: OptionalText;
  tourName?: OptionalText;
  customerName?: OptionalText;
}): string | null {
  const dateLabel = formatListDate(params.startDate);
  const timeLabel = formatListTime(params.startTime);
  const dateTimeLabel = joinEditFormContext([
    dateLabel || null,
    timeLabel ? `${timeLabel} Uhr` : null,
  ]);

  return joinEditFormContext([
    dateTimeLabel,
    params.tourName,
    params.customerName,
  ]);
}

export function formatAbsenceEditContext(params: {
  from?: OptionalText;
  until?: OptionalText;
  typeLabel?: OptionalText;
}): string | null {
  return joinEditFormContext([
    formatListDateRange(params.from, params.until) || null,
    params.typeLabel,
  ]);
}
