import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import type { Employee, Team, Tour } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeInfoBadgePreview } from "@/components/ui/badge-previews/employee-info-badge-preview";

type SortDirection = "asc" | "desc";
type EmployeeSortKey = "lastName" | "firstName" | "tour" | "team";

interface EmployeePickerDialogListProps {
  employees: Employee[];
  teams: Team[];
  tours: Tour[];
  selectedEmployeeId?: number | null;
  isLoading?: boolean;
  title?: string;
  onSelectEmployee?: (employeeId: number) => void;
  onClose?: () => void;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

export function EmployeePickerDialogList({
  employees,
  teams,
  tours,
  selectedEmployeeId = null,
  isLoading = false,
  title = "Mitarbeiter auswählen",
  onSelectEmployee,
  onClose,
}: EmployeePickerDialogListProps) {
  const [nameFilter, setNameFilter] = useState("");
  const [sortKey, setSortKey] = useState<EmployeeSortKey>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredEmployees = useMemo(() => {
    const value = nameFilter.trim().toLocaleLowerCase("de");
    if (!value) return employees;
    return employees.filter((employee) =>
      employee.fullName.toLocaleLowerCase("de").includes(value),
    );
  }, [employees, nameFilter]);

  const rows = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredEmployees].sort((left, right) => {
      if (sortKey === "firstName") {
        return left.firstName.localeCompare(right.firstName, "de") * multiplier;
      }
      if (sortKey === "tour") {
        const leftTour = tours.find((tour) => tour.id === left.tourId)?.name ?? "";
        const rightTour = tours.find((tour) => tour.id === right.tourId)?.name ?? "";
        return leftTour.localeCompare(rightTour, "de") * multiplier;
      }
      if (sortKey === "team") {
        const leftTeam = teams.find((team) => team.id === left.teamId)?.name ?? "";
        const rightTeam = teams.find((team) => team.id === right.teamId)?.name ?? "";
        return leftTeam.localeCompare(rightTeam, "de") * multiplier;
      }
      return left.lastName.localeCompare(right.lastName, "de") * multiplier;
    });
  }, [filteredEmployees, sortDirection, sortKey, tours, teams]);

  const handleSortToggle = (nextSortKey: EmployeeSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: EmployeeSortKey) => {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide"
        onClick={() => handleSortToggle(key)}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sortDirection : null} />
      </button>
    );
  };

  const tableColumns = useMemo<TableViewColumnDef<Employee>[]>(
    () => [
      {
        id: "lastName",
        header: renderSortHeader("Name", "lastName"),
        accessor: (row) => row.lastName,
        minWidth: 170,
      },
      {
        id: "firstName",
        header: renderSortHeader("Vorname", "firstName"),
        accessor: (row) => row.firstName,
        minWidth: 170,
      },
      {
        id: "phone",
        header: "Telefon",
        accessor: (row) => row.phone ?? "",
        minWidth: 170,
      },
      {
        id: "tour",
        header: renderSortHeader("Tour", "tour"),
        accessor: (row) => tours.find((tour) => tour.id === row.tourId)?.name ?? "",
        minWidth: 170,
        cell: ({ row }) => <span>{tours.find((tour) => tour.id === row.tourId)?.name ?? "—"}</span>,
      },
      {
        id: "team",
        header: renderSortHeader("Team", "team"),
        accessor: (row) => teams.find((team) => team.id === row.teamId)?.name ?? "",
        minWidth: 170,
        cell: ({ row }) => <span>{teams.find((team) => team.id === row.teamId)?.name ?? "—"}</span>,
      },
    ],
    [sortDirection, sortKey, teams, tours],
  );

  return (
    <ListLayout
      title={title}
      icon={<Users className="w-5 h-5" />}
      viewModeKey="employeePickerDialog"
      isLoading={isLoading}
      onClose={onClose}
      showCloseButton={false}
      filterSlot={(
        <FilterPanel title="Mitarbeiterfilter" layout="row">
          <div className="flex min-w-[260px] flex-col gap-1">
            <Label htmlFor="employee-picker-name-filter" className="text-xs">Name</Label>
            <Input
              id="employee-picker-name-filter"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Nach Name filtern..."
            />
          </div>
        </FilterPanel>
      )}
      contentSlot={(
        <TableView
          testId="table-employee-picker"
          columns={tableColumns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowDoubleClick={(row) => onSelectEmployee?.(row.id)}
          rowPreviewRenderer={(row) => {
            const teamName = teams.find((team) => team.id === row.teamId)?.name ?? null;
            const tourName = tours.find((tour) => tour.id === row.tourId)?.name ?? null;
            return createEmployeeInfoBadgePreview({
              fullName: row.fullName,
              teamName,
              tourName,
            }).content;
          }}
          rowClassName={(row) => (selectedEmployeeId === row.id ? "bg-primary/5 ring-1 ring-primary/30" : undefined)}
          emptyState={<p className="py-4 text-sm text-slate-400">Keine Mitarbeiter gefunden.</p>}
          stickyHeader
        />
      )}
    />
  );
}
