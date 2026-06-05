import type { Employee, Team, Tour } from "@shared/schema";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";

type AppointmentEmployeeSlotProps = {
  teams: Team[];
  assignedEmployees: Employee[];
  teamMembersById: Map<number, { id: number; fullName: string }[]>;
  isLocked: boolean;
  readOnly?: boolean;
  className?: string;
  onAssignTeam: (team: Team) => void;
  onAddEmployee: () => void;
  onRemoveEmployee: (employeeId: number) => void;
  tours: Tour[];
  tourMembersById: Map<number, { id: number; fullName: string }[]>;
  selectedTour: Tour | null;
  onTourChange: (tourId: number | null) => void;
};

export function AppointmentEmployeeSlot({
  teams,
  assignedEmployees,
  teamMembersById,
  isLocked,
  readOnly = false,
  className,
  onAssignTeam,
  onAddEmployee,
  onRemoveEmployee,
  tours,
  tourMembersById,
  selectedTour,
  onTourChange,
}: AppointmentEmployeeSlotProps) {
  const showAssignmentActions = !readOnly;
  const showTeamSection = !readOnly;
  const showTourPicker = !readOnly && selectedTour === null;
  const badgeActionLocked = isLocked || readOnly;

  return (
    <section className={`sub-panel flex flex-col gap-4 ${className ?? ""}`.trim()} data-testid="slot-appointment-employees">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mitarbeiter
        </h3>
        {showAssignmentActions ? (
          <PlusActionButton
            onClick={onAddEmployee}
            disabled={isLocked}
            data-testid="button-add-employee"
          />
        ) : null}
      </div>

      {showTeamSection ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Teams</Label>
          <p className="text-xs italic text-muted-foreground">Wähle ein Team für diesen Termin</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <TeamInfoBadge
                key={team.id}
                id={team.id}
                name={team.name}
                color={team.color}
                members={teamMembersById.get(team.id) ?? []}
                action={badgeActionLocked ? "none" : "add"}
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
      ) : null}

      {showTourPicker ? (
        <div className="space-y-2" data-testid="section-tour-picker">
          <Label className="text-xs text-muted-foreground">Tour</Label>
          <p className="text-xs italic text-muted-foreground">
            Wähle eine Tour, zu der dieser Termin hinzugefügt werden soll
          </p>
          <div className="flex flex-wrap gap-2">
            {tours.map((tour) => (
              <TourInfoBadge
                key={tour.id}
                id={tour.id}
                name={tour.name}
                color={tour.color}
                members={tourMembersById.get(tour.id) ?? []}
                action={badgeActionLocked ? "none" : "add"}
                onAdd={() => onTourChange(tour.id)}
                size="sm"
                testId={`badge-tour-select-${tour.id}`}
              />
            ))}
            {tours.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine Touren vorhanden</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Zugewiesen</Label>
        <div className="flex flex-col gap-2">
          {assignedEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">Keine Mitarbeiter zugewiesen</div>
          ) : (
            assignedEmployees.map((employee) => (
              <EmployeeInfoBadge
                key={employee.id}
                id={employee.id}
                firstName={employee.firstName}
                lastName={employee.lastName}
                action={badgeActionLocked ? "none" : "remove"}
                onRemove={() => onRemoveEmployee(employee.id)}
                size="sm"
                fullWidth
                renderMode="detail"
                testId={`badge-employee-${employee.id}`}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
