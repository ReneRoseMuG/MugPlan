import type { Employee, Team } from "@shared/schema";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";

type AppointmentEmployeeSlotProps = {
  teams: Team[];
  assignedEmployees: Employee[];
  teamMembersById: Map<number, { id: number; fullName: string }[]>;
  isLocked: boolean;
  className?: string;
  onAssignTeam: (team: Team) => void;
  onAddEmployee: () => void;
  onRemoveEmployee: (employeeId: number) => void;
};

export function AppointmentEmployeeSlot({
  teams,
  assignedEmployees,
  teamMembersById,
  isLocked,
  className,
  onAssignTeam,
  onAddEmployee,
  onRemoveEmployee,
}: AppointmentEmployeeSlotProps) {
  return (
    <section className={`sub-panel flex h-full flex-col gap-4 ${className ?? ""}`.trim()} data-testid="slot-appointment-employees">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mitarbeiter
        </h3>
        <PlusActionButton
          onClick={onAddEmployee}
          disabled={isLocked}
          data-testid="button-add-employee"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Teams</Label>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <TeamInfoBadge
              key={team.id}
              id={team.id}
              name={team.name}
              color={team.color}
              members={teamMembersById.get(team.id) ?? []}
              action={isLocked ? "none" : "add"}
              onAdd={() => onAssignTeam(team)}
              size="sm"
              testId={`badge-team-${team.id}`}
            />
          ))}
          {teams.length === 0 ? (
            <div className="text-xs text-muted-foreground">Keine Teams vorhanden</div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Zugewiesene Mitarbeiter</Label>
        <div className="flex flex-wrap gap-2">
          {assignedEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">Keine Mitarbeiter zugewiesen</div>
          ) : (
            assignedEmployees.map((employee) => (
              <EmployeeInfoBadge
                key={employee.id}
                id={employee.id}
                firstName={employee.firstName}
                lastName={employee.lastName}
                action={isLocked ? "none" : "remove"}
                onRemove={() => onRemoveEmployee(employee.id)}
                size="sm"
                testId={`badge-employee-${employee.id}`}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
