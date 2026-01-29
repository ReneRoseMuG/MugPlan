import { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorSelectEntityEditDialog, ColorSelectEntityEditDialogProps } from "./color-select-entity-edit-dialog";
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
  const getIsAssignedElsewhere = (employee: Employee) => {
    if (entityType === 'tour') {
      return employee.tourId !== null && employee.tourId !== entityId;
    } else {
      return employee.teamId !== null && employee.teamId !== entityId;
    }
  };

  const getAssignedElsewhereText = () => {
    return entityType === 'tour' ? "(bereits in anderer Tour)" : "(bereits in anderem Team)";
  };

  return (
    <ColorSelectEntityEditDialog
      {...props}
      selectedColor={selectedColor}
    >
      {children}
      <div 
        className="border-l-4 border border-border bg-slate-50 dark:bg-slate-900 p-3"
        style={{ borderLeftColor: selectedColor }}
      >
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Mitarbeiter auswählen:
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allEmployees.filter(e => e.isActive).map((employee) => {
            const isAssignedElsewhere = getIsAssignedElsewhere(employee);
            const isSelected = selectedMembers.includes(employee.id);
            return (
              <div
                key={employee.id}
                onClick={() => !isAssignedElsewhere && onToggleMember(employee.id)}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                  isAssignedElsewhere 
                    ? "opacity-50 bg-slate-100 dark:bg-slate-800 cursor-not-allowed" 
                    : isSelected 
                      ? "bg-primary/10" 
                      : "hover:bg-white dark:hover:bg-slate-800"
                }`}
                data-testid={`checkbox-${entityType}-employee-${employee.id}`}
              >
                <Checkbox
                  id={`${entityType}-employee-${employee.id}`}
                  disabled={isAssignedElsewhere}
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => onToggleMember(employee.id)}
                />
                <span
                  className={`text-sm ${
                    isAssignedElsewhere ? "text-slate-400" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {employee.lastName}, {employee.firstName}
                  {isAssignedElsewhere && (
                    <span className="ml-2 text-xs text-slate-400">{getAssignedElsewhereText()}</span>
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
    </ColorSelectEntityEditDialog>
  );
}
