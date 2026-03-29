import React from "react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";
import { domainIcons } from "@/lib/domain-icons";
import { cn } from "@/lib/utils";
import type { ProjectArticleItem } from "@shared/projectArticleList";

const PANEL_PREVIEW_CURSOR_OFFSET_PX = 20;

type ProjectInfoPanelProps = {
  mode: "collapsed" | "expanded";
  hideHeader?: boolean;
  compact?: boolean;
  projectName: string;
  projectOrderNumber: string | null;
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
  testId?: string;
  className?: string;
};

const EMPTY_PROJECT_FALLBACK_TEXT = "Kein Auftrag hinterlegt";

export function resolveProjectDisplayName(projectName: string): string {
  const normalized = projectName.trim();
  if (normalized.length === 0) return EMPTY_PROJECT_FALLBACK_TEXT;
  if (/^-*\s*ohne projekt\s*$/i.test(normalized)) return EMPTY_PROJECT_FALLBACK_TEXT;
  return normalized;
}

export function hasProjectContent(projectArticleItems: ProjectArticleItem[], projectDescription: string | null): boolean {
  const hasArticleItems = projectArticleItems.some((item) => item.label.trim().length > 0 && item.value.trim().length > 0);
  const hasDescription = (projectDescription ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim()
    .length > 0;

  return hasArticleItems || hasDescription;
}

export function canOpenProjectInfoPreview(
  projectName: string,
  projectArticleItems: ProjectArticleItem[],
  projectDescription: string | null,
): boolean {
  return resolveProjectDisplayName(projectName) !== EMPTY_PROJECT_FALLBACK_TEXT
    && hasProjectContent(projectArticleItems, projectDescription);
}

function ProjectHeader({ projectName, projectOrderNumber }: { projectName: string; projectOrderNumber: string | null }) {
  const ProjectIcon = domainIcons.projects;
  return (
    <div className="flex items-center gap-1.5">
      <ProjectIcon className="h-3 w-3 flex-shrink-0 text-slate-500" />
      <h5 className="text-xs font-semibold text-slate-800">{resolveProjectDisplayName(projectName)}</h5>
      <span className="text-[11px] text-slate-500"> - {projectOrderNumber ?? "-"}</span>
    </div>
  );
}

function ExpandedContent({
  hideHeader,
  projectName,
  projectOrderNumber,
  projectArticleItems,
  projectDescription,
}: Omit<ProjectInfoPanelProps, "mode" | "testId">) {
  const hasContent = hasProjectContent(projectArticleItems, projectDescription);

  return (
    <div className="flex h-full flex-col">
      {!hideHeader && (
        <div className="mb-1">
          <ProjectHeader projectName={projectName} projectOrderNumber={projectOrderNumber} />
        </div>
      )}
      {hasContent ? (
        <ProjectArticleDescriptionRenderer
          articleItems={projectArticleItems}
          descriptionHtml={projectDescription}
          showSectionTitles
        />
      ) : null}
      {!hasContent ? (
        <div className="text-[11px] font-medium text-slate-400">{EMPTY_PROJECT_FALLBACK_TEXT}</div>
      ) : null}
    </div>
  );
}

export function ProjectInfoPanel({
  mode,
  hideHeader,
  compact = false,
  projectName,
  projectOrderNumber,
  projectArticleItems,
  projectDescription,
  testId,
  className,
}: ProjectInfoPanelProps) {
  const canOpenPreview = canOpenProjectInfoPreview(projectName, projectArticleItems, projectDescription);

  if (mode === "collapsed") {
    const collapsedPanel = (
      <div
        className={cn("cursor-pointer rounded-md border border-slate-200/90 bg-white px-1.5 py-1", className)}
        data-testid={testId ?? "project-info-panel-collapsed"}
      >
        <ProjectHeader projectName={projectName} projectOrderNumber={projectOrderNumber} />
      </div>
    );

    if (!canOpenPreview) {
      return collapsedPanel;
    }

    return (
      <HoverPreview
        preview={(
          <div className="rounded-lg bg-white p-2">
            <ExpandedContent
              hideHeader={false}
              projectName={projectName}
              projectOrderNumber={projectOrderNumber}
              projectArticleItems={projectArticleItems}
              projectDescription={projectDescription}
            />
          </div>
        )}
        closeDelay={80}
        mode="cursor"
        side="right"
        align="start"
        cursorOffsetX={PANEL_PREVIEW_CURSOR_OFFSET_PX}
        cursorOffsetY={PANEL_PREVIEW_CURSOR_OFFSET_PX}
        maxWidth={420}
        maxHeight={320}
      >
        {collapsedPanel}
      </HoverPreview>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-slate-200/90 bg-white px-1.5 py-1",
        compact ? "h-[6.5rem] overflow-hidden" : "min-h-[6.5rem]",
        className,
      )}
      data-testid={testId ?? "project-info-panel-expanded"}
    >
      <ExpandedContent
        hideHeader={hideHeader}
        projectName={projectName}
        projectOrderNumber={projectOrderNumber}
        projectArticleItems={projectArticleItems}
        projectDescription={projectDescription}
      />
    </div>
  );
}
