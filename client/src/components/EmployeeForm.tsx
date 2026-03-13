import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, Phone, Route, Users } from "lucide-react";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { EmployeeAbsencesPanel } from "@/components/EmployeeAbsencesPanel";
import { EmployeeAttachmentsPanel } from "@/components/EmployeeAttachmentsPanel";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee, Team, Tour } from "@shared/schema";

interface EmployeeWithRelations {
  employee: Employee;
  team: Team | null;
  tour: Tour | null;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface EmployeeFormProps {
  employeeId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
}

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

export function EmployeeForm({ employeeId, onCancel, onSaved, onOpenAppointment }: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = Boolean(employeeId);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const { data: employeeDetails, isLoading: employeeDetailsLoading } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", employeeId],
    queryFn: () => fetch(`/api/employees/${employeeId}`).then((response) => response.json()),
    enabled: isEditing,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
  });

  const { data: activeEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: inactiveEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "inactive" }],
    queryFn: () => fetch("/api/employees?scope=inactive").then((response) => response.json()),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!employeeDetails) return;
    setFormData({
      firstName: employeeDetails.employee.firstName,
      lastName: employeeDetails.employee.lastName,
      phone: employeeDetails.employee.phone ?? "",
      email: employeeDetails.employee.email ?? "",
    });
  }, [employeeDetails]);

  const allEmployees = useMemo(() => {
    if (!isAdmin) return employees;
    const byId = new Map<number, Employee>();
    for (const employee of activeEmployees) byId.set(employee.id, employee);
    for (const employee of inactiveEmployees) byId.set(employee.id, employee);
    return Array.from(byId.values());
  }, [isAdmin, employees, activeEmployees, inactiveEmployees]);

  const teamMembers = useMemo(() => {
    if (!employeeDetails?.team?.id) return [];
    return allEmployees
      .filter((employee) => employee.teamId === employeeDetails.team?.id)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }));
  }, [allEmployees, employeeDetails?.team?.id]);

  const tourMembers = useMemo(() => {
    if (!employeeDetails?.tour?.id) return [];
    return allEmployees
      .filter((employee) => employee.tourId === employeeDetails.tour?.id)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }));
  }, [allEmployees, employeeDetails?.tour?.id]);

  const createMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone?: string; email?: string }) => {
      return apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null; version: number };
    }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Mitarbeiter wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Aenderung nicht erlaubt.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Speichern fehlgeschlagen", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, version }: { id: number; isActive: boolean; version: number }) => {
      return apiRequest("PATCH", `/api/employees/${id}/active`, { isActive, version });
    },
    onSuccess: () => {
      invalidateEmployees();
      if (employeeId) {
        void queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      }
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Aktiv-Status nicht moeglich",
          description: "Mitarbeiter wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({
          title: "Aktiv-Status nicht moeglich",
          description: "Nur Admin darf den Aktiv-Status aendern.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Aktiv-Status konnte nicht geaendert werden", variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      throw new Error("validation");
    }

    if (isEditing && employeeId && employeeDetails) {
      const version = employeeDetails.employee.version;
      if (!Number.isInteger(version) || (version ?? 0) < 1) {
        throw new Error("validation");
      }
      await updateMutation.mutateAsync({
        id: employeeId,
        data: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          version,
        },
      });
    } else {
      await createMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
    }

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
  };

  const handleToggleActive = (checked: boolean) => {
    if (!isAdmin || !employeeDetails?.employee || !employeeId) return;
    toggleActiveMutation.mutate({
      id: employeeId,
      isActive: checked,
      version: employeeDetails.employee.version,
    });
  };

  const title = isEditing
    ? (employeeDetails ? `${employeeDetails.employee.lastName}, ${employeeDetails.employee.firstName}` : "Mitarbeiter bearbeiten")
    : "Neuer Mitarbeiter";

  return (
    <EntityFormLayout
      title={title}
      icon={<Users className="w-6 h-6" />}
      onClose={onCancel}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      isSaving={createMutation.isPending || updateMutation.isPending}
      saveLabel="Speichern"
      testIdPrefix="employee"
    >
      <Tabs defaultValue="stammdaten" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stammdaten" data-testid="tab-employee-stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="abwesenheiten" data-testid="tab-employee-abwesenheiten">Abwesenheiten</TabsTrigger>
          <TabsTrigger value="termine" data-testid="tab-employee-termine">Termine</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten" className="min-h-[620px]">
          <div className="grid grid-cols-3 items-start gap-6">
            <div className="col-span-2 space-y-6 min-h-0">
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Stammdaten
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="Vorname..."
                      data-testid="input-employee-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Nachname..."
                      data-testid="input-employee-lastname"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Telefonnummer..."
                      data-testid="input-employee-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      E-Mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="E-Mail-Adresse..."
                      data-testid="input-employee-email"
                    />
                  </div>
                </div>
                {isAdmin && isEditing && employeeDetails ? (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="employee-is-active"
                      checked={employeeDetails.employee.isActive}
                      onCheckedChange={(checked) => handleToggleActive(checked === true)}
                    />
                    <Label htmlFor="employee-is-active" className="text-muted-foreground text-sm">
                      Aktiv
                    </Label>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              {employeeId ? <EmployeeAttachmentsPanel employeeId={employeeId} className="h-auto" /> : null}

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Route className="w-4 h-4" />
                  Tour
                </h4>
                {isEditing && employeeDetails?.tour ? (
                  <TourInfoBadge
                    id={employeeDetails.tour.id}
                    name={employeeDetails.tour.name}
                    color={employeeDetails.tour.color}
                    members={tourMembers}
                    action="none"
                    fullWidth
                    testId="badge-employee-tour"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">Keiner Tour zugewiesen</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  Team
                </h4>
                {isEditing && employeeDetails?.team ? (
                  <TeamInfoBadge
                    id={employeeDetails.team.id}
                    name={employeeDetails.team.name}
                    color={employeeDetails.team.color}
                    members={teamMembers}
                    action="none"
                    fullWidth
                    testId="badge-employee-team"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">Keinem Team zugewiesen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="abwesenheiten">
          {employeeId ? (
            <EmployeeAbsencesPanel employeeId={employeeId} />
          ) : (
            <p className="py-4 text-sm text-slate-400">
              Nach dem Speichern des Mitarbeiters koennen Abwesenheiten erfasst werden.
            </p>
          )}
        </TabsContent>

        <TabsContent value="termine">
          {employeeId ? (
            <AppointmentsListPage
              title="Termine"
              helpKey="appointments.list.employeeForm"
              context={{ type: "employee", employeeId }}
              onOpenAppointment={onOpenAppointment}
              className="min-h-[620px]"
            />
          ) : (
            <p className="py-4 text-sm text-slate-400">
              Nach dem Speichern des Mitarbeiters werden Termine angezeigt.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {isEditing && employeeDetailsLoading ? (
        <div className="mt-6 text-sm text-muted-foreground">
          Daten werden geladen...
        </div>
      ) : null}
    </EntityFormLayout>
  );
}
