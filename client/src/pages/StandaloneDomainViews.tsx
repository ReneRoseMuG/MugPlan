import { type ReactNode, useState } from "react";

import { AppointmentForm } from "@/components/AppointmentForm";
import { AppointmentsListPage } from "@/components/AppointmentsListPage";
import { CustomerData } from "@/components/CustomerData";
import { CustomersPage } from "@/components/CustomersPage";
import { EmployeesPage } from "@/components/EmployeesPage";
import { MonitoringPage } from "@/components/MonitoringPage";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage } from "@/components/ProjectsPage";
import { ReportsPage, type StandaloneReportLaunch } from "@/components/ReportsPage";
import { TeamManagement } from "@/components/TeamManagement";
import { TourManagement } from "@/components/TourManagement";
import StandaloneLayout from "@/components/StandaloneLayout";

type AppointmentOverlayState = {
  appointmentId?: number;
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
};

function StandaloneOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {children}
    </div>
  );
}

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseStandaloneReportLaunch(search: string): StandaloneReportLaunch | null {
  const params = new URLSearchParams(search);
  const reportType = params.get("reportType");
  const activeTab = params.get("activeTab");
  const fromDate = params.get("fromDate");
  const toDate = params.get("toDate") ?? undefined;
  const kwStart = parsePositiveInteger(params.get("kwStart"));
  const weekCount = parsePositiveInteger(params.get("weekCount"));
  const productCategoryIds = params.getAll("productCategoryIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const componentCategoryIds = params.getAll("componentCategoryIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (
    (reportType !== "vorlaufliste" && reportType !== "produktionsplanung" && reportType !== "auftragsliste")
    || (activeTab !== "date" && activeTab !== "calendarWeek")
    || !fromDate
  ) {
    return null;
  }

  return {
    reportType,
    activeTab,
    fromDate,
    toDate,
    kwStart,
    weekCount,
    productCategoryIds,
    componentCategoryIds,
    useShortCodes: params.get("useShortCodes") === "true",
  };
}

function resolveStandaloneReportTitle(launch: StandaloneReportLaunch | null): string {
  if (!launch) return "Reports";

  switch (launch.reportType) {
    case "vorlaufliste":
      return "Vorlaufliste";
    case "produktionsplanung":
      return "Produktionsplanung";
    case "auftragsliste":
      return "Auftragsliste";
    default:
      return "Reports";
  }
}

export function StandaloneAppointments() {
  const [appointmentOverlay, setAppointmentOverlay] = useState<AppointmentOverlayState | null>(null);

  return (
    <>
      <StandaloneLayout title="Termine">
        <AppointmentsListPage
          helpKey="appointments.list.mainNavigation"
          context={{ type: "standalone" }}
          onOpenAppointment={(appointmentId) => {
            setAppointmentOverlay({ appointmentId });
          }}
        />
      </StandaloneLayout>

      {appointmentOverlay ? (
        <StandaloneOverlay>
          <AppointmentForm
            appointmentId={appointmentOverlay.appointmentId}
            initialDate={appointmentOverlay.initialDate}
            initialTourId={appointmentOverlay.initialTourId}
            projectId={appointmentOverlay.projectId}
            onCancel={() => setAppointmentOverlay(null)}
            onSaved={() => setAppointmentOverlay(null)}
          />
        </StandaloneOverlay>
      ) : null}
    </>
  );
}

export function StandaloneMonitoring() {
  const [appointmentOverlay, setAppointmentOverlay] = useState<{ appointmentId: number } | null>(null);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";

  return (
    <>
      <StandaloneLayout title="Monitoring">
        <MonitoringPage
          isAdmin={isAdmin}
          onOpenAppointment={(appointmentId) => setAppointmentOverlay({ appointmentId })}
        />
      </StandaloneLayout>

      {appointmentOverlay ? (
        <StandaloneOverlay>
          <AppointmentForm
            appointmentId={appointmentOverlay.appointmentId}
            onCancel={() => setAppointmentOverlay(null)}
            onSaved={() => setAppointmentOverlay(null)}
          />
        </StandaloneOverlay>
      ) : null}
    </>
  );
}

export function StandaloneProjects() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [appointmentOverlay, setAppointmentOverlay] = useState<AppointmentOverlayState | null>(null);

  return (
    <>
      <StandaloneLayout title="Projekte">
        <ProjectsPage
          onNewProject={() => {
            setSelectedProjectId(null);
            setIsProjectFormOpen(true);
          }}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setIsProjectFormOpen(true);
          }}
        />
      </StandaloneLayout>

      {isProjectFormOpen ? (
        <StandaloneOverlay>
          <ProjectForm
            projectId={selectedProjectId ?? undefined}
            onCancel={() => {
              setIsProjectFormOpen(false);
              setSelectedProjectId(null);
            }}
            onSaved={() => {
              setIsProjectFormOpen(false);
              setSelectedProjectId(null);
            }}
            onOpenAppointment={(context) => {
              setAppointmentOverlay({
                appointmentId: context.appointmentId,
                projectId: context.projectId,
              });
            }}
          />
        </StandaloneOverlay>
      ) : null}

      {appointmentOverlay ? (
        <StandaloneOverlay>
          <AppointmentForm
            appointmentId={appointmentOverlay.appointmentId}
            initialDate={appointmentOverlay.initialDate}
            initialTourId={appointmentOverlay.initialTourId}
            projectId={appointmentOverlay.projectId}
            onCancel={() => setAppointmentOverlay(null)}
            onSaved={() => setAppointmentOverlay(null)}
          />
        </StandaloneOverlay>
      ) : null}
    </>
  );
}

