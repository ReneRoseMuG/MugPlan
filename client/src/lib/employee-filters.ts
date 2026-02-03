import type { Employee } from "@shared/schema";

export interface EmployeeFilters {
  lastName: string;
}

export const defaultEmployeeFilters: EmployeeFilters = {
  lastName: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export function applyEmployeeFilters(
  employees: Employee[],
  filters: EmployeeFilters,
): Employee[] {
  const normalizedLastName = normalizeText(filters.lastName);

  return employees.filter((employee) => {
    if (!normalizedLastName) {
      return true;
    }

    return (employee.lastName ?? "").toLowerCase().includes(normalizedLastName);
  });
}
