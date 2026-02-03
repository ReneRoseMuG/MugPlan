import { useMemo, useState } from "react";
import { Users, Route, Power, PowerOff, Phone, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilteredCardListLayout } from "@/components/ui/filtered-card-list-layout";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { EntityCard } from "@/components/ui/entity-card";
import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { applyEmployeeFilters, defaultEmployeeFilters } from "@/lib/employee-filters";
import type { Employee, Team, Tour } from "@shared/schema";

interface EmployeeListProps {
  employees: Employee[];
  teams: Team[];
  tours: Tour[];
  isLoading?: boolean;
  onClose?: () => void;
  onNewEmployee?: () => void;
  isNewEmployeePending?: boolean;
  onOpenEmployee?: (employee: Employee) => void;
  onToggleActive?: (employee: Employee) => void;
  onSelectEmployee?: (employee: Employee) => void;
  mode?: "list" | "picker";
  selectedEmployeeId?: number | null;
  title?: string;
}

export function EmployeeList({
  employees,
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
}: EmployeeListProps) {
  const [filters, setFilters] = useState(defaultEmployeeFilters);

  const filteredEmployees = useMemo(
    () => applyEmployeeFilters(employees, filters),
    [employees, filters],
  );

  const isPicker = mode === "picker" && !!onSelectEmployee;
  const resolvedTitle = title ?? "Mitarbeiter";

  const getTourName = (tourId: number | null) => {
    if (!tourId) return null;
    const tour = tours.find(t => t.id === tourId);
    return tour ? { name: tour.name, color: tour.color } : null;
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team ? { name: team.name, color: team.color } : null;
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
        <SearchFilterInput
          id="employee-filter-last-name"
          label="Nachname"
          value={filters.lastName}
          onChange={(value) => setFilters((prev) => ({ ...prev, lastName: value }))}
          onClear={() => setFilters((prev) => ({ ...prev, lastName: "" }))}
          className="flex-1"
        />
      )}
    >
      {filteredEmployees.map((employee) => {
        const tourInfo = getTourName(employee.tourId);
        const teamInfo = getTeamName(employee.teamId);
        const isSelected = selectedEmployeeId === employee.id;
        const handleSelect = isPicker ? () => onSelectEmployee?.(employee) : undefined;
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
            footer={
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
            }
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
                    <ColoredInfoBadge
                      icon={<Route className="w-3 h-3" />}
                      label={tourInfo.name}
                      color={tourInfo.color}
                      size="sm"
                      testId={`badge-employee-tour-${employee.id}`}
                    />
                  )}
                  {teamInfo && (
                    <ColoredInfoBadge
                      icon={<Users className="w-3 h-3" />}
                      label={teamInfo.name}
                      color={teamInfo.color}
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
