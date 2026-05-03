import { useEffect, useState } from "react";
import {
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from "date-fns";

import { AppointmentForm } from "@/components/AppointmentForm";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
import StandaloneLayout from "@/components/StandaloneLayout";

type AppointmentOverlayState = {
  appointmentId?: number;
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
};

function resolveInitialWeekDate(search: string): Date {
  const params = new URLSearchParams(search);
  const kw = Number(params.get("kw"));
  const year = Number(params.get("year"));

  if (!Number.isInteger(kw) || !Number.isInteger(year) || kw < 1 || kw > 53) {
    return new Date();
  }

  const candidate = startOfISOWeek(
    setISOWeek(
      setISOWeekYear(startOfISOWeek(new Date()), year),
      kw,
    ),
  );

  if (getISOWeek(candidate) !== kw || getISOWeekYear(candidate) !== year) {
    return new Date();
  }

  return candidate;
}

export default function StandaloneCalendarWeek() {
  const [currentDate, setCurrentDate] = useState(() => resolveInitialWeekDate(window.location.search));
  const [appointmentOverlay, setAppointmentOverlay] = useState<AppointmentOverlayState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("kw", String(getISOWeek(currentDate)));
    params.set("year", String(getISOWeekYear(currentDate)));
    const queryString = params.toString();
    const nextUrl = queryString.length > 0
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [currentDate]);

  return (
    <>
      <StandaloneLayout title="Wochenübersicht" headerTone="default">
        <CalendarWorkspace
          mode="global"
          activeView="week"
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
