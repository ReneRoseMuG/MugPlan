type AppointmentSortInput = {
  id: number;
  startDate: string;
  startTimeHour?: number | null;
};

export function sortAppointmentsByDateDesc<T extends AppointmentSortInput>(a: T, b: T): number {
  if (a.startDate !== b.startDate) {
    return a.startDate > b.startDate ? -1 : 1;
  }

  const aHour = a.startTimeHour ?? null;
  const bHour = b.startTimeHour ?? null;
  if (aHour == null && bHour != null) return 1;
  if (aHour != null && bHour == null) return -1;
  if (aHour != null && bHour != null && aHour !== bHour) {
    return bHour - aHour;
  }

  return b.id - a.id;
}

export function buildLatestAppointmentByProjectId(
  appointments: ReadonlyArray<{
    projectId: number;
    startDate: string;
    startTimeHour?: number | null;
    id: number;
  }>,
): Map<number, { projectId: number; startDate: string; startTimeHour?: number | null; id: number }> {
  const latestByProjectId = new Map<
    number,
    { projectId: number; startDate: string; startTimeHour?: number | null; id: number }
  >();

  for (const appointment of appointments) {
    const current = latestByProjectId.get(appointment.projectId);
    if (!current || sortAppointmentsByDateDesc(appointment, current) < 0) {
      latestByProjectId.set(appointment.projectId, appointment);
    }
  }

  return latestByProjectId;
}
