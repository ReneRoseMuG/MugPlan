import { FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Project } from "@shared/schema";
import { LinkedProjectCard } from "@/components/LinkedProjectCard";
import { buildLatestAppointmentByProjectId, sortAppointmentsByDateDesc } from "@/lib/entity-appointments";

interface LinkedProjectsPanelProps {
  customerId?: number | null;
  onOpenProject?: (id: number) => void;
}

type CustomerAppointmentProjectSummary = {
  id: number;
  projectId: number;
  startDate: string;
  startTimeHour: number | null;
};

export function LinkedProjectsPanel({ customerId, onOpenProject }: LinkedProjectsPanelProps) {
  const projectsQueryUrl = customerId
    ? `/api/projects?customerId=${customerId}&filter=active&scope=all`
    : null;
  const customerAppointmentsQueryUrl = customerId
    ? `/api/customers/${customerId}/appointments?scope=all`
    : null;

  const { data: projects = [], isLoading: isLoadingProjects, isError: isProjectsError } = useQuery<Project[]>({
    queryKey: [projectsQueryUrl ?? ""],
    enabled: !!projectsQueryUrl,
  });

  const {
    data: customerAppointments = [],
    isLoading: isLoadingAppointments,
    isError: isAppointmentsError,
  } = useQuery<CustomerAppointmentProjectSummary[]>({
    queryKey: [customerAppointmentsQueryUrl ?? ""],
    enabled: !!customerAppointmentsQueryUrl,
  });

  const sortedProjects = useMemo(() => {
    const latestAppointmentByProjectId = buildLatestAppointmentByProjectId(customerAppointments);
    return [...projects].sort((a, b) => {
      const latestA = latestAppointmentByProjectId.get(a.id);
      const latestB = latestAppointmentByProjectId.get(b.id);

      if (latestA && latestB) {
        return sortAppointmentsByDateDesc(latestA, latestB);
      }
      if (latestA && !latestB) return -1;
      if (!latestA && latestB) return 1;
      return b.id - a.id;
    });
  }, [projects, customerAppointments]);

  const isLoading = isLoadingProjects || isLoadingAppointments;
  const isError = isProjectsError || isAppointmentsError;

  return (
    <div className="sub-panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <FolderKanban className="w-4 h-4" />
          Projekte ({sortedProjects.length})
        </h3>
      </div>

      <div className="space-y-2" data-testid="list-linked-projects">
        {!customerId ? (
          <p className="text-sm text-slate-400 text-center py-2">
            Projekte werden nach dem Speichern angezeigt
          </p>
        ) : isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ) : isError ? (
          <p className="text-sm text-slate-400 text-center py-2">
            Projekte konnten nicht geladen werden
          </p>
        ) : sortedProjects.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">
            Keine Projekte verknüpft
          </p>
        ) : (
          sortedProjects.map((project) => (
            <LinkedProjectCard
              key={project.id}
              project={project}
              onOpenProject={onOpenProject}
            />
          ))
        )}
      </div>
    </div>
  );
}
