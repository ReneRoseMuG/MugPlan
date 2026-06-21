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
export type EmployeePickerSelectionMode = "single" | "multiple";

/**
 * Mitarbeiter inkl. optionaler Sperrbegründung, wie ihn der Wochen-Verfügbarkeits-Endpunkt
 * liefert. `ineligibleReason` ist null für auswählbare Mitarbeiter.
 */
export type EmployeeWithEligibility = Employee & { ineligibleReason: string | null };

/**
 * Baut aus einer Mitarbeiterliste mit optionaler Sperrbegründung die `ineligibleReasonById`-Map
 * für den Picker. Nur Einträge mit nicht-leerem Grund werden übernommen.
 */
export function buildIneligibleReasonById(
  employeesWithEligibility: ReadonlyArray<{ id: number; ineligibleReason?: string | null }>,
): Record<number, string> {
  const reasonById: Record<number, string> = {};
  for (const employee of employeesWithEligibility) {
    const reason = employee.ineligibleReason;
    if (typeof reason === "string" && reason.trim().length > 0) {
      reasonById[employee.id] = reason.trim();
    }
  }
  return reasonById;
}

function parseEmployeePickerViewMode(value: unknown): EmployeePickerViewMode {
  return value === "list" ? "list" : "board";
}

function normalizeEmployeePickerSelection(
  employeeIds: readonly number[] | undefined,
  availableEmployeeIds: ReadonlySet<number>,
): number[] {
  const result: number[] = [];
  const emittedIds = new Set<number>();

  for (const employeeId of employeeIds ?? []) {
    if (!Number.isInteger(employeeId) || employeeId <= 0) continue;
    if (!availableEmployeeIds.has(employeeId)) continue;
    if (emittedIds.has(employeeId)) continue;

    emittedIds.add(employeeId);
    result.push(employeeId);
  }

  return result;
}

function areEmployeeIdListsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((employeeId, index) => employeeId === right[index]);
}

export interface EmployeePickerDialogListProps {
  employees: Employee[];
  teams?: Team[];
  tours?: Tour[];
  /**
   * Optionale Eignungsannotation: bildet Mitarbeiter-IDs auf einen Grund ab, warum
   * sie nicht auswählbar sind (z. B. Terminüberschneidung). Annotierte Mitarbeiter
   * bleiben sichtbar, werden aber gesperrt dargestellt und können nicht ausgewählt
   * werden. Fehlt die Annotation, verhält sich der Picker unverändert.
   */
  ineligibleReasonById?: Readonly<Record<number, string>>;
  selectedEmployeeId?: number | null;
  selectedEmployeeIds?: number[];
  defaultSelectedEmployeeIds?: number[];
  isLoading?: boolean;
  title?: string;
  selectionMode?: EmployeePickerSelectionMode;
  allowBulkSelection?: boolean;
  viewModeSettingKey?: string;
  onSelectEmployee?: (employeeId: number) => void;
  onSelectionChange?: (employeeIds: number[]) => void;
  onConfirmSelection?: (employeeIds: number[]) => void;
  onClose?: () => void;
}

