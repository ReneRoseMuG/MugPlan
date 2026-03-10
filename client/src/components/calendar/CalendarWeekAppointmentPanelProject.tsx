import { HoverPreview } from "@/components/ui/hover-preview";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";

export function CalendarWeekAppointmentPanelProject({
  projectName,
  projectOrderNumber,
  projectArticleItems,
  projectDescription,
  showSectionTitle = false,
  enableFullDescriptionPreview = false,
}: {
  projectName: string;
  projectOrderNumber: string | null;
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
  showSectionTitle?: boolean;
  enableFullDescriptionPreview?: boolean;
}) {
  const compactContentClassName = "max-h-24 overflow-hidden";
  const fullDescriptionClassName = "max-h-[280px] overflow-y-auto text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5";
  const resolvedProjectHeader = [projectOrderNumber?.trim() || "-", projectName].join(" - ");
  const normalizedDescriptionText = (projectDescription ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  const hasProjectContent = projectArticleItems.some((item) => item.label.trim().length > 0 && item.value.trim().length > 0)
    || normalizedDescriptionText.length > 0;

  return (
    <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold text-slate-500">Projekt</div>}
      <div className="text-xs font-semibold text-slate-800" data-testid="week-project-header">{resolvedProjectHeader}</div>
      {!enableFullDescriptionPreview && hasProjectContent && (
        <div className={compactContentClassName}>
          <ProjectArticleDescriptionRenderer
            articleItems={projectArticleItems}
            descriptionHtml={projectDescription}
            testIdPrefix="week-project-renderer"
          />
        </div>
      )}
      {enableFullDescriptionPreview && hasProjectContent && (
        <HoverPreview
          preview={(
            <div className="rounded-lg bg-white p-2">
              <div className="mb-2 text-xs font-semibold text-slate-800">{resolvedProjectHeader}</div>
              <ProjectArticleDescriptionRenderer
                articleItems={projectArticleItems}
                descriptionHtml={projectDescription}
                showSectionTitles
                descriptionHtmlClassName={fullDescriptionClassName}
                testIdPrefix="week-project-hover-renderer"
              />
            </div>
          )}
          closeDelay={80}
          side="right"
          align="start"
          maxWidth={420}
          maxHeight={320}
          className="z-[9999] w-[420px]"
        >
          <div
            className={compactContentClassName}
            data-testid="week-project-description-hover-trigger"
          >
            <ProjectArticleDescriptionRenderer
              articleItems={projectArticleItems}
              descriptionHtml={projectDescription}
              testIdPrefix="week-project-hover-trigger-renderer"
            />
          </div>
        </HoverPreview>
      )}
    </div>
  );
}
