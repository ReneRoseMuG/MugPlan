import type { Customer, Project } from "@shared/schema";

export interface ProjectFilters {
  title: string;
  customerLastName: string;
  customerNumber: string;
  orderNumber: string;
  tagIds: number[];
}

export type ProjectScope = "upcoming" | "noAppointments" | "all";

export const defaultProjectFilters: ProjectFilters = {
  title: "",
  customerLastName: "",
  customerNumber: "",
  orderNumber: "",
  tagIds: [],
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeNumber = (value: string) => value.trim();

export function applyProjectFilters(
  projects: Project[],
  filters: ProjectFilters,
  customersById: Map<number, Customer>,
): Project[] {
  const normalizedTitle = normalizeText(filters.title);
  const normalizedCustomerLastName = normalizeText(filters.customerLastName);
  const normalizedCustomerNumber = normalizeNumber(filters.customerNumber);
  const normalizedOrderNumber = normalizeNumber(filters.orderNumber);

  return projects.filter((project) => {
    const customer = customersById.get(project.customerId);
    const matchesTitle = normalizedTitle
      ? (project.name ?? "").toLowerCase().includes(normalizedTitle)
      : true;
    const matchesCustomerLastName = normalizedCustomerLastName
      ? (customer?.lastName ?? "").toLowerCase().includes(normalizedCustomerLastName)
      : true;
    const matchesCustomerNumber = normalizedCustomerNumber
      ? (customer?.customerNumber ?? "").includes(normalizedCustomerNumber)
      : true;
    const matchesOrderNumber = normalizedOrderNumber
      ? (project.orderNumber ?? "").includes(normalizedOrderNumber)
      : true;

    return matchesTitle && matchesCustomerLastName && matchesCustomerNumber && matchesOrderNumber;
  });
}

export function buildProjectFilterQueryParams(
  _filters: ProjectFilters,
  scope: ProjectScope,
): string {
  const params = new URLSearchParams();
  params.set("scope", scope);

  return params.toString();
}
