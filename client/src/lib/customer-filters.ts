import type { Customer } from "@shared/schema";

export interface CustomerFilters {
  lastName: string;
  customerNumber: string;
}

export const defaultCustomerFilters: CustomerFilters = {
  lastName: "",
  customerNumber: "",
};

export function applyCustomerFilters(
  customers: Customer[],
  filters: CustomerFilters,
): Customer[] {
  const normalizedLastName = filters.lastName.trim().toLowerCase();
  const normalizedCustomerNumber = filters.customerNumber.trim();

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