export function StandaloneCustomers() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);

  return (
    <>
      <StandaloneLayout title="Kunden">
        <CustomersPage
          onNewCustomer={() => {
            setSelectedCustomerId(null);
            setIsCustomerFormOpen(true);
          }}
          onSelectCustomer={(id) => {
            setSelectedCustomerId(id);
            setIsCustomerFormOpen(true);
          }}
        />
      </StandaloneLayout>

      {isCustomerFormOpen ? (
        <StandaloneOverlay>
          <CustomerData
            customerId={selectedCustomerId}
            onCancel={() => {
              setIsCustomerFormOpen(false);
              setSelectedCustomerId(null);
            }}
            onSave={() => {
              setIsCustomerFormOpen(false);
              setSelectedCustomerId(null);
            }}
            onOpenProject={(id) => {
              setSelectedProjectId(id);
              setIsProjectFormOpen(true);
            }}
          />
        </StandaloneOverlay>
      ) : null}

      {isProjectFormOpen ? (
        <StandaloneOverlay>
          <ProjectForm
            projectId={selectedProjectId ?? undefined}
            onCancel={() => {
              setIsProjectFormOpen(false);
              setSelectedProjectId(null);
            }}
            onSaved={() => {
              setIsProjectFormOpen(false);
              setSelectedProjectId(null);
            }}
          />
        </StandaloneOverlay>
      ) : null}
    </>
  );
}

export function StandaloneEmployees() {
  return (
    <StandaloneLayout title="Mitarbeiter">
      <EmployeesPage />
    </StandaloneLayout>
  );
}

export function StandaloneTours() {
  return (
    <StandaloneLayout title="Touren">
      <TourManagement />
    </StandaloneLayout>
  );
}

export function StandaloneTeams() {
  return (
    <StandaloneLayout title="Teams">
      <TeamManagement />
    </StandaloneLayout>
  );
}

export function StandaloneReports() {
  const [launch] = useState<StandaloneReportLaunch | null>(() => parseStandaloneReportLaunch(window.location.search));

  return (
    <StandaloneLayout title={resolveStandaloneReportTitle(launch)}>
      <ReportsPage standaloneLaunch={launch} />
    </StandaloneLayout>
  );
}
