import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Phone, Archive, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EntityCard } from "@/components/ui/entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { defaultHeaderColor } from "@/lib/colors";

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  tour?: Tour;
  team?: Team;
  archived?: boolean;
}

const demoTours: Tour[] = [
  { id: "t1", name: "Nord", color: "#4A90A4" },
  { id: "t2", name: "Süd", color: "#7CB342" },
  { id: "t3", name: "West", color: "#FFB74D" },
];

const demoTeams: Team[] = [
  { id: "tm1", name: "Team 1", color: "#FFF3E0" },
  { id: "tm2", name: "Team 2", color: "#E8F5E9" },
];

const demoEmployees: Employee[] = [
  { 
    id: "e1", 
    firstName: "Thomas", 
    lastName: "Müller", 
    phone: "0171-2345678",
    tour: demoTours[0],
    team: demoTeams[0]
  },
  { 
    id: "e2", 
    firstName: "Anna", 
    lastName: "Schmidt", 
    phone: "0172-3456789",
    tour: demoTours[0],
    team: demoTeams[0]
  },
  { 
    id: "e3", 
    firstName: "Michael", 
    lastName: "Weber", 
    phone: "0173-4567890",
    tour: demoTours[1],
    team: demoTeams[1]
  },
  { 
    id: "e4", 
    firstName: "Sandra", 
    lastName: "Fischer", 
    phone: "0174-5678901",
    tour: demoTours[2]
  },
  { 
    id: "e5", 
    firstName: "Klaus", 
    lastName: "Hoffmann", 
    phone: "0175-6789012",
    team: demoTeams[1]
  },
  { 
    id: "e6", 
    firstName: "Maria", 
    lastName: "Becker", 
    phone: "0176-7890123"
  },
  { 
    id: "e7", 
    firstName: "Peter", 
    lastName: "Schneider", 
    phone: "0177-8901234",
    tour: demoTours[1],
    team: demoTeams[0]
  },
  { 
    id: "e8", 
    firstName: "Laura", 
    lastName: "Wagner", 
    phone: "0178-9012345",
    tour: demoTours[2],
    team: demoTeams[1]
  },
  { 
    id: "e9", 
    firstName: "Stefan", 
    lastName: "Braun", 
    phone: "0179-0123456",
    tour: demoTours[0],
    archived: true
  },
  { 
    id: "e10", 
    firstName: "Claudia", 
    lastName: "Richter", 
    phone: "0170-1234567",
    team: demoTeams[1],
    archived: true
  },
];

interface EmployeeManagementProps {
  onCancel: () => void;
  onOpenEmployeeWeekly?: (employeeId: string, employeeName: string) => void;
}

export function EmployeeManagement({ onCancel, onOpenEmployeeWeekly }: EmployeeManagementProps) {
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const filteredEmployees = demoEmployees.filter(
    (emp) => showArchived || !emp.archived
  );

  const handleArchiveClick = () => {
    toast({
      title: "Keine Berechtigung",
      description: "Nur Administratoren dürfen Mitarbeiter archivieren.",
      variant: "destructive",
    });
  };

  const archivedToolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Switch
        id="show-archived"
        checked={showArchived}
        onCheckedChange={setShowArchived}
        data-testid="switch-show-archived"
      />
      <Label htmlFor="show-archived" className="text-sm text-slate-600 cursor-pointer">
        Archivierte anzeigen
      </Label>
    </div>
  );

  return (
    <CardListLayout
      title="Mitarbeiter"
      icon={<Users className="w-5 h-5" />}
      helpKey="employees"
      onClose={onCancel}
      closeTestId="button-close-employees"
      gridTestId="list-employees"
      gridCols="2"
      toolbar={archivedToolbar}
      primaryAction={{
        label: "Neuer Mitarbeiter",
        onClick: () => {},
        testId: "button-new-employee",
      }}
      secondaryAction={onCancel ? {
        label: "Schließen",
        onClick: onCancel,
        testId: "button-cancel-employees",
      } : undefined}
    >
      {filteredEmployees.map((employee) => (
        <EmployeeCard 
          key={employee.id} 
          employee={employee} 
          onArchiveClick={handleArchiveClick}
          onDoubleClick={() => onOpenEmployeeWeekly?.(employee.id, `${employee.firstName} ${employee.lastName}`)}
        />
      ))}
    </CardListLayout>
  );
}

function EmployeeCard({ 
  employee, 
  onArchiveClick,
  onDoubleClick 
}: { 
  employee: Employee; 
  onArchiveClick: () => void;
  onDoubleClick?: () => void;
}) {
  const isArchived = employee.archived;
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div onDoubleClick={onDoubleClick}>
      <EntityCard
        title={fullName}
        icon={<User className="w-4 h-4" />}
        headerColor={isArchived ? "#e2e8f0" : defaultHeaderColor}
        onDelete={!isArchived ? onArchiveClick : undefined}
        testId={`card-employee-${employee.id}`}
        className={isArchived ? "opacity-60" : ""}
      >
        <div className="flex gap-4">
          <div className="flex-[3]">
            {isArchived && (
              <Badge variant="secondary" className="text-xs gap-1 mb-2" data-testid={`badge-archived-${employee.id}`}>
                <Archive className="w-3 h-3" />
                Archiviert
              </Badge>
            )}
            <div className={`flex items-center gap-2 ${isArchived ? "text-slate-400" : "text-slate-600"}`}>
              <Phone className="w-4 h-4" />
              <span className="text-sm">{employee.phone}</span>
            </div>
          </div>

          <div className={`flex-1 pl-3 border-l border-border flex flex-col gap-2 ${
            isArchived ? "opacity-70" : ""
          }`}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tour
              </div>
              {employee.tour ? (
                <Badge 
                  variant="secondary"
                  className={`w-full justify-center border-0 text-xs ${isArchived ? "text-slate-500" : "text-white"}`}
                  style={{ backgroundColor: isArchived ? "#9CA3AF" : employee.tour.color }}
                  data-testid={`badge-tour-${employee.id}`}
                >
                  {employee.tour.name}
                </Badge>
              ) : (
                <div className="h-5 rounded bg-slate-200" />
              )}
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Team
              </div>
              {employee.team ? (
                <Badge 
                  variant="outline"
                  className={`w-full justify-center text-xs ${isArchived ? "text-slate-500 border-slate-300" : ""}`}
                  style={{ backgroundColor: isArchived ? "#E5E7EB" : employee.team.color }}
                  data-testid={`badge-team-${employee.id}`}
                >
                  {employee.team.name}
                </Badge>
              ) : (
                <div className="h-5 rounded bg-slate-200" />
              )}
            </div>
          </div>
        </div>
      </EntityCard>
    </div>
  );
}
