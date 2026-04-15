import type { MonitoringListResponse } from "@shared/routes";
import type { MonitoringTriggerCode } from "@shared/monitoring";

export type MonitoringFilters = {
  customerLastName: string;
  customerNumber: string;
  projectTitle: string;
  orderNumber: string;
  tourId?: number;
  triggerCode?: MonitoringTriggerCode;
};

export const defaultMonitoringFilters: MonitoringFilters = {
  customerLastName: "",
  customerNumber: "",
  projectTitle: "",
  orderNumber: "",
  tourId: undefined,
  triggerCode: undefined,
};

type MonitoringListItem = MonitoringListResponse[number];

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeIdentifier(value: string | null | undefined): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function formatMonitoringCustomerName(
  item: Pick<MonitoringListItem, "customerFirstName" | "customerLastName" | "customerName">,
): string {
  const customerLastName = item.customerLastName?.trim() ?? "";
  const customerFirstName = item.customerFirstName?.trim() ?? "";

  if (customerLastName && customerFirstName) {
    return `${customerLastName}, ${customerFirstName}`;
  }
  if (customerLastName) {
    return customerLastName;
  }
  if (customerFirstName) {
    return customerFirstName;
  }
  return item.customerName?.trim() ?? "";
}

function matchesText(values: Array<string | null | undefined>, normalizedFilter: string): boolean {
  if (!normalizedFilter) return true;
  return values
    .map(normalizeText)
    .some((value) => value.includes(normalizedFilter));
}

function matchesIdentifier(values: Array<string | null | undefined>, normalizedFilter: string): boolean {
  if (!normalizedFilter) return true;
  return values
    .map(normalizeIdentifier)
    .some((value) => value.includes(normalizedFilter));
}

export function applyMonitoringFilters(
  items: MonitoringListResponse | undefined,
  filters: MonitoringFilters,
): MonitoringListResponse {
  const normalizedCustomerLastName = normalizeText(filters.customerLastName);
  const normalizedCustomerNumber = normalizeIdentifier(filters.customerNumber);
  const normalizedProjectTitle = normalizeText(filters.projectTitle);
  const normalizedOrderNumber = normalizeIdentifier(filters.orderNumber);

  return (items ?? []).filter((item) => {
    if (!matchesText([
      item.customerLastName,
      item.customerFirstName,
      formatMonitoringCustomerName(item),
      item.customerName,
    ], normalizedCustomerLastName)) {
      return false;
    }

    if (!matchesIdentifier([item.customerNumber], normalizedCustomerNumber)) {
      return false;
    }

    if (!matchesText([item.projectTitle, item.projectName], normalizedProjectTitle)) {
      return false;
    }

    if (!matchesIdentifier([item.orderNumber], normalizedOrderNumber)) {
      return false;
    }

    if (filters.tourId !== undefined && item.tourId !== filters.tourId) {
      return false;
    }

    if (filters.triggerCode !== undefined && !item.triggerCodes.includes(filters.triggerCode)) {
      return false;
    }

    return true;
  });
}
