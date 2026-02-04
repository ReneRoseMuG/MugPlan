export const getBerlinTodayDateString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const getProjectAppointmentsQueryKey = ({
  projectId,
  fromDate,
  userRole,
}: {
  projectId: number | null | undefined;
  fromDate: string;
  userRole: string;
}) => ["projectAppointments", projectId, fromDate, userRole];
