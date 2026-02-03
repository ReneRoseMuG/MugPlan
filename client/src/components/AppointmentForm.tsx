import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, FolderKanban, Plus, Route, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Customer, Employee, Project, Team, Tour } from "@shared/schema";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { CustomerInfoBadge } from "@/components/ui/customer-info-badge";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { ProjectInfoBadge } from "@/components/ui/project-info-badge";
import ProjectList from "@/components/ProjectList";
import { EmployeeListView } from "@/components/EmployeeList";
import { useToast } from "@/hooks/use-toast";

interface AppointmentFormProps {
  onCancel?: () => void;
  onSaved?: () => void;
  initialDate?: string;
  projectId?: number;
  appointmentId?: number;
}

interface AppointmentDetail {
  id: number;
  projectId: number;
  tourId: number | null;
  title: string;
  description: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  employees: Employee[];
}

const logPrefix = "[AppointmentForm]";

const formatHourInput = (value: string) => {
  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  const hour = Math.max(0, Math.min(23, Number(numeric)));
  return String(hour).padStart(2, "0");
};

const buildTimeString = (hourValue: string) => {
  if (!hourValue) return null;
  return `${hourValue}:00:00`;
};

const isPastStartDate = (startDate: string) => {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue <= today;
};

const fetchJson = async <T,>(url: string) => {
  console.info(`${logPrefix} request`, { url });
  const response = await fetch(url, { credentials: "include" });
  const payload = await response.json();
  console.info(`${logPrefix} response`, { url, status: response.status });
  if (!response.ok) {
    throw new Error(payload?.message ?? response.statusText);
  }
  return payload as T;
};

