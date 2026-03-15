import { useMemo, useState } from "react";
import { Mail, Phone, Route, Users } from "lucide-react";
import type { Employee, Team, Tour } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { EmployeePickerFilterPanel } from "@/components/ui/filter-panels/employee-picker-filter-panel";

interface EmployeePickerDialogListProps {
  employees: Employee[];
  unavailableEmployees?: Array<{ id: number; fullName: string; reason: "absence" | "exit_date" }>;
  teams: Team[];
  tours: Tour[];
  selectedEmployeeId?: number | null;
  isLoading?: boolean;
  title?: string;
  appointmentDate?: string | null;
  showAvailabilityNotice?: boolean;
  onSelectEmployee?: (employeeId: number) => void;
  onClose?: () => void;
}

export function EmployeePickerDialogList({
  employees,
  unavailableEmployees = [],
  teams,
  tours,
  selectedEmployeeId = null,
  isLoading = false,
  title = "Mitarbeiter auswaehlen",
  appointmentDate = null,
  showAvailabilityNotice = false,
  onSelectEmployee,
  onClose,
}: EmployeePickerDialogListProps) {
  const [nameFilter, setNameFilter] = useState("");

  const rows = useMemo(() => {
    const value = nameFilter.trim().toLocaleLowerCase("de");
    const filtered = !value
      ? employees
      : employees.filter((employee) => employee.fullName.toLocaleLowerCase("de").includes(value));

    return [...filtered].sort((left, right) => left.lastName.localeCompare(right.lastName, "de"));
  }, [appointmentDate, employees, nameFilter]);

  return (
    <ListLayout
      title={title}
      icon={<Users className="w-5 h-5" />}
      viewModeKey="employeePickerDialog"
      isLoading={isLoading}
      onClose={onClose}
      showCloseButton={false}
      filterSlot={(
        <div className="space-y-3">
          {showAvailabilityNotice ? (
            <Alert data-testid="alert-employee-picker-availability">
              <AlertTitle>Bereinigte Mitarbeiterauswahl</AlertTitle>
              <AlertDescription>
                {appointmentDate
                  ? "Es werden nur verfuegbare Mitarbeiter angezeigt. Nicht verfuegbare Mitarbeiter wurden aus dieser Liste entfernt."
                  : "Bitte zuerst ein Startdatum festlegen."}
              </AlertDescription>
            </Alert>
          ) : null}
          {showAvailabilityNotice && appointmentDate && unavailableEmployees.length > 0 ? (
            <Alert data-testid="alert-employee-picker-unavailable-list">
              <AlertTitle>Nicht verfuegbare Mitarbeiter</AlertTitle>
              <AlertDescription>
                {unavailableEmployees.map((employee) => (
                  <div key={`${employee.id}-${employee.reason}`}>
                    {employee.fullName}: {employee.reason === "absence" ? "Abwesenheit" : "Austrittsdatum erreicht"}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}
          <EmployeePickerFilterPanel
            nameFilter={nameFilter}
            onNameFilterChange={setNameFilter}
          />
        </div>
      )}
      contentSlot={(
        <BoardView
          gridTestId="list-employee-picker"
          gridCols="3"
          isEmpty={rows.length === 0}
          emptyState={(
            <p className="text-sm text-slate-400 text-center py-8 col-span-full">
              {appointmentDate || !showAvailabilityNotice
                ? "Keine verfuegbaren Mitarbeiter gefunden."
                : "Bitte zuerst ein Startdatum festlegen."}
            </p>
          )}
        >
          {rows.map((employee) => {
            const teamName = teams.find((team) => team.id === employee.teamId)?.name ?? null;
            const tourName = tours.find((tour) => tour.id === employee.tourId)?.name ?? null;

            return (
              <EntityCard
                key={employee.id}
                testId={`employee-picker-card-${employee.id}`}
                title={employee.fullName}
                icon={<Users className="w-4 h-4" />}
                className={selectedEmployeeId === employee.id ? "ring-1 ring-primary/30 border-primary/40" : ""}
                onClick={() => onSelectEmployee?.(employee.id)}
                onDoubleClick={() => onSelectEmployee?.(employee.id)}
              >
                <div className="space-y-2 text-sm">
                  {employee.phone && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3 h-3" />
                      {employee.phone}
                    </div>
                  )}

                  {(tourName || teamName) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {tourName && (
                        <Badge variant="secondary" className="text-xs">
                          <Route className="w-3 h-3 mr-1" />
                          {tourName}
                        </Badge>
                      )}
                      {teamName && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {teamName}
                        </Badge>
                      )}
                    </div>
                  )}

                  {employee.email && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                </div>
              </EntityCard>
            );
          })}
        </BoardView>
      )}
    />
  );
}
