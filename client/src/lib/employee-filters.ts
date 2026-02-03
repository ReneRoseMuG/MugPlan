import type { Employee } from "@shared/schema";

export interface EmployeeFilters {
  lastName: string;
}

export const defaultEmployeeFilters: EmployeeFilters = {
  lastName: "",
};

export function applyEmployeeFilters(
  employees: Employee[],
  filters: EmployeeFilters,
): Employee[] {
  const normalizedLastName = filters.lastName.trim().toLowerCase();

  return employees.filter((employee) => {
    if (!normalizedLastName) {
      return true;
    }

    return (employee.lastName ?? "").toLowerCase().includes(normalizedLastName);
  });
}
