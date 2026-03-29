import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";
import { domainIcons } from "@/lib/domain-icons";
import type { ProjectArticleItem } from "@shared/projectArticleList";

type ProjectInfoPanelProps = {
  mode: "collapsed" | "expanded";
  hideHeader?: boolean;
  projectName: string;
  projectOrderNumber: string | null;
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
  testId?: string;
};

function ProjectHeader({ projectName, projectOrderNumber }: { projectName: string; projectOrderNumber: string | null }) {
  const ProjectIcon = domainIcons.projects;
  return (
    <div className="flex items-center gap-1.5">
      <ProjectIcon className="h-3 w-3 flex-shrink-0 text-slate-500" />
      <h5 className="text-xs font-semibold text-slate-800">{projectName}</h5>
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
  return (
    <div>
      {!hideHeader && (
        <div className="mb-1">
          <ProjectHeader projectName={projectName} projectOrderNumber={projectOrderNumber} />
        </div>
      )}
      <ProjectArticleDescriptionRenderer
        articleItems={projectArticleItems}
        descriptionHtml={projectDescription}
        showSectionTitles
      />
    </div>
  );
}

export function ProjectInfoPanel({
  mode,
  hideHeader,
  projectName,
  projectOrderNumber,
  projectArticleItems,
  projectDescription,
  testId,
}: ProjectInfoPanelProps) {
  if (mode === "collapsed") {
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
        side="right"
        align="start"
        maxWidth={420}
        maxHeight={320}
      >
        <div
          className="cursor-pointer rounded-md border border-slate-200/90 px-2 py-1.5"
          data-testid={testId ?? "project-info-panel-collapsed"}
        >
          <ProjectHeader projectName={projectName} projectOrderNumber={projectOrderNumber} />
        </div>
      </HoverPreview>
    );
  }

  return (
    <div
      className="rounded-md border border-slate-200/90 px-2 py-1.5"
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
