import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, LayoutGrid, Mail, Phone, Users } from "lucide-react";
import type { Employee, Team, Tour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityCard } from "@/components/ui/entity-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmployeePickerFilterPanel } from "@/components/ui/filter-panels/employee-picker-filter-panel";
import { useSettings } from "@/hooks/useSettings";

type EmployeePickerViewMode = "board" | "list";

function parseEmployeePickerViewMode(value: unknown): EmployeePickerViewMode {
  return value === "list" ? "list" : "board";
}

interface EmployeePickerDialogListProps {
  employees: Employee[];
  teams: Team[];
  tours: Tour[];
  selectedEmployeeId?: number | null;
  isLoading?: boolean;
  title?: string;
  allowBulkSelection?: boolean;
  viewModeSettingKey?: string;
  onSelectEmployee?: (employeeId: number) => void;
  onConfirmSelection?: (employeeIds: number[]) => void;
  onClose?: () => void;
}

export function EmployeePickerDialogList({
  employees,
  teams,
  tours: _tours,
  selectedEmployeeId = null,
  isLoading = false,
  title = "Mitarbeiter auswählen",
  allowBulkSelection = false,
  viewModeSettingKey,
  onSelectEmployee,
  onConfirmSelection,
  onClose,
}: EmployeePickerDialogListProps) {
  const { settingsByKey, setSetting } = useSettings();
  const resolvedViewMode = parseEmployeePickerViewMode(
    allowBulkSelection && viewModeSettingKey
      ? settingsByKey.get(viewModeSettingKey)?.resolvedValue
      : "board",
  );
  const [nameFilter, setNameFilter] = useState("");
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [viewMode, setViewMode] = useState<EmployeePickerViewMode>(resolvedViewMode);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  const rows = useMemo(() => {
    const lastNameValue = nameFilter.trim().toLocaleLowerCase("de");
    const firstNameValue = firstNameFilter.trim().toLocaleLowerCase("de");

    const filtered = employees.filter((employee) => {
      if (lastNameValue && !(employee.lastName ?? "").toLocaleLowerCase("de").includes(lastNameValue)) {
        return false;
      }
      if (firstNameValue && !(employee.firstName ?? "").toLocaleLowerCase("de").includes(firstNameValue)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((left, right) => {
      const lastNameResult = left.lastName.localeCompare(right.lastName, "de");
      if (lastNameResult !== 0) return lastNameResult;
      return left.firstName.localeCompare(right.firstName, "de");
    });
  }, [employees, nameFilter, firstNameFilter]);

  useEffect(() => {
    const availableIds = new Set(employees.map((employee) => employee.id));
    setSelectedEmployeeIds((current) => current.filter((employeeId) => availableIds.has(employeeId)));
  }, [employees]);

  const handleViewModeChange = (next: string) => {
    if (!allowBulkSelection) return;
    if (next !== "board" && next !== "list") return;
    if (next === viewMode) return;

    const nextMode = next as EmployeePickerViewMode;
    setViewMode(nextMode);

    if (!viewModeSettingKey) return;

    void setSetting({
      key: viewModeSettingKey,
      scopeType: "USER",
      value: nextMode,
    }).catch(() => {
      setViewMode(resolvedViewMode);
    });
  };

  const toggleEmployeeSelection = (employeeId: number, checked: boolean) => {
    setSelectedEmployeeIds((current) => {
      if (checked) {
        if (current.includes(employeeId)) return current;
        return [...current, employeeId];
      }
      return current.filter((id) => id !== employeeId);
    });
  };

  const emptyState = (
    <p className="py-8 text-center text-sm text-slate-400">
      Keine Mitarbeiter gefunden.
    </p>
  );
  const filterPanel = (
    <EmployeePickerFilterPanel
      nameFilter={nameFilter}
      onNameFilterChange={setNameFilter}
      firstNameFilter={firstNameFilter}
      onFirstNameFilterChange={setFirstNameFilter}
    />
  );
  const confirmAction = allowBulkSelection && viewMode === "list" ? (
    <Button
      type="button"
      onClick={() => onConfirmSelection?.(selectedEmployeeIds)}
      disabled={selectedEmployeeIds.length === 0}
      data-testid="button-confirm-employee-picker-selection"
    >
      Mitarbeiter übernehmen{selectedEmployeeIds.length > 0 ? ` (${selectedEmployeeIds.length})` : ""}
    </Button>
  ) : null;

  return (
    <ListLayout
      title={title}
      icon={<Users className="w-5 h-5" />}
      viewModeKey="employeePickerDialog"
      isLoading={isLoading}
      onClose={onClose}
      showCloseButton={false}
      contentClassName="min-h-0 overflow-hidden"
      viewModeToggle={allowBulkSelection ? (
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          variant="outline"
          size="sm"
          data-testid="toggle-employee-picker-view-mode"
        >
          <ToggleGroupItem value="board" aria-label="Board-Ansicht" data-testid="toggle-employee-picker-board">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Listen-Ansicht" data-testid="toggle-employee-picker-list">
            <CheckSquare className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      ) : undefined}
      footerSlot={(
        <div
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
          data-testid="employee-picker-footer"
        >
          {filterPanel}
          {confirmAction ? (
            <div className="flex justify-end">
              {confirmAction}
            </div>
          ) : null}
        </div>
      )}
      contentSlot={(
        viewMode === "list" ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden" data-testid="employee-picker-list-view">
            <div className="visible-vertical-scrollbar min-h-0 flex-1 overflow-y-scroll px-6 py-4">
            {rows.length === 0 ? emptyState : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {rows.map((employee, index) => {
                  const isChecked = selectedEmployeeIds.includes(employee.id);
                  return (
                    <label
                      key={employee.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
                      data-testid={`employee-picker-list-row-${employee.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => toggleEmployeeSelection(employee.id, checked === true)}
                          data-testid={`employee-picker-checkbox-${employee.id}`}
                        />
                        <span className="truncate text-sm font-medium text-foreground">{employee.fullName}</span>
                      </div>
                      {teams.find((team) => team.id === employee.teamId)?.name ? (
                        <Badge variant="secondary" className="text-xs">
                          {teams.find((team) => team.id === employee.teamId)?.name}
                        </Badge>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        ) : (
          <BoardView
            gridTestId="list-employee-picker"
            gridCols="3"
            isEmpty={rows.length === 0}
            emptyState={(
              <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                Keine Mitarbeiter gefunden.
              </p>
            )}
          >
            {rows.map((employee) => {
              const teamName = teams.find((team) => team.id === employee.teamId)?.name ?? null;

              return (
                <EntityCard
                  key={employee.id}
                  testId={`employee-picker-card-${employee.id}`}
                  title={employee.fullName}
                  icon={<Users className="w-4 h-4" />}
                  className={selectedEmployeeId === employee.id ? "ring-1 ring-primary/30 border-primary/40" : ""}
                  onClick={() => onSelectEmployee?.(employee.id)}
                  onDoubleClick={() => onSelectEmployee?.(employee.id)}
                >
                  <div className="space-y-2 text-sm">
                    {employee.phone && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                    )}

                    {teamName && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {teamName && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {teamName}
                          </Badge>
                        )}
                      </div>
                    )}

                    {employee.email && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    )}
                  </div>
                </EntityCard>
              );
            })}
          </BoardView>
        )
      )}
    />
  );
}
