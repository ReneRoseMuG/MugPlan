import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, X, Phone, Plus, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <Card className="h-full overflow-hidden" data-testid="employee-management">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold uppercase tracking-wide">Mitarbeiter Übersicht</h2>
        </div>
        <Button
          variant="ghost"
          size="lg"
          onClick={onCancel}
          data-testid="button-close-employees"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 overflow-y-auto h-[calc(100%-60px)]">
        <div className="flex flex-wrap items-center gap-3 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="list-employees">
          {filteredEmployees.map((employee) => (
            <EmployeeCard 
              key={employee.id} 
              employee={employee} 
              onArchiveClick={handleArchiveClick}
              onDoubleClick={() => onOpenEmployeeWeekly?.(employee.id, `${employee.firstName} ${employee.lastName}`)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          className="mt-6 gap-2"
          data-testid="button-new-employee"
        >
          <Plus className="w-4 h-4" />
          Neuer Mitarbeiter
        </Button>
      </div>
    </Card>
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

  return (
    <div 
      className={`flex rounded-lg border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
        isArchived ? "bg-slate-100 opacity-60" : "bg-white"
      }`}
      onDoubleClick={onDoubleClick}
      data-testid={`card-employee-${employee.id}`}
    >
      <div className="flex-[4] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className={`font-bold text-lg ${isArchived ? "text-slate-500" : "text-slate-800"}`}
              data-testid={`text-employee-name-${employee.id}`}
            >
              {employee.firstName} {employee.lastName}
            </span>
            {isArchived && (
              <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-archived-${employee.id}`}>
                <Archive className="w-3 h-3" />
                Archiviert
              </Badge>
            )}
          </div>
          {!isArchived && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onArchiveClick}
              className="text-slate-400"
              data-testid={`button-archive-${employee.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-2 ${isArchived ? "text-slate-400" : "text-slate-600"}`}>
          <Phone className="w-4 h-4" />
          <span className="text-sm">{employee.phone}</span>
        </div>
      </div>

      <div className={`flex-1 p-3 border-l border-border flex flex-col gap-3 ${
        isArchived ? "bg-slate-200" : "bg-slate-50"
      }`}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Tour
          </div>
          {employee.tour ? (
            <Badge 
              variant="secondary"
              className={`w-full justify-center border-0 ${isArchived ? "text-slate-500" : "text-white"}`}
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
              className={`w-full justify-center ${isArchived ? "text-slate-500 border-slate-300" : ""}`}
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
  );
}
