import { type ReactNode, useState } from "react";

import { AppointmentForm } from "@/components/AppointmentForm";
import { AppointmentsListPage } from "@/components/AppointmentsListPage";
import { CustomerData } from "@/components/CustomerData";
import { CustomersPage } from "@/components/CustomersPage";
import { EmployeesPage } from "@/components/EmployeesPage";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage } from "@/components/ProjectsPage";
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
