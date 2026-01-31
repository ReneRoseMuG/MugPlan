import { FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { LinkedProjectCard } from "@/components/LinkedProjectCard";

interface LinkedProjectsPanelProps {
  customerId?: number | null;
  onOpenProject?: (id: number) => void;
}

export function LinkedProjectsPanel({ customerId, onOpenProject }: LinkedProjectsPanelProps) {
  const queryUrl = customerId ? `/api/projects?customerId=${customerId}&filter=active` : null;
  const { data: projects = [], isLoading, isError } = useQuery<Project[]>({
    queryKey: [queryUrl ?? ""],
    enabled: !!queryUrl,
  });

  return (
    <div className="sub-panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <FolderKanban className="w-4 h-4" />
          Verknüpfte Projekte ({projects.length})
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
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">
            Keine Projekte verknüpft
          </p>
        ) : (
          projects.map((project) => (
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
