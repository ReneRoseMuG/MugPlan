import type { Customer } from "@shared/schema";

export interface CustomerFilters {
  lastName: string;
  customerNumber: string;
}

export const defaultCustomerFilters: CustomerFilters = {
  lastName: "",
  customerNumber: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeNumber = (value: string) => value.trim();

export function applyCustomerFilters(
  customers: Customer[],
  filters: CustomerFilters,
): Customer[] {
  const normalizedLastName = normalizeText(filters.lastName);
  const normalizedCustomerNumber = normalizeNumber(filters.customerNumber);

  return customers.filter((customer) => {
    const matchesLastName = normalizedLastName
      ? (customer.lastName ?? "").toLowerCase().includes(normalizedLastName)
      : true;
    const matchesCustomerNumber = normalizedCustomerNumber
      ? (customer.customerNumber ?? "").includes(normalizedCustomerNumber)
      : true;

    return matchesLastName && matchesCustomerNumber;
  });
}
