import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  X, 
  Calendar,
  MapPin,
  UserCircle,
  Users,
  Route,
  FolderKanban,
  Phone,
  Plus
} from "lucide-react";

interface AppointmentFormProps {
  onCancel?: () => void;
  initialDate?: string;
  fromProject?: boolean;
}

const demoTours = [
  { id: "1", name: "Tour 1", color: "#4A90A4" },
  { id: "2", name: "Tour 2", color: "#E8B86D" },
  { id: "3", name: "Tour 3", color: "#7BA05B" },
];

const demoProjectStatuses = [
  { id: "s1", name: "Neu", color: "#3B82F6" },
  { id: "s2", name: "In Bearbeitung", color: "#F59E0B" },
  { id: "s3", name: "Wartend", color: "#8B5CF6" },
  { id: "s4", name: "Abgeschlossen", color: "#10B981" },
  { id: "s5", name: "Storniert", color: "#EF4444" },
];

const demoProjects = [
  { id: "1", name: "Renovierung Bürogebäude", customerId: "1", statusId: "s2" },
  { id: "2", name: "Neugestaltung Empfangsbereich", customerId: "1", statusId: "s1" },
  { id: "3", name: "Gartenanlage Villa", customerId: "2", statusId: "s3" },
];

const demoCustomers = [
  { id: "1", name: "Müller", firstName: "Hans", company: "Müller GmbH", plz: "80331", city: "München", street: "Marienplatz 1", phone: "+49 89 123456" },
  { id: "2", name: "Schmidt", firstName: "Anna", company: "", plz: "10115", city: "Berlin", street: "Unter den Linden 5", phone: "+49 30 987654" },
];

const demoTeams = [
  { id: "1", name: "Team 1", members: ["e1", "e2"], color: "#A8D5BA" },
  { id: "2", name: "Team 2", members: ["e3", "e4"], color: "#B8C9E8" },
  { id: "3", name: "Team 3", members: ["e5", "e6"], color: "#F5D6BA" },
];

const demoEmployees = [
  { id: "e1", firstName: "Thomas", lastName: "Müller", tourId: "1" },
  { id: "e2", firstName: "Anna", lastName: "Schmidt", tourId: "1" },
  { id: "e3", firstName: "Michael", lastName: "Weber", tourId: "2" },
  { id: "e4", firstName: "Sandra", lastName: "Fischer", tourId: "2" },
  { id: "e5", firstName: "Klaus", lastName: "Hoffmann", tourId: "3" },
  { id: "e6", firstName: "Maria", lastName: "Becker", tourId: "3" },
];

function EmployeeChip({ 
  employee, 
  onRemove,
  tourColor 
}: { 
  employee: typeof demoEmployees[0]; 
  onRemove?: () => void;
  tourColor?: string;
}) {
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm border"
      style={{ 
        backgroundColor: tourColor ? `${tourColor}20` : '#f1f5f9',
        borderColor: tourColor || '#e2e8f0'
      }}
      data-testid={`chip-employee-${employee.id}`}
    >
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: tourColor || '#64748b' }}
      >
        {employee.firstName[0]}{employee.lastName[0]}
      </div>
      <span className="font-medium text-slate-700">{employee.firstName} {employee.lastName}</span>
      {onRemove && (
        <button 
          onClick={onRemove}
          className="ml-1 w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center"
          data-testid={`button-remove-employee-${employee.id}`}
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      )}
    </div>
  );
}