export function EmployeePickerDialogList({
  employees,
  teams = [],
  tours: _tours = [],
  ineligibleReasonById = {},
  selectedEmployeeId = null,
  selectedEmployeeIds,
  defaultSelectedEmployeeIds,
  isLoading = false,
  title = "Mitarbeiter auswählen",
  selectionMode,
  allowBulkSelection = false,
  viewModeSettingKey,
  onSelectEmployee,
  onSelectionChange,
  onConfirmSelection,
  onClose,
}: EmployeePickerDialogListProps) {
  const { settingsByKey, setSetting } = useSettings();
  const resolvedSelectionMode: EmployeePickerSelectionMode = selectionMode ?? (allowBulkSelection ? "multiple" : "single");
  const isMultipleSelection = resolvedSelectionMode === "multiple";
  const availableEmployeeIds = useMemo(
    () => new Set(employees.map((employee) => employee.id)),
    [employees],
  );
  const ineligibleReasonByIdMap = useMemo(() => {
    const result = new Map<number, string>();
    for (const [key, reason] of Object.entries(ineligibleReasonById)) {
      const employeeId = Number(key);
      if (!Number.isInteger(employeeId)) continue;
      if (typeof reason !== "string" || reason.trim().length === 0) continue;
      result.set(employeeId, reason.trim());
    }
    return result;
  }, [ineligibleReasonById]);
  const isSelectionControlled = selectedEmployeeIds !== undefined;
  const resolvedViewMode = parseEmployeePickerViewMode(
    isMultipleSelection && viewModeSettingKey
      ? settingsByKey.get(viewModeSettingKey)?.resolvedValue
      : "board",
  );
  const [nameFilter, setNameFilter] = useState("");
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [viewMode, setViewMode] = useState<EmployeePickerViewMode>(resolvedViewMode);
  const [uncontrolledSelectedEmployeeIds, setUncontrolledSelectedEmployeeIds] = useState<number[]>(() => (
    normalizeEmployeePickerSelection(defaultSelectedEmployeeIds, availableEmployeeIds)
  ));
  const activeSelectedEmployeeIds = isSelectionControlled
    ? normalizeEmployeePickerSelection(selectedEmployeeIds, availableEmployeeIds)
    : uncontrolledSelectedEmployeeIds;
  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

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
    if (isSelectionControlled) return;

    setUncontrolledSelectedEmployeeIds((current) => {
      const normalized = normalizeEmployeePickerSelection(current, availableEmployeeIds);
      if (areEmployeeIdListsEqual(current, normalized)) return current;

      onSelectionChange?.(normalized);
      return normalized;
    });
  }, [availableEmployeeIds, isSelectionControlled, onSelectionChange]);

  const setNextSelectedEmployeeIds = (employeeIds: number[]) => {
    const normalizedEmployeeIds = normalizeEmployeePickerSelection(employeeIds, availableEmployeeIds);

    if (!isSelectionControlled) {
      setUncontrolledSelectedEmployeeIds(normalizedEmployeeIds);
    }

    onSelectionChange?.(normalizedEmployeeIds);
  };

  const handleViewModeChange = (next: string) => {
    if (!isMultipleSelection) return;
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
    if (ineligibleReasonByIdMap.has(employeeId)) return;
    if (checked) {
      if (activeSelectedEmployeeIds.includes(employeeId)) return;
      setNextSelectedEmployeeIds([...activeSelectedEmployeeIds, employeeId]);
      return;
    }

    setNextSelectedEmployeeIds(activeSelectedEmployeeIds.filter((id) => id !== employeeId));
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
  const confirmAction = isMultipleSelection && viewMode === "list" ? (
    <Button
      type="button"
      onClick={() => onConfirmSelection?.(activeSelectedEmployeeIds)}
      disabled={activeSelectedEmployeeIds.length === 0}
      data-testid="button-confirm-employee-picker-selection"
    >
      Mitarbeiter übernehmen{activeSelectedEmployeeIds.length > 0 ? ` (${activeSelectedEmployeeIds.length})` : ""}
    </Button>
  ) : null;

  return (
    <ListLayout
      title={title}
      icon={<Users className="w-5 h-5" />}
      viewModeKey="employeePickerDialog"
      isLoading={isLoading}
      onClose={onClose}
      showCloseButton
      contentClassName="min-h-0 overflow-hidden"
      viewModeToggle={isMultipleSelection ? (
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
                  const isChecked = activeSelectedEmployeeIds.includes(employee.id);
                  const ineligibleReason = ineligibleReasonByIdMap.get(employee.id);
                  const ineligible = ineligibleReason !== undefined;
                  return (
                    <label
                      key={employee.id}
                      aria-disabled={ineligible || undefined}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-border" : ""} ${ineligible ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      data-testid={`employee-picker-list-row-${employee.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          disabled={ineligible}
                          onCheckedChange={(checked) => toggleEmployeeSelection(employee.id, checked === true)}
                          data-testid={`employee-picker-checkbox-${employee.id}`}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{employee.fullName}</span>
                          {ineligible ? (
                            <span
                              className="truncate text-xs text-amber-600"
                              data-testid={`employee-picker-ineligible-reason-${employee.id}`}
                            >
                              {ineligibleReason}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {employee.teamId && teamNameById.get(employee.teamId) ? (
                        <Badge variant="secondary" className="text-xs">
                          {teamNameById.get(employee.teamId)}
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
              const teamName = employee.teamId ? teamNameById.get(employee.teamId) ?? null : null;
              const isSelected = selectedEmployeeId === employee.id || activeSelectedEmployeeIds.includes(employee.id);
              const ineligibleReason = ineligibleReasonByIdMap.get(employee.id);
              const ineligible = ineligibleReason !== undefined;

              return (
                <EntityCard
                  key={employee.id}
                  testId={`employee-picker-card-${employee.id}`}
                  title={employee.fullName}
                  icon={<Users className="w-4 h-4" />}
                  className={`${ineligible ? "employee-picker-card-ineligible cursor-not-allowed opacity-60" : ""} ${isSelected ? "ring-1 ring-primary/30 border-primary/40" : ""}`.trim()}
                  onClick={ineligible ? undefined : () => onSelectEmployee?.(employee.id)}
                  onDoubleClick={ineligible ? undefined : () => onSelectEmployee?.(employee.id)}
                >
                  <div className="space-y-2 text-sm">
                    {ineligible ? (
                      <div
                        className="text-xs font-medium text-amber-600"
                        data-testid={`employee-picker-ineligible-reason-${employee.id}`}
                      >
                        {ineligibleReason}
                      </div>
                    ) : null}
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
