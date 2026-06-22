import React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { z } from "zod";
import { api, type EmployeeRevenueOverviewResponse } from "@shared/routes";

import { EmployeeRevenueOverviewTab } from "@/components/EmployeeRevenueOverviewTab";
import { ReportConfigPanel } from "@/components/reports/ReportConfigPanel";
import { ReportResultOverlayShell } from "@/components/reports/ReportResultOverlayShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";

type EmployeeListItem = z.infer<typeof api.employees.list.responses[200]>[number];

// USER-scoped Setting (Feature-Präfix, nicht "reports.*" wegen reportSettings.persistenceRemoval-Wächter).
const SELECTED_EMPLOYEE_IDS_KEY = "revenueOverviewReport.employeeIds";

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0,
  );
}

/**
 * Lädt und rendert die Umsatzübersicht genau eines Mitarbeiters. Nutzt denselben Endpoint und
 * denselben Query-Key wie der Mitarbeiter-Formular-Tab, daher identische Zahlen und Cache-Sharing.
 */
function RevenueOverviewEmployeeTabContent({ employeeId }: { employeeId: number }) {
  const { data, isLoading } = useQuery<EmployeeRevenueOverviewResponse>({
    queryKey: ["/api/employees", employeeId, "revenue-overview"],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}/revenue-overview`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Umsatzübersicht konnte nicht geladen werden");
      }
      return response.json();
    },
  });

  return <EmployeeRevenueOverviewTab overview={data} isLoading={isLoading} />;
}

type RevenueOverviewReportPanelProps = {
  overlayHost?: HTMLElement | null;
};

export function RevenueOverviewReportPanel({ overlayHost }: RevenueOverviewReportPanelProps) {
  const { settingsByKey, setSetting } = useSettings();

  const { data: employees = [] } = useQuery<EmployeeListItem[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/employees?scope=active", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Mitarbeiter konnten nicht geladen werden");
      }
      return response.json();
    },
  });

  const sortedEmployees = React.useMemo(
    () => [...employees].sort(
      (left, right) =>
        left.lastName.localeCompare(right.lastName, "de") || left.firstName.localeCompare(right.firstName, "de"),
    ),
    [employees],
  );

  const selectedEmployeeIds = React.useMemo(
    () => toNumberArray(settingsByKey.get(SELECTED_EMPLOYEE_IDS_KEY)?.resolvedValue),
    [settingsByKey],
  );
  const selectedEmployeeIdSet = React.useMemo(() => new Set(selectedEmployeeIds), [selectedEmployeeIds]);

  const employeeNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const employee of employees) {
      map.set(employee.id, employee.fullName);
    }
    return map;
  }, [employees]);

  const [submittedEmployeeIds, setSubmittedEmployeeIds] = React.useState<number[]>([]);
  const [activeEmployeeTab, setActiveEmployeeTab] = React.useState<string>("");
  const [isReportOpen, setIsReportOpen] = React.useState(false);

  const toggleEmployee = React.useCallback(
    (employeeId: number, checked: boolean) => {
      const nextSet = new Set(selectedEmployeeIds);
      if (checked) {
        nextSet.add(employeeId);
      } else {
        nextSet.delete(employeeId);
      }
      // Reihenfolge stabil entlang der sortierten Mitarbeiterliste halten.
      const nextIds = sortedEmployees.map((employee) => employee.id).filter((id) => nextSet.has(id));
      void setSetting({ key: SELECTED_EMPLOYEE_IDS_KEY, scopeType: "USER", value: nextIds });
    },
    [selectedEmployeeIds, setSetting, sortedEmployees],
  );

  const openReport = React.useCallback(() => {
    const snapshot = sortedEmployees.map((employee) => employee.id).filter((id) => selectedEmployeeIdSet.has(id));
    if (snapshot.length === 0) return;
    setSubmittedEmployeeIds(snapshot);
    setActiveEmployeeTab(String(snapshot[0]));
    setIsReportOpen(true);
  }, [selectedEmployeeIdSet, sortedEmployees]);

  const isGenerateDisabled = selectedEmployeeIds.length === 0;

  return (
    <>
      <ReportConfigPanel
        title="Umsatzübersicht"
        testId="reports-umsatzuebersicht-config-panel"
        footer={(
          <button
            type="button"
            onClick={openReport}
            disabled={isGenerateDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-reports-umsatzuebersicht-generate"
          >
            Öffnen
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      >
        <div
          className="h-full min-w-[260px] rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700"
          data-testid="reports-umsatzuebersicht-employee-list"
        >
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mitarbeiter</div>
          <div className="max-h-44 space-y-1 overflow-y-auto border-t border-slate-100 pt-1">
            {sortedEmployees.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">Keine Mitarbeiter verfügbar.</p>
            ) : (
              sortedEmployees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex cursor-pointer items-center gap-2 py-1 text-xs text-slate-600"
                >
                  <Checkbox
                    checked={selectedEmployeeIdSet.has(employee.id)}
                    onCheckedChange={(checked) => toggleEmployee(employee.id, Boolean(checked))}
                    data-testid={`checkbox-reports-umsatzuebersicht-employee-${employee.id}`}
                  />
                  <span className="min-w-0 truncate">{employee.fullName}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </ReportConfigPanel>

      {overlayHost ? createPortal(
        <ReportResultOverlayShell
          open={isReportOpen}
          title="Umsatzübersicht"
          metaLabel={`${submittedEmployeeIds.length} Mitarbeiter`}
          onBack={() => setIsReportOpen(false)}
          testId="reports-umsatzuebersicht-overlay"
          backTestId="button-reports-umsatzuebersicht-back"
          contentClassName="overflow-hidden bg-slate-100 p-6"
        >
          {submittedEmployeeIds.length > 0 ? (
            <Tabs
              value={activeEmployeeTab}
              onValueChange={setActiveEmployeeTab}
              className="flex h-full min-h-0 flex-col"
              data-testid="reports-umsatzuebersicht-tabs"
            >
              <TabsList className="flex h-auto w-fit max-w-full flex-wrap justify-start gap-1">
                {submittedEmployeeIds.map((employeeId) => (
                  <TabsTrigger
                    key={employeeId}
                    value={String(employeeId)}
                    data-testid={`tab-reports-umsatzuebersicht-employee-${employeeId}`}
                  >
                    {employeeNameById.get(employeeId) ?? `Mitarbeiter ${employeeId}`}
                  </TabsTrigger>
                ))}
              </TabsList>
              {submittedEmployeeIds.map((employeeId) => (
                <TabsContent
                  key={employeeId}
                  value={String(employeeId)}
                  className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white"
                  data-testid={`tab-content-reports-umsatzuebersicht-employee-${employeeId}`}
                >
                  <RevenueOverviewEmployeeTabContent employeeId={employeeId} />
                </TabsContent>
              ))}
            </Tabs>
          ) : null}
        </ReportResultOverlayShell>,
        overlayHost,
      ) : null}
    </>
  );
}
