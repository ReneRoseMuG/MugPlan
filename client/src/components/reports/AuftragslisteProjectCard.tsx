import type { ReportAuftragslisteProjectRow } from "@shared/routes";
import { ReportProjectCard } from "@/components/reports/ReportProjectCard";
import {
  buildProjectRowArticleItems,
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { renderProjectArticleListSection } from "@/components/ui/project-article-description-renderer";

function hasTextContent(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function AuftragslisteProjectCard({
  row,
  categories,
}: {
  row: ReportAuftragslisteProjectRow;
  categories: ProduktionsplanungArticleCategory[];
}) {
  const testIdPrefix = `reports-auftragsliste-project-card-${row.projectId}`;
  const articleSection = renderProjectArticleListSection({
    articleItems: buildProjectRowArticleItems(row, categories),
    articleSectionClassName: "min-w-0 md:pr-4",
    articleListClassName: "list-disc space-y-1 pl-4 text-xs leading-snug text-foreground",
    testIdPrefix,
  });
  const hasDescription = hasTextContent(row.projectDescription);
  const hasBodyContent = articleSection || hasDescription;

  return (
    <ReportProjectCard
      row={row}
      testIdPrefix={testIdPrefix}
      headerClassName={row.tourColor ? "border" : undefined}
      headerStyle={row.tourColor ? { borderColor: row.tourColor } : undefined}
      bodyContent={hasBodyContent ? (
        <>
          {articleSection}
          {hasDescription ? (
            <div
              className="min-w-0 whitespace-pre-wrap text-xs leading-snug text-foreground md:rounded-md md:border-l md:border-border/60 md:bg-slate-50/70 md:px-4 md:py-3"
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
