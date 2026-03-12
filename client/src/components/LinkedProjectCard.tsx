import { FolderKanban } from "lucide-react";
import type { Project } from "@shared/schema";

interface LinkedProjectCardProps {
  project: Project;
  customerNumber: string | null;
  onOpenProject?: (id: number) => void;
}

export function LinkedProjectCard({ project, customerNumber, onOpenProject }: LinkedProjectCardProps) {
  const customerNumberLabel = customerNumber?.trim() || "-";
  const orderNumberLabel = project.orderNumber?.trim() || "-";

  return (
    <div
      className="rounded-lg border border-border bg-slate-50 p-3 dark:bg-slate-800"
      onDoubleClick={() => onOpenProject?.(project.id)}
      data-testid={`linked-project-card-${project.id}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid={`text-linked-project-name-${project.id}`}>
          {project.name}
        </p>
      </div>

      <div className="space-y-0.5 text-xs text-slate-500">
        <p data-testid={`text-linked-project-customer-number-${project.id}`}>K: {customerNumberLabel}</p>
        <p data-testid={`text-linked-project-order-number-${project.id}`}>Auftragsnr.: {orderNumberLabel}</p>
      </div>
    </div>
  );
}
