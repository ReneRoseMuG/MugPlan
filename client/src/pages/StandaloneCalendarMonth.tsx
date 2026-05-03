import { useState } from "react";

import { AppointmentForm } from "@/components/AppointmentForm";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
import StandaloneLayout from "@/components/StandaloneLayout";

type AppointmentOverlayState = {
  appointmentId?: number;
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
};

export default function StandaloneCalendarMonth() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [appointmentOverlay, setAppointmentOverlay] = useState<AppointmentOverlayState | null>(null);

  return (
    <>
      <StandaloneLayout title="Monatsübersicht" headerTone="default">
        <CalendarWorkspace
          mode="global"
          activeView="monthSheet"
          currentDate={currentDate}
          employeeFilterId={null}
          onEmployeeFilterChange={() => undefined}
          onViewChange={() => undefined}
          onDateChange={setCurrentDate}
          onOpenAppointmentForm={(context) => {
            setAppointmentOverlay({
              appointmentId: context.appointmentId,
              initialDate: context.initialDate,
              initialTourId: context.initialTourId,
              projectId: context.projectId,
            });
          }}
        />
      </StandaloneLayout>
      {appointmentOverlay ? (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <AppointmentForm
            appointmentId={appointmentOverlay.appointmentId}
            initialDate={appointmentOverlay.initialDate}
            initialTourId={appointmentOverlay.initialTourId}
            projectId={appointmentOverlay.projectId}
            onCancel={() => setAppointmentOverlay(null)}
            onSaved={() => setAppointmentOverlay(null)}
          />
        </div>
      ) : null}
    </>
  );
}
