import React from "react";
import type { Project } from "@shared/schema";
import { parseProjectStoredName } from "@/lib/project-name-format";

export interface ProjectDetailCardProps {
  project: Pick<Project, "name" | "orderNumber" | "descriptionMd" | "isActive">;
  customerNumber?: string | null;
  projectStatusTitles?: string[];
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

export function ProjectDetailCard({ project, customerNumber, projectStatusTitles = [], testId }: ProjectDetailCardProps) {
  const parsedProjectName = parseProjectStoredName(project.name);
  const customerNumberValue = resolveValue(customerNumber ?? parsedProjectName.customerNumberFromName);
  const projectNameValue = resolveValue(parsedProjectName.isolatedProjectName);
  const orderNumberValue = resolveValue(project.orderNumber);
  const statusLine = projectStatusTitles.length > 0 ? projectStatusTitles.join(" | ") : fallbackText;
  const descriptionHtml = project.descriptionMd ?? "";
  const hasDescription = hasVisibleDescriptionContent(project.descriptionMd);

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px,minmax(200px,1fr),150px]">
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
      </div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Projekt Status</dt>
        <dd title={statusLine}>
          {statusLine}
        </dd>
        <dt className="text-muted-foreground">Beschreibung</dt>
        <dd data-testid={testId ? `${testId}-description` : undefined}>
          {hasDescription ? (
            <div
              className="text-sm leading-snug [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            fallbackText
          )}
        </dd>
      </dl>
    </div>
  );
}
