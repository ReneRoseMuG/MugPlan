import { Flag, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { getProjectStatusColor } from "@/lib/project-status";
import type { Project, ProjectStatus } from "@shared/schema";

interface LinkedProjectCardProps {
  project: Project;
  onOpenProject?: (id: number) => void;
}

export function LinkedProjectCard({ project, onOpenProject }: LinkedProjectCardProps) {
  const { data: statuses = [], isLoading, isError } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/projects", project.id, "statuses"],
  });

  return (
    <div
      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border cursor-pointer"
      onDoubleClick={() => onOpenProject?.(project.id)}
      data-testid={`linked-project-card-${project.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FolderKanban className="w-4 h-4 text-slate-400" />
        <p className="font-medium text-sm text-slate-700 dark:text-slate-300" data-testid={`text-linked-project-name-${project.id}`}>
          {project.name}
        </p>
      </div>

      <div className="space-y-1" data-testid={`list-linked-project-status-${project.id}`}>
        {isLoading ? (
          <p className="text-xs text-slate-400">Status wird geladen…</p>
        ) : isError ? (
          <p className="text-xs text-slate-400">Status nicht verfügbar</p>
        ) : statuses.length === 0 ? (
          <p className="text-xs text-slate-400">Kein Status gesetzt</p>
        ) : (
          statuses.map((status) => (
            <ColoredInfoBadge
              key={status.id}
              icon={<Flag className="w-3 h-3" />}
              label={status.title}
              color={getProjectStatusColor(status)}
              size="sm"
              fullWidth
              testId={`linked-project-status-${project.id}-${status.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
