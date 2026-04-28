import { useState } from "react";
import type { EmployeeRevenueOverviewResponse } from "@shared/routes";
import { EmployeeRevenueOverviewPreview } from "@/components/EmployeeRevenueOverviewPreview";
import { FilterPanel } from "@/components/ui/filter-panels/filter-panel";
import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type EmployeeRevenueOverviewWeek = EmployeeRevenueOverviewResponse["weeks"][number];

function formatRevenueAmount(value: string): string {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? euroFormatter.format(numericValue) : value;
}

function normalizeFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

export function matchesEmployeeRevenueOverviewWeekFilter(
  week: EmployeeRevenueOverviewWeek,
  filterValue: string,
): boolean {
  const normalizedFilter = normalizeFilterValue(filterValue);
  if (normalizedFilter.length === 0) {
    return true;
  }

  const paddedWeek = String(week.isoWeek).padStart(2, "0");
  const unpaddedWeek = String(week.isoWeek);
  const haystacks = [
    week.weekLabel,
    `KW ${paddedWeek}`,
    `KW ${unpaddedWeek}`,
    `${paddedWeek}/${week.isoYear}`,
    `${unpaddedWeek}/${week.isoYear}`,
    `${week.isoYear}`,
    `${paddedWeek}`,
    `${unpaddedWeek}`,
  ].map((value) => normalizeFilterValue(value));

  return haystacks.some((value) => value.includes(normalizedFilter));
}

interface EmployeeRevenueOverviewTabProps {
  overview?: EmployeeRevenueOverviewResponse;
  isLoading?: boolean;
}

export function EmployeeRevenueOverviewTab({
  overview,
  isLoading = false,
}: EmployeeRevenueOverviewTabProps) {
  const [weekFilter, setWeekFilter] = useState("");
  const allWeeks = overview?.weeks ?? [];
  const visibleWeeks = allWeeks.filter((week) => matchesEmployeeRevenueOverviewWeekFilter(week, weekFilter));

  const columns: TableViewColumnDef<EmployeeRevenueOverviewWeek>[] = [
    {
      id: "weekLabel",
      header: "KW/Jahr",
      accessor: (row) => row.weekLabel,
      minWidth: 180,
    },
    {
      id: "orderCount",
      header: "Anzahl Aufträge",
      accessor: (row) => row.orderCount,
      align: "right",
      minWidth: 150,
    },
    {
      id: "revenueAmount",
      header: "Umsatz",
      accessor: (row) => row.revenueAmount,
      align: "right",
      minWidth: 180,
      cell: ({ row }) => formatRevenueAmount(row.revenueAmount),
    },
  ];

  if (isLoading) {
    return <p className="py-4 text-sm text-slate-400">Umsatzübersicht wird geladen...</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="employee-revenue-overview-tab">
      <TableView<EmployeeRevenueOverviewWeek>
        columns={columns}
        rows={visibleWeeks}
        rowKey={(row) => `${row.isoYear}-${row.isoWeek}`}
        stickyHeader
        testId="employee-revenue-overview-table"
        className="min-h-[22rem]"
        emptyState={weekFilter.trim().length > 0
          ? <span data-testid="employee-revenue-overview-empty">Kein Umsatztreffer für den aktuellen Filter.</span>
          : <span data-testid="employee-revenue-overview-empty">Keine Umsatzwochen vorhanden.</span>}
        footerSlot={(
          <div data-testid="employee-revenue-overview-filter-panel">
            <FilterPanel title="Kalenderwochenfilter" layout="row">
              <SearchFilterInput
                id="employee-revenue-week-filter"
                label="Kalenderwoche"
                value={weekFilter}
                onChange={setWeekFilter}
                onClear={() => setWeekFilter("")}
              />
            </FilterPanel>
          </div>
        )}
        rowPreviewRenderer={(row) => ({
          content: (
            <EmployeeRevenueOverviewPreview
              employeeFullName={overview?.employeeFullName ?? ""}
              week={row}
            />
          ),
          options: {
            mode: "cursor",
            openDelayMs: 120,
            side: "right",
            align: "start",
            maxWidth: 440,
            maxHeight: 360,
            scrollY: "auto",
            cursorOffsetX: 18,
            cursorOffsetY: 18,
          },
        })}
      />
    </div>
  );
}