export function AppointmentForm({ onCancel, onSaved, initialDate, projectId, appointmentId }: AppointmentFormProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId ?? null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>(
    initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [startTimeEnabled, setStartTimeEnabled] = useState(false);
  const [startTimeHour, setStartTimeHour] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [tourConfirmOpen, setTourConfirmOpen] = useState(false);
  const [pendingTourChange, setPendingTourChange] = useState<{
    tourId: number | null;
    employeeIds: number[];
  } | null>(null);
  const [employeeConfirmOpen, setEmployeeConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const isAdmin = userRole === "ADMIN";
  const isEditing = Boolean(appointmentId);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects?filter=all"],
    queryFn: () => fetchJson<Project[]>("/api/projects?filter=all"),
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => fetchJson<Customer[]>("/api/customers"),
  });

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
    queryFn: () => fetchJson<Tour[]>("/api/tours"),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: () => fetchJson<Team[]>("/api/teams"),
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: () => fetchJson<Employee[]>("/api/employees"),
  });

  const { data: appointmentDetail, isLoading: appointmentLoading } = useQuery<AppointmentDetail>({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: () => fetchJson<AppointmentDetail>(`/api/appointments/${appointmentId}`),
    enabled: Boolean(appointmentId),
  });

  const isLoading =
    projectsLoading || customersLoading || toursLoading || teamsLoading || employeesLoading || appointmentLoading;

  useEffect(() => {
    if (!appointmentDetail) return;
    console.info(`${logPrefix} appointment detail loaded`, { appointmentId: appointmentDetail.id });
    setSelectedProjectId(appointmentDetail.projectId);
    setSelectedTourId(appointmentDetail.tourId ?? null);
    setStartDate(appointmentDetail.startDate);
    setEndDate(appointmentDetail.endDate ?? appointmentDetail.startDate);
    setIsEndDateEnabled(Boolean(appointmentDetail.endDate));
    const startHour = appointmentDetail.startTime?.slice(0, 2) ?? "";
    setStartTimeEnabled(Boolean(startHour));
    setStartTimeHour(startHour);
    setAssignedEmployeeIds(appointmentDetail.employees.map((employee) => employee.id));
  }, [appointmentDetail]);

  useEffect(() => {
    if (!isEndDateEnabled) {
      setEndDate(startDate);
    }
  }, [isEndDateEnabled, startDate]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const selectedCustomer = useMemo(() => {
    if (!selectedProject) return null;
    return customers.find((customer) => customer.id === selectedProject.customerId) ?? null;
  }, [customers, selectedProject]);

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [tours, selectedTourId],
  );

  const assignedEmployees = useMemo(
    () => assignedEmployeeIds
      .map((id) => employees.find((employee) => employee.id === id))
      .filter((employee): employee is Employee => Boolean(employee)),
    [assignedEmployeeIds, employees],
  );

  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive && !assignedEmployeeIds.includes(employee.id)),
    [employees, assignedEmployeeIds],
  );

  const lockedStartDate = appointmentDetail?.startDate ?? startDate;
  const isLocked = isEditing && !isAdmin && isPastStartDate(lockedStartDate);

  const addEmployees = (ids: number[]) => {
    setAssignedEmployeeIds((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const removeEmployee = (employeeId: number) => {
    setAssignedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
  };

  const handleAssignTeam = (team: Team) => {
    const teamEmployees = employees
      .filter((employee) => employee.teamId === team.id && employee.isActive)
      .map((employee) => employee.id);
    console.info(`${logPrefix} team add`, { teamId: team.id, employees: teamEmployees.length });
    addEmployees(teamEmployees);
  };

  const applyTourChange = (tourId: number | null, employeeIds: number[]) => {
    setSelectedTourId(tourId);
    setAssignedEmployeeIds(employeeIds);
    console.info(`${logPrefix} tour reset applied`, {
      tourId,
      employeeCount: employeeIds.length,
    });
  };

  const handleTourChange = (tourId: number | null) => {
    if (tourId === selectedTourId) return;
    const nextEmployeeIds = tourId
      ? employees.filter((employee) => employee.tourId === tourId && employee.isActive).map((employee) => employee.id)
      : [];
    if (assignedEmployeeIds.length > 0) {
      console.info(`${logPrefix} tour change requires confirmation`, { tourId });
      setPendingTourChange({ tourId, employeeIds: nextEmployeeIds });
      setTourConfirmOpen(true);
      return;
    }
    applyTourChange(tourId, nextEmployeeIds);
  };

  const handleProjectSelect = (id: number) => {
    setSelectedProjectId(id);
    setProjectPickerOpen(false);
    console.info(`${logPrefix} project selected`, { projectId: id });
  };

  const validateForm = () => {
    if (!selectedProjectId) {
      console.info(`${logPrefix} validation blocked: project missing`);
      toast({ title: "Projekt ist erforderlich", variant: "destructive" });
      return false;
    }
    if (isEndDateEnabled && endDate < startDate) {
      console.info(`${logPrefix} validation blocked: endDate before startDate`);
      toast({ title: "Enddatum darf nicht vor dem Startdatum liegen", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitAppointment = async () => {
    if (isLocked) {
      toast({ title: "Termin ist gesperrt", description: "Nur Admins dürfen vergangene Termine ändern.", variant: "destructive" });
      console.info(`${logPrefix} save blocked: locked appointment`);
      return;
    }
    if (!validateForm()) return;

    if (assignedEmployeeIds.length === 0) {
      console.info(`${logPrefix} save requires confirmation: no employees`);
      setEmployeeConfirmOpen(true);
      return;
    }

    await persistAppointment();
  };

  const persistAppointment = async () => {
    if (!selectedProjectId) return;
    const payload = {
      projectId: selectedProjectId,
      tourId: selectedTourId,
      startDate,
      endDate: isEndDateEnabled ? endDate : null,
      startTime: startTimeEnabled ? buildTimeString(startTimeHour) : null,
      employeeIds: assignedEmployeeIds,
    };

    const method = isEditing ? "PATCH" : "POST";
    const url = isEditing ? `/api/appointments/${appointmentId}` : "/api/appointments";

    console.info(`${logPrefix} submit`, {
      method,
      url,
      projectId: payload.projectId,
      tourId: payload.tourId,
      employeeCount: payload.employeeIds.length,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    try {
      setIsSaving(true);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await response.json();
      console.info(`${logPrefix} submit response`, { status: response.status });
      if (!response.ok) {
        throw new Error(data?.message ?? "Speichern fehlgeschlagen");
      }
      toast({
        title: isEditing ? "Termin gespeichert" : "Termin erstellt",
      });
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EntityFormLayout
      title={isEditing ? "Termin bearbeiten" : "Neuer Termin"}
      icon={<Calendar className="w-6 h-6" />}
      onClose={onCancel}
      onCancel={onCancel}
      onSubmit={!isLocked ? submitAppointment : undefined}
      isSaving={isSaving}
      saveLabel={isEditing ? "Speichern" : "Termin erstellen"}
      closeOnSubmitSuccess={false}
      testIdPrefix="appointment"
    >
      {isLocked && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Termin gesperrt</AlertTitle>
          <AlertDescription>
            Ab dem Starttag kann der Termin nur noch von Admins geändert werden.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            Projektzuordnung
          </h3>

          {selectedProject ? (
            <ProjectInfoBadge
              title={selectedProject.name}
              customerFullName={selectedCustomer?.fullName ?? null}
              action={isLocked ? "none" : "remove"}
              onRemove={() => setSelectedProjectId(null)}
              fullWidth
              testId="badge-project"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
              Kein Projekt ausgewählt
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setProjectPickerOpen(true)}
            disabled={isLocked}
            data-testid="button-select-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            Projekt auswählen
          </Button>
        </div>

        <div className="space-y-4">
          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zeitpunkt und Dauer
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  disabled={isLocked}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Enddatum</Label>
                {isEndDateEnabled ? (
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={isLocked}
                    data-testid="input-end-date"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setIsEndDateEnabled(true)}
                    disabled={isLocked}
                    data-testid="button-enable-end-date"
                  >
                    Enddatum hinzufügen
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Startzeit (optional)</Label>
                {startTimeEnabled ? (
                  <Input
                    id="startTime"
                    inputMode="numeric"
                    value={startTimeHour}
                    onChange={(event) => setStartTimeHour(formatHourInput(event.target.value))}
                    placeholder="HH"
                    disabled={isLocked}
                    data-testid="input-start-time"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setStartTimeEnabled(true)}
                    disabled={isLocked}
                    data-testid="button-enable-start-time"
                  >
                    Startzeit hinzufügen
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  disabled
                  value=""
                  placeholder="--:--"
                  data-testid="input-end-time"
                />
              </div>
            </div>
          </div>

          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-4 h-4" />
              Tourzuordnung
            </h3>

            {selectedTour ? (
              <ColoredInfoBadge
                icon={<Route className="w-3 h-3" />}
                label={selectedTour.name}
                color={selectedTour.color}
                action={isLocked ? "none" : "remove"}
                onRemove={() => handleTourChange(null)}
                fullWidth
                testId="badge-tour"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                Keine Tour ausgewählt
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {tours.map((tour) => (
                <ColoredInfoBadge
                  key={tour.id}
                  icon={<Route className="w-3 h-3" />}
                  label={tour.name}
                  color={tour.color}
                  action={isLocked ? "none" : "add"}
                  onAdd={() => handleTourChange(tour.id)}
                  size="sm"
                  testId={`badge-tour-select-${tour.id}`}
                />
              ))}
            </div>
          </div>

          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Users className="w-4 h-4" />
              Kunde
            </h3>
            {selectedCustomer ? (
              <CustomerInfoBadge
                id={selectedCustomer.id}
                firstName={selectedCustomer.firstName}
                lastName={selectedCustomer.lastName}
                fullName={selectedCustomer.fullName}
                customerNumber={selectedCustomer.customerNumber}
                phone={selectedCustomer.phone}
                fullWidth
                testId="badge-customer"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                Kunde wird über das Projekt bestimmt
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mitarbeiter zuweisen
        </h3>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Teams</Label>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <ColoredInfoBadge
                key={team.id}
                icon={<Users className="w-3 h-3" />}
                label={team.name}
                color={team.color}
                action={isLocked ? "none" : "add"}
                onAdd={() => handleAssignTeam(team)}
                size="sm"
                testId={`badge-team-${team.id}`}
              />
            ))}
            {teams.length === 0 && (
              <div className="text-xs text-muted-foreground">Keine Teams vorhanden</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-slate-50">
          <Label className="text-xs text-muted-foreground block mb-3">Zugewiesene Mitarbeiter</Label>
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
                  onRemove={() => removeEmployee(employee.id)}
                  size="sm"
                  testId={`badge-employee-${employee.id}`}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Mitarbeiter hinzufügen</Label>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEmployeePickerOpen(true)}
            disabled={isLocked}
            data-testid="button-add-employee"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mitarbeiter auswählen
          </Button>
        </div>
      </div>

      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <ProjectList
            mode="picker"
            selectedProjectId={selectedProjectId}
            title="Projekt auswählen"
            onSelectProject={handleProjectSelect}
            onCancel={() => setProjectPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeeListView
            employees={availableEmployees}
            teams={teams}
            tours={tours}
            isLoading={employeesLoading}
            mode="picker"
            title="Mitarbeiter auswählen"
            onSelectEmployee={(employeeId) => {
              addEmployees([employeeId]);
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={tourConfirmOpen} onOpenChange={setTourConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitarbeiterliste zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Beim Ändern der Tour werden die bisherigen Mitarbeiter entfernt und durch die Tour-Mitarbeiter ersetzt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTourChange(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTourChange) {
                  applyTourChange(pendingTourChange.tourId, pendingTourChange.employeeIds);
                }
                setPendingTourChange(null);
                setTourConfirmOpen(false);
              }}
            >
              Tour übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={employeeConfirmOpen} onOpenChange={setEmployeeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ohne Mitarbeiter speichern?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird ohne zugewiesene Mitarbeiter gespeichert. Möchten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setEmployeeConfirmOpen(false);
                await persistAppointment();
              }}
            >
              Trotzdem speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Daten werden geladen...
        </div>
      )}
    </EntityFormLayout>
  );
}
