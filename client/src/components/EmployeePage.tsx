import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { EntityCard } from "@/components/ui/entity-card";
import { Users, Route, Calendar, Power, PowerOff, Phone, Mail, X, Pencil } from "lucide-react";
import type { Employee, Team, Tour } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface EmployeeWithRelations {
  employee: Employee;
  team: Team | null;
  tour: Tour | null;
}

interface EmployeePageProps {
  onClose?: () => void;
  onCancel?: () => void;
  onOpenEmployeeWeekly?: (id: number, name: string) => void;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const demoAppointments = [
  { id: 1, title: "Müller, Max - Wartung", date: "Mo, 03.02.2026" },
  { id: 2, title: "Schmidt, Anna - Installation", date: "Di, 04.02.2026" },
  { id: 3, title: "Weber, Peter - Service", date: "Mi, 05.02.2026" },
];

export function EmployeePage({ onClose, onCancel }: EmployeePageProps) {
  const handleClose = onClose || onCancel;
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { active: "all" }],
    queryFn: () => fetch("/api/employees?active=all").then(r => r.json()),
  });

  const { data: employeeDetails } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", selectedEmployeeId],
    queryFn: () => fetch(`/api/employees/${selectedEmployeeId}`).then(r => r.json()),
    enabled: !!selectedEmployeeId,
  });

  const invalidateEmployees = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      }
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone?: string; email?: string }) => {
      return apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      invalidateEmployees();
      setDetailDialogOpen(false);
      setIsCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null } }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
      setIsEditing(false);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/employees/${id}/active`, { isActive });
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "" });
  };

  const handleOpenCreate = () => {
    setSelectedEmployeeId(null);
    setIsCreating(true);
    setIsEditing(true);
    resetForm();
    setDetailDialogOpen(true);
  };

  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsCreating(false);
    setIsEditing(false);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || "",
      email: employee.email || "",
    });
    setDetailDialogOpen(true);
  };

  const handleStartEdit = () => {
    if (employeeDetails) {
      setFormData({
        firstName: employeeDetails.employee.firstName,
        lastName: employeeDetails.employee.lastName,
        phone: employeeDetails.employee.phone || "",
        email: employeeDetails.employee.email || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;
    
    if (isCreating) {
      createMutation.mutate({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
    } else if (selectedEmployeeId) {
      updateMutation.mutate({
        id: selectedEmployeeId,
        data: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
        },
      });
    }
  };

  const handleCancelEdit = () => {
    if (isCreating) {
      setDetailDialogOpen(false);
      setIsCreating(false);
      resetForm();
    } else {
      setIsEditing(false);
      if (employeeDetails) {
        setFormData({
          firstName: employeeDetails.employee.firstName,
          lastName: employeeDetails.employee.lastName,
          phone: employeeDetails.employee.phone || "",
          email: employeeDetails.employee.email || "",
        });
      }
    }
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setIsCreating(false);
    setIsEditing(false);
    resetForm();
  };

  const handleToggleActive = (employee: Employee) => {
    toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive });
  };

  const displayEmployee = isCreating ? null : employeeDetails;
  const dialogTitle = isCreating 
    ? "Neuer Mitarbeiter" 
    : (displayEmployee ? `${displayEmployee.employee.lastName}, ${displayEmployee.employee.firstName}` : "Mitarbeiter Details");

  return (
    <>
      <CardListLayout
        title="Mitarbeiter"
        icon={<Users className="w-5 h-5" />}
        helpKey="employees"
        isLoading={isLoading}
        onClose={handleClose}
        closeTestId="button-close-employees"
        gridTestId="list-employees"
        gridCols="3"
        primaryAction={{
          label: "Neuer Mitarbeiter",
          onClick: handleOpenCreate,
          isPending: createMutation.isPending,
          testId: "button-new-employee",
        }}
        isEmpty={employees.length === 0}
        emptyState={
          <p className="text-sm text-slate-400 text-center py-8 col-span-3">
            Keine Mitarbeiter vorhanden
          </p>
        }
      >
        {employees.map((employee) => (
          <EntityCard
            key={employee.id}
            testId={`employee-card-${employee.id}`}
            title={`${employee.lastName}, ${employee.firstName}`}
            icon={<Users className="w-4 h-4" />}
            className={!employee.isActive ? "opacity-60" : ""}
            onDoubleClick={() => handleOpenDetail(employee)}
            actions={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(employee);
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
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {employee.phone && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Phone className="w-3 h-3" />
                    {employee.phone}
                  </span>
                )}
                {employee.teamId && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Team
                  </Badge>
                )}
                {employee.tourId && (
                  <Badge variant="secondary" className="text-xs">
                    <Route className="w-3 h-3 mr-1" />
                    Tour
                  </Badge>
                )}
                {!employee.isActive && (
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">
                    Inaktiv
                  </span>
                )}
              </div>
            }
          >
            <p className="text-sm text-slate-500">
              Doppelklick für Details
            </p>
          </EntityCard>
        ))}
      </CardListLayout>

      <Dialog open={detailDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {dialogTitle}
            </DialogTitle>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleCloseDialog}
              data-testid="button-close-employee-detail"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* Left column: Employee form - always editable */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Vorname..."
                      data-testid="input-employee-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="E-Mail-Adresse..."
                      data-testid="input-employee-email"
                    />
                  </div>
                </div>

                {/* Active status - read-only */}
                {!isCreating && displayEmployee && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <input
                      type="checkbox"
                      checked={displayEmployee.employee.isActive}
                      disabled={true}
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <Label className="text-muted-foreground text-sm">
                      Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
                    </Label>
                  </div>
                )}
              </div>

              {/* Right column: Appointments + Tour + Team */}
              <div className="space-y-4">
                {/* Appointments list */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    Aktuelle Termine
                  </h4>
                  <div className="border rounded-md p-3 bg-slate-50 min-h-[120px] max-h-[180px] overflow-y-auto">
                    {demoAppointments.length === 0 ? (
                      <p className="text-sm text-slate-400 italic text-center py-4">
                        Keine aktuellen Termine
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {demoAppointments.map((apt) => (
                          <li key={apt.id} className="p-2 bg-white rounded border text-sm">
                            <div className="font-medium">{apt.title}</div>
                            <div className="text-slate-500 text-xs">{apt.date}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    Demo-Daten - Terminverwaltung folgt
                  </p>
                </div>

                {/* Tour card (read-only with edit button) */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                    <Route className="w-4 h-4" />
                    Tour
                  </h4>
                  {!isCreating && displayEmployee?.tour ? (
                    <div 
                      className="flex items-center justify-between px-3 py-2 border border-border bg-slate-50 border-l-4"
                      style={{ borderLeftColor: displayEmployee.tour.color }}
                    >
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-700">{displayEmployee.tour.name}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled
                        title="Tour-Zuweisung über Touren-Verwaltung"
                        data-testid="button-edit-employee-tour"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 border bg-slate-50">
                      <p className="text-sm text-slate-400 italic">
                        Keiner Tour zugewiesen
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled
                        title="Tour-Zuweisung über Touren-Verwaltung"
                        data-testid="button-edit-employee-tour"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Team card (read-only with edit button) */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    Team
                  </h4>
                  {!isCreating && displayEmployee?.team ? (
                    <div 
                      className="flex items-center justify-between px-3 py-2 border border-border bg-slate-50 border-l-4"
                      style={{ borderLeftColor: displayEmployee.team.color }}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-700">{displayEmployee.team.name}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled
                        title="Team-Zuweisung über Team-Verwaltung"
                        data-testid="button-edit-employee-team"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 border bg-slate-50">
                      <p className="text-sm text-slate-400 italic">
                        Keinem Team zugewiesen
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled
                        title="Team-Zuweisung über Team-Verwaltung"
                        data-testid="button-edit-employee-team"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 border-t pt-4 mt-4">
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-employee">
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.firstName.trim() || !formData.lastName.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-employee"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
