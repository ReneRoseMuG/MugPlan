import { useMemo, useState } from "react";
import { Users, Route, Power, PowerOff, Phone, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilteredCardListLayout } from "@/components/ui/filtered-card-list-layout";
import { EmployeeFilterPanel } from "@/components/ui/filter-panels/employee-filter-panel";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { EntityCard } from "@/components/ui/entity-card";
import { applyEmployeeFilters, defaultEmployeeFilters } from "@/lib/employee-filters";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Team, Tour } from "@shared/schema";

interface EmployeeListViewProps {
  employees: Employee[];
  allEmployeesForBadgePreview?: Employee[];
  teams: Team[];
  tours: Tour[];
  isLoading?: boolean;
  onClose?: () => void;
  onNewEmployee?: () => void;
  isNewEmployeePending?: boolean;
  onOpenEmployee?: (employee: Employee) => void;
  onToggleActive?: (employee: Employee) => void;
  onSelectEmployee?: (id: number) => void;
  mode?: "list" | "picker";
  selectedEmployeeId?: number | null;
  title?: string;
}

type EmployeeListProps = Omit<EmployeeListViewProps, "employees" | "teams" | "tours" | "isLoading">;

export function EmployeeListView({
  employees,
  allEmployeesForBadgePreview,
  teams,
  tours,
  isLoading = false,
  onClose,
  onNewEmployee,
  isNewEmployeePending = false,
  onOpenEmployee,
  onToggleActive,
  onSelectEmployee,
  mode = "list",
  selectedEmployeeId = null,
  title,
}: EmployeeListViewProps) {
  const [filters, setFilters] = useState(defaultEmployeeFilters);
  const employeesForBadgePreview = allEmployeesForBadgePreview ?? employees;

  const filteredEmployees = useMemo(
    () => applyEmployeeFilters(employees, filters),
    [employees, filters],
  );

  const teamMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employeesForBadgePreview) {
      if (!employee.teamId) continue;
      const current = result.get(employee.teamId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.teamId, current);
    }
    return result;
  }, [employeesForBadgePreview]);

  const tourMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employeesForBadgePreview) {
      if (!employee.tourId) continue;
      const current = result.get(employee.tourId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.tourId, current);
    }
    return result;
  }, [employeesForBadgePreview]);

  const isPicker = mode === "picker";
  const resolvedTitle = title ?? "Mitarbeiter";

  const getTourName = (tourId: number | null) => {
    if (!tourId) return null;
    const tour = tours.find(t => t.id === tourId);
    return tour ? { id: tour.id, name: tour.name, color: tour.color } : null;
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team ? { id: team.id, name: team.name, color: team.color } : null;
  };

  return (
    <FilteredCardListLayout
      title={resolvedTitle}
      icon={<Users className="w-5 h-5" />}
      helpKey="employees"
      isLoading={isLoading}
      onClose={onClose}
      closeTestId="button-close-employees"
      gridTestId="list-employees"
      gridCols="3"
      primaryAction={onNewEmployee ? {
        label: "Neuer Mitarbeiter",
        onClick: onNewEmployee,
        isPending: isNewEmployeePending,
        testId: "button-new-employee",
      } : undefined}
      isEmpty={filteredEmployees.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-3">
          Keine Mitarbeiter vorhanden
        </p>
      }
      filters={(
        <EmployeeFilterPanel
          title="Mitarbeiterfilter"
          employeeLastName={filters.lastName}
          onEmployeeLastNameChange={(value) => setFilters((prev) => ({ ...prev, lastName: value }))}
          onEmployeeLastNameClear={() => setFilters((prev) => ({ ...prev, lastName: "" }))}
        />
      )}
    >
      {filteredEmployees.map((employee) => {
        const tourInfo = getTourName(employee.tourId);
        const teamInfo = getTeamName(employee.teamId);
        const isSelected = selectedEmployeeId === employee.id;
        const handleSelect = isPicker ? () => onSelectEmployee?.(employee.id) : undefined;
        const handleOpen = () => onOpenEmployee?.(employee);

        return (
          <EntityCard
            key={employee.id}
            testId={`employee-card-${employee.id}`}
            title={employee.fullName}
            icon={<Users className="w-4 h-4" />}
            className={[
              !employee.isActive ? "opacity-60" : "",
              isSelected ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5" : "",
            ].filter(Boolean).join(" ")}
            onClick={isPicker ? handleSelect : undefined}
            onDoubleClick={!isPicker ? handleOpen : undefined}
            actions={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive?.(employee);
                }}
                disabled={true}
                data-testid={`button-toggle-employee-${employee.id}`}
                title="Aktivierung nur durch Administrator"
              >
                {employee.isActive ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
              </Button>
            }
            footer={isPicker ? undefined : (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
                data-testid={`button-edit-employee-${employee.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          >
            <div className="space-y-2 text-sm">
              {employee.phone && (
                <div 
                  className="flex items-center gap-1 text-slate-600"
                  data-testid={`text-employee-phone-${employee.id}`}
                >
                  <Phone className="w-3 h-3" />
                  {employee.phone}
                </div>
              )}
              {employee.email && (
                <div 
                  className="flex items-center gap-1 text-slate-600"
                  data-testid={`text-employee-email-${employee.id}`}
                >
                  <Mail className="w-3 h-3" />
                  {employee.email}
                </div>
              )}
              {(tourInfo || teamInfo || !employee.isActive) && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {tourInfo && (
                    <TourInfoBadge
                      id={tourInfo.id}
                      name={tourInfo.name}
                      color={tourInfo.color}
                      members={tourMembersById.get(tourInfo.id) ?? []}
                      size="sm"
                      testId={`badge-employee-tour-${employee.id}`}
                    />
                  )}
                  {teamInfo && (
                    <TeamInfoBadge
                      id={teamInfo.id}
                      name={teamInfo.name}
                      color={teamInfo.color}
                      members={teamMembersById.get(teamInfo.id) ?? []}
                      size="sm"
                      testId={`badge-employee-team-${employee.id}`}
                    />
                  )}
                  {!employee.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inaktiv
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </EntityCard>
        );
      })}
    </FilteredCardListLayout>
  );
}

export function EmployeeList(props: EmployeeListProps) {
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { active: "all" }],
    queryFn: () => fetch("/api/employees?active=all").then((response) => response.json()),
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  return (
    <EmployeeListView
      {...props}
      employees={employees}
      teams={teams}
      tours={tours}
      isLoading={isLoading}
    />
  );
}
