import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ColorSelectEntityEditDialog, ColorSelectEntityEditDialogProps } from "./color-select-entity-edit-dialog";
import { EmployeeInfoBadge } from "./employee-info-badge";
import { EmployeeListView } from "@/components/EmployeeList";
import type { Employee } from "@shared/schema";

export interface EmployeeSelectEntityEditDialogProps extends Omit<ColorSelectEntityEditDialogProps, 'children'> {
  allEmployees: Employee[];
  selectedMembers: number[];
  onToggleMember: (employeeId: number) => void;
  entityId: number | null;
  entityType: 'tour' | 'team';
  children?: ReactNode;
}

export function EmployeeSelectEntityEditDialog({
  allEmployees,
  selectedMembers,
  onToggleMember,
  entityId,
  entityType,
  selectedColor,
  children,
  ...props
}: EmployeeSelectEntityEditDialogProps) {
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);

  const getIsAssignedElsewhere = (employee: Employee) => {
    if (entityType === 'tour') {
      return employee.tourId !== null && employee.tourId !== entityId;
    } else {
      return employee.teamId !== null && employee.teamId !== entityId;
    }
  };

  const availableEmployees = allEmployees.filter((employee) => {
    if (!employee.isActive) return false;
    if (getIsAssignedElsewhere(employee)) return false;
    return !selectedMembers.includes(employee.id);
  });

  return (
    <ColorSelectEntityEditDialog
      {...props}
      selectedColor={selectedColor}
    >
      {children}
      <div
        className="border-l-4 border border-border bg-slate-50 dark:bg-slate-900 p-3 space-y-3"
        style={{ borderLeftColor: selectedColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Mitarbeiter
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectionDialogOpen(true)}
            data-testid={`button-add-${entityType}-member`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Hinzufügen
          </Button>
        </div>
        <div className="space-y-2">
          {selectedMembers.map((memberId) => {
            const employee = allEmployees.find((member) => member.id === memberId);
            if (!employee) return null;
            return (
              <EmployeeInfoBadge
                key={employee.id}
                id={employee.id}
                firstName={employee.firstName}
                lastName={employee.lastName}
                action="remove"
                onRemove={() => onToggleMember(employee.id)}
                size="sm"
                fullWidth
                testId={`badge-${entityType}-member-${employee.id}`}
              />
            );
          })}
          {selectedMembers.length === 0 && (
            <div className="text-sm text-slate-400 italic">
              Keine Mitarbeiter zugewiesen
            </div>
          )}
        </div>
      </div>

      <Dialog open={selectionDialogOpen} onOpenChange={setSelectionDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeeListView
            mode="picker"
            employees={availableEmployees}
            teams={[]}
            tours={[]}
            showCloseButton={false}
            onSelectEmployee={(employeeId) => {
              if (!selectedMembers.includes(employeeId)) {
                onToggleMember(employeeId);
              }
              setSelectionDialogOpen(false);
            }}
            onClose={() => setSelectionDialogOpen(false)}
            title="Mitarbeiter auswählen"
          />
        </DialogContent>
      </Dialog>
    </ColorSelectEntityEditDialog>
  );
}
