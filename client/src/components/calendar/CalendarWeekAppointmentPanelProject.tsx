import { HoverPreview } from "@/components/ui/hover-preview";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";
import { resolveProjectDisplayName } from "@/components/ui/project-info-panel";
import { domainIcons } from "@/lib/domain-icons";
import { cn } from "@/lib/utils";

const PANEL_PREVIEW_CURSOR_OFFSET_PX = 20;

export function CalendarWeekAppointmentPanelProject({
  projectName,
  projectOrderNumber,
  projectArticleItems,
  projectDescription,
  collapsed = false,
  showSectionTitle = false,
  enableFullDescriptionPreview = false,
  className,
}: {
  projectName: string;
  projectOrderNumber: string | null;
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
  collapsed?: boolean;
  showSectionTitle?: boolean;
  enableFullDescriptionPreview?: boolean;
  className?: string;
}) {
  const compactContentClassName = "max-h-24 overflow-hidden";
  const fullDescriptionClassName = "max-h-[280px] overflow-y-auto text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5";
  const resolvedProjectName = resolveProjectDisplayName(projectName);
  const hasProjectReference = resolvedProjectName !== "Kein Auftrag hinterlegt";
  const resolvedProjectOrderNumber = projectOrderNumber?.trim() || "-";
  const normalizedDescriptionText = (projectDescription ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  const hasProjectContent = projectArticleItems.some((item) => item.label.trim().length > 0 && item.value.trim().length > 0)
    || normalizedDescriptionText.length > 0;
  const canOpenDescriptionPreview = hasProjectReference && hasProjectContent && enableFullDescriptionPreview;
  const ProjectIcon = domainIcons.projects;
  const compactArticleListClassName = "list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-slate-700 [&_li]:min-w-0 [&_li]:overflow-hidden [&_li]:whitespace-nowrap [&_li]:text-ellipsis";

  const projectHeader = hasProjectReference ? (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap" data-testid="week-project-header">
      <ProjectIcon className="h-3 w-3 flex-shrink-0 text-slate-500" />
      <div className="min-w-0 truncate text-xs font-semibold text-slate-800">{resolvedProjectName}</div>
      <span className="shrink-0 text-[11px] text-slate-500"> - {resolvedProjectOrderNumber}</span>
    </div>
  ) : (
    <div className="text-[11px] text-slate-500" data-testid="week-project-header-empty">{resolvedProjectName}</div>
  );

  const compactContent = (
    <div className={cn("mt-1 min-h-0 flex-1 overflow-hidden", compactContentClassName)}>
      <ProjectArticleDescriptionRenderer
        articleItems={projectArticleItems}
        descriptionHtml={projectDescription}
        articleListClassName={compactArticleListClassName}
        testIdPrefix="week-project-renderer"
      />
    </div>
  );
  const hoverPreviewContent = (
    <div className="rounded-lg bg-white p-2">
      <div className="mb-2">{projectHeader}</div>
      {hasProjectContent ? (
        <ProjectArticleDescriptionRenderer
          articleItems={projectArticleItems}
          descriptionHtml={projectDescription}
          showSectionTitles
          descriptionHtmlClassName={fullDescriptionClassName}
          testIdPrefix="week-project-hover-renderer"
        />
      ) : (
        <div className="text-[11px] text-slate-500">{resolvedProjectName}</div>
      )}
    </div>
  );
  const canOpenCollapsedPreview = enableFullDescriptionPreview && hasProjectReference;

  return (
    <div className={cn("flex min-h-0 flex-col rounded-md border border-slate-200/90 bg-white px-2 py-1.5", className)}>
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold text-slate-500">Projekt</div>}
      {collapsed && canOpenCollapsedPreview ? (
        <HoverPreview
          preview={hoverPreviewContent}
          closeDelay={80}
          mode="cursor"
          side="right"
          align="start"
          cursorOffsetX={PANEL_PREVIEW_CURSOR_OFFSET_PX}
          cursorOffsetY={PANEL_PREVIEW_CURSOR_OFFSET_PX}
          maxWidth={420}
          maxHeight={320}
          className="z-[9999] w-[420px]"
        >
          <div data-testid="week-project-description-hover-trigger">
            {projectHeader}
          </div>
        </HoverPreview>
      ) : (
        projectHeader
      )}
      {collapsed ? null : (
        <>
          {!canOpenDescriptionPreview && hasProjectContent && compactContent}
          {canOpenDescriptionPreview && (
            <HoverPreview
              preview={hoverPreviewContent}
              closeDelay={80}
              mode="cursor"
              side="right"
              align="start"
              cursorOffsetX={PANEL_PREVIEW_CURSOR_OFFSET_PX}
              cursorOffsetY={PANEL_PREVIEW_CURSOR_OFFSET_PX}
              maxWidth={420}
              maxHeight={320}
              className="z-[9999] w-[420px]"
            >
              <div
                className={cn("min-h-0 flex-1 overflow-hidden", hasProjectContent ? "mt-1" : "mt-0")}
                data-testid="week-project-description-hover-trigger"
              >
                {hasProjectContent ? (
                  <ProjectArticleDescriptionRenderer
                    articleItems={projectArticleItems}
                    descriptionHtml={projectDescription}
                    articleListClassName={compactArticleListClassName}
                    testIdPrefix="week-project-hover-trigger-renderer"
                  />
                ) : (
                  <div className="text-[11px] text-slate-500">{resolvedProjectName}</div>
                )}
              </div>
            </HoverPreview>
          )}
        </>
      )}
    </div>
  );
}
