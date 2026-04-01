import React from "react";
import { CustomerEntityCard, EmployeeEntityCard, ProjectEntityCard, TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS } from "@/components/ui/entity-preview-cards";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

export function ProjectTableHoverPreview({
  project,
  onDoubleClick,
}: {
  project: {
    id: number;
    name: string;
    orderNumber: string | null;
    descriptionMd: string | null;
    isActive?: boolean;
    notesCount: number;
    plannedAppointmentsCount: number;
    attachmentsCount: number;
    tags: Tag[];
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
    projectArticleItems: ProjectArticleItem[];
  };
  onDoubleClick?: () => void;
}) {
  return <ProjectEntityCard project={project} className={TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS} onDoubleClick={onDoubleClick} />;
}

export function CustomerTableHoverPreview({
  customer,
  onDoubleClick,
}: {
  customer: {
    id: number;
    fullName: string | null;
    customerNumber: string;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    notesCount: number;
    plannedAppointmentsCount: number;
    attachmentsCount: number;
    tags: Tag[];
  };
  onDoubleClick?: () => void;
}) {
  return <CustomerEntityCard customer={customer} className={TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS} onDoubleClick={onDoubleClick} />;
}

export function EmployeeTableHoverPreview({
  employee,
  tour,
  team,
  onDoubleClick,
}: {
  employee: {
    id: number;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
    notesCount: number;
    attachmentsCount: number;
    tags: Tag[];
    plannedAppointmentsCount: number;
  };
  team?: {
    id: number;
    name: string;
    color?: string | null;
    members?: Array<{ id: number; fullName: string }>;
  } | null;
  tour?: {
    id: number;
    name: string;
    color?: string | null;
    members?: Array<{ id: number; fullName: string }>;
  } | null;
  onDoubleClick?: () => void;
}) {
  return (
    <EmployeeEntityCard
      employee={employee}
      team={team}
      tour={tour}
      className={TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS}
      onDoubleClick={onDoubleClick}
    />
  );
}
