import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Employee = {
  id: number;
  fullName: string;
  isActive: boolean;
};

const logPrefix = "[calendar-employee-filter]";

export function CalendarEmployeeFilter({
  value,
  onChange,
}: {
  value?: number | null;
  onChange: (employeeId: number | null) => void;
}) {
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Mitarbeiter konnten nicht geladen werden");
      return response.json();
    },
  });

  const activeEmployees = employees.filter((employee) => employee.isActive);

  const handleValueChange = (value: string) => {
    const parsed = value === "all" ? null : Number(value);
    console.info(`${logPrefix} change`, { employeeId: parsed });
    onChange(parsed);
  };

  return (
    <Select value={value ? String(value) : "all"} onValueChange={handleValueChange}>
      <SelectTrigger className="w-56 bg-white">
        <SelectValue placeholder="Mitarbeiter filtern" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alle Mitarbeiter</SelectItem>
        {activeEmployees.map((employee) => (
          <SelectItem key={employee.id} value={String(employee.id)}>
            {employee.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
