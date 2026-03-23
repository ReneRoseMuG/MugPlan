export interface EmployeeFilters {
  lastName: string;
  firstName: string;
}

export const defaultEmployeeFilters: EmployeeFilters = {
  lastName: "",
  firstName: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export function applyEmployeeFilters<TEmployee extends { lastName: string; firstName: string }>(
  employees: TEmployee[],
  filters: EmployeeFilters,
): TEmployee[] {
  const normalizedLastName = normalizeText(filters.lastName);
  const normalizedFirstName = normalizeText(filters.firstName);

  return employees.filter((employee) => {
    if (normalizedLastName && !(employee.lastName ?? "").toLowerCase().includes(normalizedLastName)) {
      return false;
    }
    if (normalizedFirstName && !(employee.firstName ?? "").toLowerCase().includes(normalizedFirstName)) {
      return false;
    }
    return true;
  });
}
