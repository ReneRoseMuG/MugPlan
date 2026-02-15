import React from "react";
import type { Project } from "@shared/schema";

export interface ProjectDetailCardProps {
  project: Pick<Project, "name" | "descriptionMd" | "isActive">;
  customerName?: string | null;
  testId?: string;
}

const fallbackText = "nicht hinterlegt";

const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveDescriptionExcerpt = (value: string | null | undefined) => {
  const normalized = value ? stripMarkdown(value) : "";
  if (!normalized) return fallbackText;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
};

const resolveValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackText;
};

export function ProjectDetailCard({ project, customerName, testId }: ProjectDetailCardProps) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="text-sm font-semibold text-foreground" data-testid={testId ? `${testId}-name` : undefined}>
        {resolveValue(project.name)}
      </div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Kunde</dt>
        <dd>{resolveValue(customerName)}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{project.isActive ? "Aktiv" : "Inaktiv"}</dd>
        <dt className="text-muted-foreground">Beschreibung</dt>
        <dd data-testid={testId ? `${testId}-description` : undefined}>
          {resolveDescriptionExcerpt(project.descriptionMd)}
        </dd>
      </dl>
    </div>
  );
}
