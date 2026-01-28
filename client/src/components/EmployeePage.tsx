import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { EntityCard } from "@/components/ui/entity-card";
import { Users, Route, Calendar, Power, PowerOff } from "lucide-react";
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

export function EmployeePage({ onClose, onCancel }: EmployeePageProps) {
  const handleClose = onClose || onCancel;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { active: "all" }],
    queryFn: () => fetch("/api/employees?active=all").then(r => r.json()),
  });

  const { data: employeeDetails } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", selectedEmployeeId],
    queryFn: () => fetch(`/api/employees/${selectedEmployeeId}`).then(r => r.json()),
    enabled: !!selectedEmployeeId,
  });

  const { data: currentAppointments = [] } = useQuery<any[]>({
    queryKey: ["/api/employees", selectedEmployeeId, "current-appointments"],
    queryFn: () => fetch(`/api/employees/${selectedEmployeeId}/current-appointments`).then(r => r.json()),
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
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      invalidateEmployees();
      setCreateDialogOpen(false);
      setFormName("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string } }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
      setEditDialogOpen(false);
      setFormName("");
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

  const handleOpenCreate = () => {
    setFormName("");
    setCreateDialogOpen(true);
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({ name: formName.trim() });
  };

  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setDetailDialogOpen(true);
  };

  const handleOpenEdit = () => {
    if (employeeDetails) {
      setFormName(employeeDetails.employee.name);
      setDetailDialogOpen(false);
      setEditDialogOpen(true);
    }
  };

  const handleUpdate = () => {
    if (!formName.trim() || !selectedEmployeeId) return;
    updateMutation.mutate({ id: selectedEmployeeId, data: { name: formName.trim() } });
  };

  const handleToggleActive = (employee: Employee) => {
    toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive });
  };

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
            title={employee.name}
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
              <div className="flex items-center gap-2 text-xs">
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Neuer Mitarbeiter
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Name *</Label>
              <Input
                id="employee-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Name des Mitarbeiters..."
                data-testid="input-employee-name"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-employee">
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || createMutation.isPending}
              data-testid="button-save-employee"
            >
              {createMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mitarbeiter Details
            </DialogTitle>
          </DialogHeader>
          {employeeDetails && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{employeeDetails.employee.name}</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employeeDetails.employee.isActive}
                      disabled={true}
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <Label className="text-muted-foreground text-sm">
                      Aktiv <span className="text-xs">(nur Administrator)</span>
                    </Label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {employeeDetails.team && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {employeeDetails.team.name}
                    </Badge>
                  )}
                  {employeeDetails.tour && (
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-1"
                      style={{ 
                        backgroundColor: employeeDetails.tour.color,
                        color: '#374151'
                      }}
                    >
                      <Route className="w-3 h-3" />
                      {employeeDetails.tour.name}
                    </Badge>
                  )}
                  {!employeeDetails.team && !employeeDetails.tour && (
                    <span className="text-sm text-slate-400 italic">
                      Keinem Team oder Tour zugewiesen
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  Aktuelle Termine
                </h4>
                <div className="border rounded-md p-3 bg-slate-50 min-h-[100px]">
                  {currentAppointments.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">
                      Keine aktuellen Termine
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {currentAppointments.map((apt: any) => (
                        <li key={apt.id} className="text-sm flex justify-between">
                          <span>{apt.title}</span>
                          <span className="text-slate-500">{apt.date}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Schließen
            </Button>
            <Button onClick={handleOpenEdit} data-testid="button-edit-employee">
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mitarbeiter bearbeiten
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-name">Name *</Label>
              <Input
                id="edit-employee-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Name des Mitarbeiters..."
                data-testid="input-edit-employee-name"
              />
            </div>
            {employeeDetails && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-employee-active"
                  checked={employeeDetails.employee.isActive}
                  disabled={true}
                  className="w-4 h-4 cursor-not-allowed"
                />
                <Label htmlFor="edit-employee-active" className="text-muted-foreground">
                  Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
                </Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || updateMutation.isPending}
              data-testid="button-update-employee"
            >
              {updateMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
