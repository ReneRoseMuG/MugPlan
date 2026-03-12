import React from "react";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Project } from "@shared/schema";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";

export interface ProjectDetailCardProps {
  project: Pick<Project, "name" | "orderNumber" | "amount" | "descriptionMd" | "isActive"> & {
    projectArticleItems?: ProjectArticleItem[];
  };
  testId?: string;
}

const fallbackText = "nicht hinterlegt";

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

export function ProjectDetailCard({ project, testId }: ProjectDetailCardProps) {
  const projectNameValue = resolveValue(project.name);
  const orderNumberValue = resolveValue(project.orderNumber);
  const amountValue = formatProjectAmount(project.amount);

  return (
    <div className="flex h-full flex-col gap-3" data-testid={testId}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(200px,1fr),118px,150px]">
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
          {project.projectArticleItems?.length || project.descriptionMd ? (
            <ProjectArticleDescriptionRenderer
              articleItems={project.projectArticleItems}
              descriptionHtml={project.descriptionMd}
              showSectionTitles
              articleSectionClassName="space-y-1"
              articleListClassName="list-disc space-y-0.5 pl-5 text-sm leading-snug text-slate-700"
              descriptionSectionClassName="space-y-1"
              descriptionHtmlClassName="text-sm leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-0.5"
              testIdPrefix={testId ? `${testId}-project-content` : undefined}
            />
          ) : (
            fallbackText
          )}
        </div>
      </div>
    </div>
  );
}
