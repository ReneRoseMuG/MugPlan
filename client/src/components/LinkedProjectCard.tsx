import React from "react";
import { FolderKanban } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

type LinkedProjectCardProject = {
  id: number;
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
  name: string;
  orderNumber: string | null;
  descriptionMd: string | null;
  isActive: boolean;
  tags: Tag[];
  projectArticleItems: ProjectArticleItem[];
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
  };
};

interface LinkedProjectCardProps {
  project: LinkedProjectCardProject;
  customerNumber: string | null;
  onOpenProject?: (id: number) => void;
}

export function LinkedProjectCard({ project, customerNumber, onOpenProject }: LinkedProjectCardProps) {
  const customerNumberLabel = customerNumber?.trim() || "-";
  const orderNumberLabel = project.orderNumber?.trim() || "-";

  return (
    <HoverPreview
      preview={(
        <ProjectTableHoverPreview
          project={{
            ...project,
            orderNumber: project.orderNumber?.trim() || null,
            customer: {
              ...project.customer,
              customerNumber: project.customer.customerNumber || customerNumberLabel,
            },
          }}
          onDoubleClick={() => onOpenProject?.(project.id)}
        />
      )}
      mode="cursor"
      side="right"
      align="start"
      cursorOffsetX={20}
      cursorOffsetY={20}
      maxWidth={420}
      maxHeight={400}
      openDelay={300}
      className="w-[420px] p-2"
    >
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
    </HoverPreview>
  );
}