export function AppointmentForm({ onCancel, initialDate, fromProject }: AppointmentFormProps) {
  const [selectedTour, setSelectedTour] = useState<string>("1");
  const [selectedProject, setSelectedProject] = useState<string | null>("1");
  const [assignedEmployees, setAssignedEmployees] = useState<string[]>(["e1", "e2"]);
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

  const currentTour = demoTours.find(t => t.id === selectedTour);
  const currentProject = selectedProject ? demoProjects.find(p => p.id === selectedProject) : null;
  const currentCustomer = demoCustomers.find(c => c.id === currentProject?.customerId);
  const currentProjectStatus = currentProject ? demoProjectStatuses.find(s => s.id === currentProject.statusId) : null;

  const handleRemoveEmployee = (empId: string) => {
    setAssignedEmployees(assignedEmployees.filter(id => id !== empId));
  };

  const handleAddEmployee = (empId: string) => {
    if (!assignedEmployees.includes(empId)) {
      setAssignedEmployees([...assignedEmployees, empId]);
    }
  };

  const handleAssignTeam = (teamId: string) => {
    const team = demoTeams.find(t => t.id === teamId);
    if (team) {
      const newEmployees = Array.from(new Set([...assignedEmployees, ...team.members]));
      setAssignedEmployees(newEmployees);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              Neuer Termin
            </CardTitle>
            {onCancel && (
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-appointment">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
          {fromProject && (
            <p className="text-sm text-muted-foreground mt-2">
              Termin wird aus Projekt erstellt
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Zeitraum
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input 
                    id="startDate"
                    type="date" 
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Enddatum</Label>
                  <Input 
                    id="endDate"
                    type="date" 
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mehrtägige Termine werden im Kalender als durchgehender Balken dargestellt
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Route className="w-4 h-4" />
                Tour zuweisen
              </h3>
              <div className="space-y-2">
                <Label>Tour</Label>
                <Select value={selectedTour} onValueChange={setSelectedTour}>
                  <SelectTrigger data-testid="select-tour">
                    <SelectValue placeholder="Tour wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {demoTours.map(tour => (
                      <SelectItem key={tour.id} value={tour.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: tour.color }}
                          />
                          {tour.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Projekt
                </span>
                <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" data-testid="button-add-project">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <Select 
                      value={selectedProject || ""} 
                      onValueChange={(val) => {
                        setSelectedProject(val);
                        setProjectPopoverOpen(false);
                      }}
                    >
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder="Projekt wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {demoProjects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              </h3>
              {currentProject ? (
                <div 
                  className="p-4 bg-slate-50 rounded-lg border border-border relative"
                  data-testid="project-info"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProject(null)}
                    className="absolute top-2 right-2"
                    data-testid="button-remove-project"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 pr-6">
                      <p className="font-semibold text-slate-800" data-testid="text-project-name">
                        {currentProject.name}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Projekt-ID: {currentProject.id}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-sm text-muted-foreground">
                  Kein Projekt ausgewählt
                </div>
              )}

              {currentProjectStatus && (
                <div 
                  className="p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: `${currentProjectStatus.color}15`,
                    borderColor: `${currentProjectStatus.color}40`
                  }}
                  data-testid="project-status-info"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentProjectStatus.color }}
                    />
                    <span className="text-sm font-medium" style={{ color: currentProjectStatus.color }}>
                      Status: {currentProjectStatus.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Kunde
              </h3>
              {currentCustomer ? (
                <div 
                  className="p-4 bg-slate-50 rounded-lg border border-border"
                  data-testid="customer-info"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800" data-testid="text-customer-fullname">
                        {currentCustomer.firstName} {currentCustomer.name}
                      </p>
                      {currentCustomer.company && (
                        <p className="text-sm text-slate-600">{currentCustomer.company}</p>
                      )}
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{currentCustomer.plz} {currentCustomer.city}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="w-3 h-3" />
                        <span>{currentCustomer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2" data-testid="badge-plz">
                    PLZ: {currentCustomer.plz}
                  </Badge>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-sm text-muted-foreground">
                  Kein Kunde (Projekt wählen)
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mitarbeiter zuweisen
            </h3>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team-Vorlagen:</Label>
              <div className="flex flex-wrap gap-2">
                {demoTeams.map(team => (
                  <Button 
                    key={team.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignTeam(team.id)}
                    style={{ 
                      backgroundColor: team.color,
                      borderColor: team.color
                    }}
                    data-testid={`button-assign-team-${team.id}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {team.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-border min-h-[80px]">
              <Label className="text-xs text-muted-foreground block mb-3">Zugewiesene Mitarbeiter:</Label>
              <div className="flex flex-wrap gap-2" data-testid="assigned-employees">
                {assignedEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Keine Mitarbeiter zugewiesen
                  </p>
                ) : (
                  assignedEmployees.map(empId => {
                    const emp = demoEmployees.find(e => e.id === empId);
                    if (!emp) return null;
                    const empTour = demoTours.find(t => t.id === emp.tourId);
                    return (
                      <EmployeeChip 
                        key={emp.id} 
                        employee={emp} 
                        tourColor={empTour?.color}
                        onRemove={() => handleRemoveEmployee(emp.id)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mitarbeiter hinzufügen:</Label>
              <div className="flex flex-wrap gap-2">
                {demoEmployees
                  .filter(emp => !assignedEmployees.includes(emp.id))
                  .map(emp => {
                    const empTour = demoTours.find(t => t.id === emp.tourId);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => handleAddEmployee(emp.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm border border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 transition-colors"
                        data-testid={`button-add-employee-${emp.id}`}
                      >
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: empTour?.color || '#64748b' }}
                        >
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <span className="text-slate-600">{emp.firstName} {emp.lastName}</span>
                        <Plus className="w-3 h-3 text-slate-400" />
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel-appointment">
              Abbrechen
            </Button>
            <Button data-testid="button-save-appointment">
              Termin speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
