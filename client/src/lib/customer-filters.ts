import type { Customer } from "@shared/schema";

export interface CustomerFilters {
  lastName: string;
  customerNumber: string;
}

export const defaultCustomerFilters: CustomerFilters = {
  lastName: "",
  customerNumber: "",
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const normalizeNumber = (value: string) => value.trim();

export function applyCustomerFilters(
  customers: Customer[],
  filters: CustomerFilters,
): Customer[] {
  const normalizedLastName = normalizeText(filters.lastName);
  const normalizedCustomerNumber = normalizeNumber(filters.customerNumber);

  return customers.filter((customer) => {
    const matchesLastName = normalizedLastName
      ? [
          customer.lastName ?? "",
          customer.firstName ?? "",
          customer.fullName ?? "",
        ]
          .map(normalizeText)
          .some((value) => value.includes(normalizedLastName))
      : true;
    const matchesCustomerNumber = normalizedCustomerNumber
      ? (customer.customerNumber ?? "").includes(normalizedCustomerNumber)
      : true;

    return matchesLastName && matchesCustomerNumber;
  });
}
