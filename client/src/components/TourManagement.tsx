import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Route, Pencil, UserCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { ColorPickerButton } from "@/components/ui/color-picker-button";
import { defaultEntityColor } from "@/lib/colors";
import type { Tour, Employee } from "@shared/schema";

interface TourWithMembers extends Tour {
  members: Employee[];
}

interface TourManagementProps {
  onCancel?: () => void;
}

function EditTourMembersDialog({
  open,
  onOpenChange,
  tour,
  allEmployees,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: TourWithMembers;
  allEmployees: Employee[];
  onSave: (tourId: number, employeeIds: number[], color: string) => void;
  isSaving: boolean;
}) {
  const currentMemberIds = tour.members.map(m => m.id);
  const [selectedMembers, setSelectedMembers] = useState<number[]>(currentMemberIds);
  const [selectedColor, setSelectedColor] = useState<string>(tour.color);

  const handleToggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = () => {
    onSave(tour.id, selectedMembers, selectedColor);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedMembers(currentMemberIds);
      setSelectedColor(tour.color);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Route className="w-5 h-5" />
            {tour.name}
            <ColorPickerButton
              color={selectedColor}
              onChange={setSelectedColor}
            />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="border-l-4 border border-border bg-slate-50 p-3"
            style={{ borderLeftColor: selectedColor }}
          >
            <div className="text-sm font-medium text-slate-700 mb-2">
              Mitarbeiter auswählen:
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEmployees.filter(e => e.isActive).map((employee) => {
                const isAssignedElsewhere = employee.tourId !== null && employee.tourId !== tour.id;
                const isSelected = selectedMembers.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => !isAssignedElsewhere && handleToggleMember(employee.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      isAssignedElsewhere ? "opacity-50 bg-slate-100 cursor-not-allowed" : isSelected ? "bg-primary/10" : "hover:bg-white"
                    }`}
                    data-testid={`checkbox-tour-employee-${employee.id}`}
                  >
                    <Checkbox
                      id={`tour-employee-${employee.id}`}
                      disabled={isAssignedElsewhere}
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => handleToggleMember(employee.id)}
                    />
                    <span
                      className={`text-sm ${
                        isAssignedElsewhere ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {employee.lastName}, {employee.firstName}
                      {isAssignedElsewhere && (
                        <span className="ml-2 text-xs text-slate-400">(bereits in anderer Tour)</span>
                      )}
                    </span>
                  </div>
                );
              })}
              {allEmployees.filter(e => e.isActive).length === 0 && (
                <div className="text-sm text-slate-400 italic py-2">
                  Keine aktiven Mitarbeiter vorhanden
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-tour-members">
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function TourManagement({ onCancel }: TourManagementProps) {
  const [editingTour, setEditingTour] = useState<TourWithMembers | null>(null);

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const isLoading = toursLoading || employeesLoading;

  const toursWithMembers: TourWithMembers[] = tours.map(tour => ({
    ...tour,
    members: employees.filter(e => e.tourId === tour.id),
  }));

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/tours', { color: defaultEntityColor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => {
      return apiRequest('PATCH', `/api/tours/${id}`, { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const invalidateEmployees = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      }
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tours/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      invalidateEmployees();
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async ({ tourId, employeeIds }: { tourId: number; employeeIds: number[] }) => {
      return apiRequest('POST', `/api/tours/${tourId}/employees`, { employeeIds });
    },
    onSuccess: () => {
      invalidateEmployees();
      setEditingTour(null);
    },
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return apiRequest('DELETE', `/api/tours/employees/${employeeId}`);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const handleColorChange = (id: number, color: string) => {
    updateMutation.mutate({ id, color });
  };

  const handleSaveTour = async (tourId: number, employeeIds: number[], color: string) => {
    await updateMutation.mutateAsync({ id: tourId, color });
    assignMembersMutation.mutate({ tourId, employeeIds });
  };

  const handleRemoveEmployee = (employeeId: number) => {
    removeEmployeeMutation.mutate(employeeId);
  };

  return (
    <>
      <CardListLayout
        title="Touren"
        icon={<Route className="w-5 h-5" />}
        helpKey="tours"
        isLoading={isLoading}
        onClose={onCancel}
        closeTestId="button-close-tours"
        gridTestId="list-tours"
        gridCols="3"
        primaryAction={{
          label: "Neue Tour",
          onClick: () => createMutation.mutate(),
          isPending: createMutation.isPending,
          testId: "button-new-tour",
        }}
        secondaryAction={onCancel ? {
          label: "Schließen",
          onClick: onCancel,
          testId: "button-cancel-tours",
        } : undefined}
      >
        {toursWithMembers.map((tour) => (
          <ColoredEntityCard
            key={tour.id}
            title={tour.name}
            icon={<Route className="w-4 h-4" />}
            borderColor={tour.color}
            onDelete={() => deleteMutation.mutate(tour.id)}
            isDeleting={deleteMutation.isPending}
            testId={`card-tour-${tour.id}`}
            footer={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTour(tour);
                }}
                data-testid={`button-edit-tour-members-${tour.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Mitarbeiter
            </div>
            <div className="space-y-1">
              {tour.members.map((member) => (
                <div 
                  key={member.id} 
                  className="text-sm text-slate-700 flex items-center justify-between group"
                  data-testid={`text-tour-member-${member.id}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3 text-primary" />
                    {member.lastName}, {member.firstName}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmployee(member.id);
                    }}
                    data-testid={`button-remove-tour-employee-${member.id}`}
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                  </Button>
                </div>
              ))}
              {tour.members.length === 0 && (
                <div className="text-sm text-slate-400 italic">
                  Keine Mitarbeiter zugewiesen
                </div>
              )}
            </div>
          </ColoredEntityCard>
        ))}
      </CardListLayout>

      {editingTour && (
        <EditTourMembersDialog
          open={!!editingTour}
          onOpenChange={(open) => !open && setEditingTour(null)}
          tour={toursWithMembers.find(t => t.id === editingTour.id) || editingTour}
          allEmployees={employees}
          onSave={handleSaveTour}
          isSaving={updateMutation.isPending || assignMembersMutation.isPending}
        />
      )}
    </>
  );
}
