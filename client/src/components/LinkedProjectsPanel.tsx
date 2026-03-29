import React from "react";
import { FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ProjectEntityCard, TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS } from "@/components/ui/entity-preview-cards";
import type { Tag } from "@shared/schema";
import type { ProjectArticleItem } from "@shared/projectArticleList";

interface LinkedProjectsPanelProps {
  customerId?: number | null;
  customerNumber?: string | null;
  onOpenProject?: (id: number) => void;
}

type LinkedProjectListItem = {
  id: number;
  customerId: number;
  name: string;
  orderNumber: string | null;
  amount: string | number | null;
  descriptionMd: string | null;
  isActive: boolean;
  version: number;
  notesCount: number;
  plannedAppointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  projectArticleItems: ProjectArticleItem[];
  tags: Tag[];
  attachmentsCount: number;
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  };
};

type LinkedProjectListResponse = {
  page: number;
  totalPages: number;
  items: LinkedProjectListItem[];
};

function toAppointmentSortKey(project: LinkedProjectListItem): string | null {
  if (!project.nextAppointmentStartDate) return null;
  return `${project.nextAppointmentStartDate}|${String(project.nextAppointmentStartTimeHour ?? 99).padStart(2, "0")}`;
}

export function LinkedProjectsPanel({ customerId, customerNumber, onOpenProject }: LinkedProjectsPanelProps) {
  const { data: projects = [], isLoading, isError } = useQuery<LinkedProjectListItem[]>({
    queryKey: ["/api/projects/list", customerId ?? null, "linked-projects-panel"],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (!customerId) return [];

      const pageSize = 100;
      const items: LinkedProjectListItem[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          customerId: String(customerId),
          scope: "all",
          page: String(page),
          pageSize: String(pageSize),
        });

        const response = await fetch(`/api/projects/list?${params.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Projekte konnten nicht geladen werden");
        }

        const payload = await response.json() as LinkedProjectListResponse;
        items.push(...payload.items);
        totalPages = payload.totalPages;
        page += 1;
      } while (page <= totalPages);

      return items.filter((project) => project.isActive);
    },
  });

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const leftDate = toAppointmentSortKey(a);
      const rightDate = toAppointmentSortKey(b);

      if (leftDate && rightDate) return rightDate.localeCompare(leftDate, "de");
      if (leftDate && !rightDate) return -1;
      if (!leftDate && rightDate) return 1;
      return b.id - a.id;
    });
  }, [projects]);

  return (
    <div className="sub-panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
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
            <ProjectEntityCard
              key={project.id}
              project={{
                ...project,
                customer: {
                  ...project.customer,
                  customerNumber: project.customer.customerNumber || customerNumber || "-",
                },
              }}
              className={TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS}
              onDoubleClick={() => onOpenProject?.(project.id)}
              testIds={{
                card: `linked-project-card-${project.id}`,
                customerPanel: `linked-project-customer-${project.id}`,
                projectPanel: `linked-project-project-${project.id}`,
                appointments: `linked-project-appointments-${project.id}`,
                notes: `linked-project-notes-${project.id}`,
                tags: `linked-project-tags-${project.id}`,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
