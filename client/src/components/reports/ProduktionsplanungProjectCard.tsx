import type { ReportProduktionsplanungProjectRow } from "@shared/routes";
import {
  buildProjectRowArticleItems,
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { ReportProjectCard } from "@/components/reports/ReportProjectCard";
import { renderProjectArticleListSection } from "@/components/ui/project-article-description-renderer";

function hasTextContent(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function ProduktionsplanungProjectCard({
  row,
  categories,
  className,
}: {
  row: ReportProduktionsplanungProjectRow;
  categories: ProduktionsplanungArticleCategory[];
  className?: string;
}) {
  const articleSection = renderProjectArticleListSection({
    articleItems: buildProjectRowArticleItems(row, categories),
    articleSectionClassName: "min-w-0 md:pr-4",
    articleListClassName: "list-disc space-y-1 pl-4 text-sm leading-snug text-foreground",
    testIdPrefix: `reports-produktionsplanung-project-card-${row.projectId}`,
  });
  const hasDescription = hasTextContent(row.projectDescription);
  const hasBodyContent = articleSection || hasDescription;
  const testIdPrefix = `reports-produktionsplanung-project-card-${row.projectId}`;

  return (
    <ReportProjectCard
      row={row}
      testIdPrefix={testIdPrefix}
      className={className}
      headerClassName="bg-slate-100"
      bodyClassName="bg-white"
      footerClassName="bg-slate-100"
      bodyContent={hasBodyContent ? (
        <>
          {articleSection}
          {hasDescription ? (
            <div
              className="min-w-0 whitespace-pre-wrap text-sm text-foreground md:rounded-md md:border-l md:border-border/60 md:bg-slate-50/70 md:px-4 md:py-3"
              data-testid={`${testIdPrefix}-description`}
            >
              {row.projectDescription?.trim() ?? ""}
            </div>
          ) : null}
        </>
      ) : undefined}
    />
  );
}
