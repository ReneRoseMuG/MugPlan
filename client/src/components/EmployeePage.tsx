import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { EmployeeList } from "@/components/EmployeeList";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { Users, Route, Calendar, Phone, Mail, X } from "lucide-react";
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
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null } }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
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
    resetForm();
    setDetailDialogOpen(true);
  };

  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsCreating(false);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || "",
      email: employee.email || "",
    });
    setDetailDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      throw new Error("validation");
    }

    if (isCreating) {
      await createMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
    } else if (selectedEmployeeId) {
      await updateMutation.mutateAsync({
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

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setIsCreating(false);
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
      <EmployeeList
        onClose={handleClose}
        onNewEmployee={handleOpenCreate}
        isNewEmployeePending={createMutation.isPending}
        onOpenEmployee={handleOpenDetail}
        onToggleActive={handleToggleActive}
      />

      <EntityEditDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        title={dialogTitle}
        icon={Users}
        onSubmit={handleSubmit}
        onCancel={handleCloseDialog}
        isSaving={createMutation.isPending || updateMutation.isPending}
        saveDisabled={!formData.firstName.trim() || !formData.lastName.trim()}
        maxWidth="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden"
        headerExtra={
          <Button
            size="lg"
            variant="ghost"
            onClick={handleCloseDialog}
            className="ml-auto"
            data-testid="button-close-employee-detail"
          >
            <X className="w-5 h-5" />
          </Button>
        }
        saveTestId="button-save-employee"
        cancelTestId="button-cancel-employee"
      >
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

              {/* Tour card (read-only) */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Route className="w-4 h-4" />
                  Tour
                </h4>
                {!isCreating && displayEmployee?.tour ? (
                  <ColoredInfoBadge
                    icon={<Route className="w-4 h-4" />}
                    label={displayEmployee.tour.name}
                    color={displayEmployee.tour.color}
                    fullWidth
                    testId="badge-employee-tour"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">
                      Keiner Tour zugewiesen
                    </p>
                  </div>
                )}
              </div>

              {/* Team card (read-only) */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  Team
                </h4>
                {!isCreating && displayEmployee?.team ? (
                  <ColoredInfoBadge
                    icon={<Users className="w-4 h-4" />}
                    label={displayEmployee.team.name}
                    color={displayEmployee.team.color}
                    fullWidth
                    testId="badge-employee-team"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">
                      Keinem Team zugewiesen
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </EntityEditDialog>
    </>
  );
}
