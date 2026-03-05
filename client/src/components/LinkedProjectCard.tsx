import { Flag, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { getProjectStatusColor } from "@/lib/project-status";
import type { Project } from "@shared/schema";
import type { ProjectStatusRelationItem } from "@shared/routes";

interface LinkedProjectCardProps {
  project: Project;
  customerNumber: string | null;
  onOpenProject?: (id: number) => void;
}

export function LinkedProjectCard({ project, customerNumber, onOpenProject }: LinkedProjectCardProps) {
  const { data: statuses = [], isLoading, isError } = useQuery<ProjectStatusRelationItem[]>({
    queryKey: ["/api/projects", project.id, "statuses"],
  });
  const customerNumberLabel = customerNumber?.trim() || "-";
  const orderNumberLabel = project.orderNumber?.trim() || "-";

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

      <div className="mb-2 space-y-0.5 text-xs text-slate-500">
        <p data-testid={`text-linked-project-customer-number-${project.id}`}>K: {customerNumberLabel}</p>
        <p data-testid={`text-linked-project-order-number-${project.id}`}>Auftragsnr.: {orderNumberLabel}</p>
      </div>

      <div className="space-y-1" data-testid={`list-linked-project-status-${project.id}`}>
        {isLoading ? (
          <p className="text-xs text-slate-400">Status wird geladen…</p>
        ) : isError ? (
          <p className="text-xs text-slate-400">Status nicht verfügbar</p>
        ) : statuses.length === 0 ? (
          <p className="text-xs text-slate-400">Kein Status gesetzt</p>
        ) : (
          statuses.map((entry) => (
            <ColoredInfoBadge
              key={entry.status.id}
              icon={<Flag className="w-3 h-3" />}
              label={entry.status.title}
              color={getProjectStatusColor(entry.status)}
              size="sm"
              fullWidth
              testId={`linked-project-status-${project.id}-${entry.status.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
