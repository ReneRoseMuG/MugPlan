import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import type { Employee } from "@shared/schema";
import { EmployeeAbsencesPanel } from "@/components/EmployeeAbsencesPanel";
import { ListLayout } from "@/components/ui/list-layout";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function fetchActiveEmployees(): Promise<Employee[]> {
  const response = await fetch("/api/employees?scope=active", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Mitarbeiter konnten nicht geladen werden");
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Mitarbeiter konnten nicht geladen werden");
  }

  return payload as Employee[];
}

export function EmployeeAbsencesPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active", view: "absences-navigation" }],
    queryFn: fetchActiveEmployees,
  });

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId(null);
      return;
    }

    setSelectedEmployeeId((current) => {
      if (current !== null && employees.some((employee) => employee.id === current)) {
        return current;
      }
      return employees[0].id;
    });
  }, [employees]);

  return (
    <ListLayout
      title="Abwesenheiten"
      icon={<CalendarRange className="w-5 h-5" />}
      helpKey="employees.absences.navigation"
      isLoading={isLoading}
      filterPlacement="top"
      filterSlot={(
        <div className="flex max-w-sm flex-col gap-2" data-testid="employee-absences-filter-panel">
          <Label htmlFor="employee-absences-employee-select">Mitarbeiter</Label>
          <Select
            value={selectedEmployeeId === null ? "" : String(selectedEmployeeId)}
            onValueChange={(value) => setSelectedEmployeeId(value ? Number(value) : null)}
          >
            <SelectTrigger id="employee-absences-employee-select" data-testid="select-employee-absences-employee">
              <SelectValue placeholder="Mitarbeiter waehlen" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={String(employee.id)}>
                  {employee.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      contentSlot={
        selectedEmployeeId === null ? (
          <div className="h-full p-6">
            <ListEmptyState
              helpKey="employees.absences.navigation.empty"
              fallbackTitle="Kein Mitarbeiter gewaehlt."
              fallbackBody="Waehlen Sie einen aktiven Mitarbeiter, um Abwesenheiten anzuzeigen oder zu bearbeiten."
            />
          </div>
        ) : (
          <div className="h-full p-6">
            <EmployeeAbsencesPanel employeeId={selectedEmployeeId} listVariant="table" />
          </div>
        )
      }
    />
  );
}
