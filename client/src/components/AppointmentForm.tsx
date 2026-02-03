import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Route, UserCircle, Users, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ProjectList from "@/components/ProjectList";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ProjectInfoBadge } from "@/components/ui/project-info-badge";
import { CustomerInfoBadge } from "@/components/ui/customer-info-badge";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { EmployeeListView } from "@/components/EmployeeList";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Customer, Employee, Project, Team, Tour } from "@shared/schema";

interface AppointmentFormProps {
  onCancel?: () => void;
  onSaved?: () => void;
  initialDate?: string;
  initialProjectId?: number | null;
  appointmentId?: number | null;
}

export function AppointmentForm({
  onCancel,
  onSaved,
  initialDate,
  initialProjectId,
  appointmentId,
}: AppointmentFormProps) {
  const { toast } = useToast();
  const todayIso = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(initialDate || todayIso);
  const [endDate, setEndDate] = useState(initialDate || todayIso);
  const [projectId, setProjectId] = useState<number | null>(initialProjectId ?? null);
  const [title, setTitle] = useState("Termin");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [startTimeEnabled, setStartTimeEnabled] = useState(false);
  const [startTimeHour, setStartTimeHour] = useState("");
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [tourDialogOpen, setTourDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const isEditing = !!appointmentId;
  const userRole = typeof window !== "undefined" ? window.localStorage.getItem("role") : null;
  const isAdmin = userRole === "ADMIN";

  const { data: projectData } = useQuery<{ project: Project; customer: Customer }>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: appointmentDetail } = useQuery<{ appointment: Appointment; employees: Employee[] }>({
    queryKey: ["/api/appointments", appointmentId],
    enabled: !!appointmentId,
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { active: "all" }],
    queryFn: () => fetch("/api/employees?active=all").then((response) => response.json()),
  });

  const selectedProject = projectData?.project;
  const selectedCustomer = projectData?.customer;
  const selectedTour = tours.find((tour) => tour.id === selectedTourId) || null;
  const isLocked = isEditing && !isAdmin && startDate <= todayIso;
  const assignedEmployees = useMemo(
    () => assignedEmployeeIds.map((id) => employees.find((employee) => employee.id === id)).filter(Boolean) as Employee[],
    [assignedEmployeeIds, employees],
  );
  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive && !assignedEmployeeIds.includes(employee.id)),
    [employees, assignedEmployeeIds],
  );

  const showEndDateInput = useMemo(
    () => showEndDate || endDate !== startDate,
    [showEndDate, endDate, startDate],
  );

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!showEndDateInput) {
      setEndDate(value);
    }
  };

  useEffect(() => {
    if (!appointmentDetail) return;
    const { appointment, employees: appointmentEmployees } = appointmentDetail;
    setTitle(appointment.title);
    setStartDate(appointment.startDate);
    setEndDate(appointment.endDate ?? appointment.startDate);
    setShowEndDate(appointment.endDate != null && appointment.endDate !== appointment.startDate);
    setProjectId(appointment.projectId);
    setSelectedTourId(appointment.tourId ?? null);
    setAssignedEmployeeIds(appointmentEmployees.map((employee) => employee.id));
    if (appointment.startTime) {
      setStartTimeEnabled(true);
      setStartTimeHour(appointment.startTime.slice(0, 2));
    } else {
      setStartTimeEnabled(false);
      setStartTimeHour("");
    }
  }, [appointmentDetail]);

  const confirmTourReset = (nextTourId: number | null) => {
    if (assignedEmployeeIds.length === 0) return true;
    const message = nextTourId
      ? "Die Tour-Zuordnung setzt die Mitarbeiterliste zurück. Fortfahren?"
      : "Das Entfernen der Tour setzt die Mitarbeiterliste zurück. Fortfahren?";
    const confirmed = window.confirm(message);
    console.info("[appointment-form] tour reset confirmation", {
      confirmed,
      currentTourId: selectedTourId,
      nextTourId,
      employeeCount: assignedEmployeeIds.length,
    });
    return confirmed;
  };

  const applyTourSelection = async (tourId: number | null) => {
    if (isLocked) {
      toast({
        title: "Termin gesperrt",
        description: "Der Termin kann ab Beginn des Starttages nicht geändert werden.",
        variant: "destructive",
      });
      console.info("[appointment-form] tour change blocked: appointment locked");
      return;
    }
    if (tourId === selectedTourId) return;
    if (!confirmTourReset(tourId)) return;
    setSelectedTourId(tourId);
    if (!tourId) {
      setAssignedEmployeeIds([]);
      console.info("[appointment-form] tour removed, employees cleared");
      return;
    }
    console.info("[appointment-form] loading tour employees", { tourId });
    const response = await apiRequest("GET", `/api/tours/${tourId}/employees`);
    const employees = await response.json();
    const ids = employees.map((employee: { id: number }) => employee.id);
    setAssignedEmployeeIds(ids);
    console.info("[appointment-form] tour employees applied", {
      tourId,
      employeeCount: ids.length,
    });
  };

  const addEmployeeIds = (employeeIds: number[]) => {
    setAssignedEmployeeIds((prev) => {
      const unique = new Set(prev);
      employeeIds.forEach((id) => unique.add(id));
      return Array.from(unique);
    });
  };

  const handleAddTeam = async (teamId: number) => {
    if (isLocked) {
      toast({
        title: "Termin gesperrt",
        description: "Der Termin kann ab Beginn des Starttages nicht geändert werden.",
        variant: "destructive",
      });
      console.info("[appointment-form] team add blocked: appointment locked");
      return;
    }
    console.info("[appointment-form] adding team members", { teamId });
    const response = await apiRequest("GET", `/api/teams/${teamId}/employees`);
    const teamEmployees = await response.json();
    const ids = teamEmployees.map((employee: { id: number }) => employee.id);
    addEmployeeIds(ids);
    console.info("[appointment-form] team members applied", {
      teamId,
      employeeCount: ids.length,
    });
  };

  const handleRemoveEmployee = (employeeId: number) => {
    if (isLocked) {
      toast({
        title: "Termin gesperrt",
        description: "Der Termin kann ab Beginn des Starttages nicht geändert werden.",
        variant: "destructive",
      });
      console.info("[appointment-form] remove employee blocked: appointment locked");
      return;
    }
    setAssignedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
  };

  const buildStartTime = () => {
    if (!startTimeEnabled) return null;
    const hour = Number(startTimeHour);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
    return `${hour.toString().padStart(2, "0")}:00:00`;
  };

  const handleSave = async () => {
    if (isLocked) {
      toast({
        title: "Termin gesperrt",
        description: "Der Termin kann ab Beginn des Starttages nicht geändert werden.",
        variant: "destructive",
      });
      console.info("[appointment-form] save blocked: appointment locked");
      return;
    }

    if (!projectId) {
      toast({
        title: "Projekt erforderlich",
        description: "Bitte wählen Sie ein Projekt aus, bevor Sie speichern.",
        variant: "destructive",
      });
      console.info("[appointment-form] validation failed: missing project");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({
        title: "Titel erforderlich",
        description: "Bitte geben Sie einen Titel für den Termin an.",
        variant: "destructive",
      });
      console.info("[appointment-form] validation failed: missing title");
      return;
    }

    const resolvedEndDate = showEndDateInput ? endDate : startDate;
    if (resolvedEndDate < startDate) {
      toast({
        title: "Ungültiger Zeitraum",
        description: "Das Enddatum darf nicht vor dem Startdatum liegen.",
        variant: "destructive",
      });
      console.info("[appointment-form] validation failed: endDate before startDate", {
        startDate,
        endDate: resolvedEndDate,
      });
      return;
    }

    const resolvedStartTime = buildStartTime();
    if (startTimeEnabled && !resolvedStartTime) {
      toast({
        title: "Ungültige Startzeit",
        description: "Bitte geben Sie eine Startzeit zwischen 0 und 23 Uhr an.",
        variant: "destructive",
      });
      console.info("[appointment-form] validation failed: invalid start time", { startTimeHour });
      return;
    }

    if (assignedEmployeeIds.length === 0) {
      const confirmed = window.confirm(
        "Es sind keine Mitarbeiter zugewiesen. Termin trotzdem speichern?",
      );
      console.info("[appointment-form] save without employees confirmation", { confirmed });
      if (!confirmed) return;
    }

    const payload = {
      projectId,
      tourId: selectedTourId ?? null,
      title: trimmedTitle,
      startDate,
      endDate: resolvedEndDate,
      startTime: resolvedStartTime,
      endTime: null,
      employeeIds: assignedEmployeeIds,
    };

    const method = isEditing ? "PATCH" : "POST";
    const url = isEditing ? `/api/appointments/${appointmentId}` : "/api/appointments";
    const headers = userRole ? { "x-user-role": userRole } : undefined;

    console.info("[appointment-form] saving appointment", {
      method,
      url,
      projectId,
      tourId: selectedTourId ?? null,
      employeeCount: assignedEmployeeIds.length,
      startDate,
      endDate: resolvedEndDate,
    });

    const response = await apiRequest(method, url, payload, { headers });
    const responseData = await response.json();
    console.info("[appointment-form] save response", {
      status: response.status,
      appointmentId: responseData.id,
    });

    toast({
      title: "Termin gespeichert",
      description: isEditing ? "Termin wurde aktualisiert." : "Termin wurde angelegt.",
    });
    onSaved?.();
  };

  return (
    <EntityFormLayout
      title={isEditing ? "Termin bearbeiten" : "Neuer Termin"}
      icon={<Calendar className="w-6 h-6" />}
      onCancel={onCancel}
      onClose={onCancel}
      onSubmit={handleSave}
      saveLabel="Termin speichern"
      testIdPrefix="appointment"
    >
      {isLocked && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Termin ist ab Beginn des Starttages gesperrt und kann nur von Admins geändert werden.
        </div>
      )}
      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointment-title">Titel</Label>
            <Input
              id="appointment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isLocked}
              data-testid="input-appointment-title"
            />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Projektzuordnung</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setProjectDialogOpen(true)}
              disabled={isLocked}
              data-testid="button-select-project"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {selectedProject ? (
            <ProjectInfoBadge
              title={selectedProject.name}
              customerFullName={selectedCustomer?.fullName}
              action={isLocked ? "none" : "remove"}
              onRemove={isLocked ? undefined : () => setProjectId(null)}
              fullWidth
              testId="badge-project"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              Kein Projekt ausgewählt
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Zeitpunkt und Dauer</h3>
          <div className="sub-panel space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointment-start-date">Startdatum</Label>
                <Input
                  id="appointment-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  disabled={isLocked}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-end-date">Enddatum</Label>
                {showEndDateInput ? (
                  <Input
                    id="appointment-end-date"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={isLocked}
                    data-testid="input-end-date"
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setShowEndDate(true)}
                    disabled={isLocked}
                    data-testid="button-show-end-date"
                  >
                    Enddatum hinzufügen
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointment-start-time">Startzeit</Label>
                {startTimeEnabled ? (
                  <Input
                    id="appointment-start-time"
                    type="number"
                    min={0}
                    max={23}
                    placeholder="z. B. 8"
                    value={startTimeHour}
                    onChange={(event) => setStartTimeHour(event.target.value)}
                    disabled={isLocked}
                    data-testid="input-start-time"
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setStartTimeEnabled(true)}
                    disabled={isLocked}
                    data-testid="button-show-start-time"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Startzeit hinzufügen
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-end-time">Endzeit</Label>
                <Input
                  id="appointment-end-time"
                  type="text"
                  placeholder="Endzeit (später verfügbar)"
                  disabled
                  data-testid="input-end-time"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start mt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-4 h-4" />
              Tourzuordnung
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTourDialogOpen(true)}
              disabled={isLocked}
              data-testid="button-select-tour"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {selectedTour ? (
            <ColoredInfoBadge
              icon={<Route className="w-3 h-3" />}
              label={selectedTour.name}
              color={selectedTour.color}
              action={isLocked ? "none" : "remove"}
              onRemove={isLocked ? undefined : () => applyTourSelection(null)}
              fullWidth
              testId="badge-tour"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              Keine Tour ausgewählt
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Kunde
          </h3>
          {selectedCustomer ? (
            <CustomerInfoBadge
              id={selectedCustomer.id}
              fullName={selectedCustomer.fullName}
              customerNumber={selectedCustomer.customerNumber}
              phone={selectedCustomer.phone}
              fullWidth
              testId="badge-customer"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              Kunde wird aus dem Projekt abgeleitet
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mitarbeiter zuweisen
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Teams</Label>
            <div className="flex flex-wrap gap-2">
              {teams.length === 0 ? (
                <span className="text-xs text-muted-foreground">Keine Teams vorhanden</span>
              ) : (
                teams.map((team) => (
                  <ColoredInfoBadge
                    key={team.id}
                    icon={<Users className="w-3 h-3" />}
                    label={team.name}
                    color={team.color}
                    action={isLocked ? "none" : "add"}
                    onAdd={isLocked ? undefined : () => handleAddTeam(team.id)}
                    size="sm"
                    testId={`team-add-${team.id}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-slate-50 p-4">
            <Label className="text-xs text-muted-foreground block mb-3">Zugewiesene Mitarbeiter</Label>
            <div className="flex flex-wrap gap-2">
              {assignedEmployees.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">Keine Mitarbeiter zugewiesen</span>
              ) : (
                assignedEmployees.map((employee) => (
                  <EmployeeInfoBadge
                    key={employee.id}
                    id={employee.id}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    fullName={employee.fullName}
                    action={isLocked ? "none" : "remove"}
                    onRemove={isLocked ? undefined : () => handleRemoveEmployee(employee.id)}
                    size="sm"
                    testId={`assigned-employee-${employee.id}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Mitarbeiter hinzufügen</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEmployeeDialogOpen(true)}
              disabled={isLocked}
              data-testid="button-add-employee"
            >
              <Plus className="w-4 h-4 mr-2" />
              Mitarbeiter auswählen
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <ProjectList
            mode="picker"
            selectedProjectId={projectId}
            onSelectProject={(id) => {
              setProjectId(id);
              setProjectDialogOpen(false);
            }}
            onCancel={() => setProjectDialogOpen(false)}
            title="Projekt auswählen"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={tourDialogOpen} onOpenChange={setTourDialogOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Tour auswählen</h4>
            {tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Touren vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {tours.map((tour) => (
                  <ColoredInfoBadge
                    key={tour.id}
                    icon={<Route className="w-3 h-3" />}
                    label={tour.name}
                    color={tour.color}
                    action="add"
                    onAdd={() => {
                      applyTourSelection(tour.id);
                      setTourDialogOpen(false);
                    }}
                    fullWidth
                    testId={`tour-option-${tour.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeeListView
            mode="picker"
            employees={availableEmployees}
            teams={teams}
            tours={tours}
            onSelectEmployee={(employeeId) => {
              addEmployeeIds([employeeId]);
              setEmployeeDialogOpen(false);
            }}
            onClose={() => setEmployeeDialogOpen(false)}
            title="Mitarbeiter auswählen"
          />
        </DialogContent>
      </Dialog>
    </EntityFormLayout>
  );
}
