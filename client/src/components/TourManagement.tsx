import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Route, Pencil, UserCheck, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { TourEditDialog } from "@/components/ui/tour-edit-dialog";
import { defaultEntityColor } from "@/lib/colors";
import type { Tour, Employee } from "@shared/schema";

interface TourWithMembers extends Tour {
  members: Employee[];
}

interface TourManagementProps {
  onCancel?: () => void;
}

export function TourManagement({ onCancel }: TourManagementProps) {
  const [editingTour, setEditingTour] = useState<TourWithMembers | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const getNextTourName = () => {
    const existingNumbers = tours
      .map(t => {
        const match = t.name.match(/^Tour (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `Tour ${maxNumber + 1}`;
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => {
      return apiRequest('POST', '/api/tours', { color });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      return response;
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

  const handleOpenCreate = () => {
    setEditingTour(null);
    setIsCreating(true);
  };

  const handleSubmitTour = async (tourId: number | null, employeeIds: number[], color: string) => {
    if (tourId === null) {
      const response = await createMutation.mutateAsync({ color });
      const newTour = await response.json();
      await assignMembersMutation.mutateAsync({ tourId: newTour.id, employeeIds });
    } else {
      await updateMutation.mutateAsync({ id: tourId, color });
      await assignMembersMutation.mutateAsync({ tourId, employeeIds });
    }
  };

  const handleRemoveEmployee = (employeeId: number) => {
    removeEmployeeMutation.mutate(employeeId);
  };

  const handleCloseDialog = () => {
    setEditingTour(null);
    setIsCreating(false);
  };

  const handleOpenEdit = (tour: TourWithMembers) => {
    setEditingTour(tour);
  };

  const handleDelete = (tour: TourWithMembers) => {
    if (window.confirm(`Wollen Sie die Tour ${tour.name} wirklich löschen?`)) {
      deleteMutation.mutate(tour.id);
    }
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
          onClick: handleOpenCreate,
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
            onDelete={() => handleDelete(tour)}
            isDeleting={deleteMutation.isPending}
            testId={`card-tour-${tour.id}`}
            onDoubleClick={() => handleOpenEdit(tour)}
            footer={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(tour);
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

      <TourEditDialog
        open={!!editingTour || isCreating}
        onOpenChange={(open) => !open && handleCloseDialog()}
        tour={editingTour ? (toursWithMembers.find(t => t.id === editingTour.id) || editingTour) : null}
        allEmployees={employees}
        onSubmit={handleSubmitTour}
        isSaving={createMutation.isPending || updateMutation.isPending || assignMembersMutation.isPending}
        isCreate={isCreating}
        defaultName={getNextTourName()}
        defaultColor={defaultEntityColor}
      />
    </>
  );
}
