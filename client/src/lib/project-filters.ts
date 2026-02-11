import type { Customer, Project } from "@shared/schema";

export interface ProjectFilters {
  title: string;
  customerLastName: string;
  customerNumber: string;
  statusIds: number[];
}

export type ProjectScope = "upcoming" | "noAppointments";

export const defaultProjectFilters: ProjectFilters = {
  title: "",
  customerLastName: "",
  customerNumber: "",
  statusIds: [],
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

    return matchesTitle && matchesCustomerLastName && matchesCustomerNumber;
  });
}

export function buildProjectFilterQueryParams(
  filters: ProjectFilters,
  scope: ProjectScope,
): string {
  const params = new URLSearchParams();
  params.set("scope", scope);

  if (filters.statusIds.length > 0) {
    params.set("statusIds", filters.statusIds.join(","));
  }

  return params.toString();
}
