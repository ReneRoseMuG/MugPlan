export interface EmployeeFilters {
  lastName: string;
}

export const defaultEmployeeFilters: EmployeeFilters = {
  lastName: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export function applyEmployeeFilters<TEmployee extends { lastName: string }>(
  employees: TEmployee[],
  filters: EmployeeFilters,
): TEmployee[] {
  const normalizedLastName = normalizeText(filters.lastName);

  return employees.filter((employee) => {
    if (!normalizedLastName) {
      return true;
    }

    return (employee.lastName ?? "").toLowerCase().includes(normalizedLastName);
  });
}
