import React from "react";
import type { Project, ProjectStatus } from "@shared/schema";
import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";

type ProjectStatusBadgeItem = Pick<ProjectStatus, "id" | "title" | "color">;

export interface ProjectDetailCardProps {
  project: Pick<Project, "name" | "orderNumber" | "amount" | "descriptionMd" | "isActive">;
  customerNumber?: string | null;
  projectStatuses?: ProjectStatusBadgeItem[];
  testId?: string;
}

const fallbackText = "nicht hinterlegt";

const hasVisibleDescriptionContent = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0;
};

const resolveValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackText;
};

const formatProjectAmount = (amount: unknown) => {
  if (amount == null) return fallbackText;
  const normalized = typeof amount === "string" ? Number(amount) : amount;
  if (typeof normalized !== "number" || !Number.isFinite(normalized)) return fallbackText;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
};

export function ProjectDetailCard({ project, customerNumber, projectStatuses = [], testId }: ProjectDetailCardProps) {
  const customerNumberValue = resolveValue(customerNumber);
  const projectNameValue = resolveValue(project.name);
  const orderNumberValue = resolveValue(project.orderNumber);
  const amountValue = formatProjectAmount(project.amount);
  const descriptionHtml = project.descriptionMd ?? "";
  const hasDescription = hasVisibleDescriptionContent(project.descriptionMd);

  return (
    <div className="flex h-full flex-col gap-3" data-testid={testId}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[118px,minmax(200px,1fr),118px,150px]">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Kunde Nr.</div>
          <div className="h-10 rounded-md border border-border/50 bg-[hsl(var(--sub-panel-background))] px-3 flex items-center text-sm">
            {customerNumberValue}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Projektname</div>
          <div
            className="h-10 rounded-md border border-border/50 bg-[hsl(var(--sub-panel-background))] px-3 flex items-center text-sm min-w-0 truncate"
            data-testid={testId ? `${testId}-name` : undefined}
            title={projectNameValue}
          >
            {projectNameValue}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Auftragsnummer</div>
          <div
            className="h-10 rounded-md border border-border/50 bg-[hsl(var(--sub-panel-background))] px-3 flex items-center text-sm"
            data-testid={testId ? `${testId}-order-number` : undefined}
          >
            {orderNumberValue}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Betrag</div>
          <div
            className="h-10 rounded-md border border-border/50 bg-[hsl(var(--sub-panel-background))] px-3 flex items-center text-sm"
            data-testid={testId ? `${testId}-amount` : undefined}
          >
            {amountValue}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 text-sm">
        <div data-testid={testId ? `${testId}-description` : undefined}>
          {hasDescription ? (
            <div
              className="text-sm leading-snug [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            fallbackText
          )}
        </div>
      </div>
      <div className="border-t border-border/50 pt-3">
        {projectStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-2" data-testid={testId ? `${testId}-statuses` : undefined}>
            {projectStatuses.map((status) => (
              <ProjectStatusInfoBadge
                key={status.id}
                status={status}
                action="none"
                size="sm"
                testId={testId ? `${testId}-status-${status.id}` : undefined}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-sm text-muted-foreground"
            data-testid={testId ? `${testId}-statuses` : undefined}
          >
            {fallbackText}
          </div>
        )}
      </div>
    </div>
  );
}
