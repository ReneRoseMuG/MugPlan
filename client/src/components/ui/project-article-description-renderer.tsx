import React from "react";
import {
  normalizeRenderableProjectArticleItems,
  type ProjectArticleItem,
  type ProjectArticleListRenderOptions,
} from "@shared/projectArticleList";

type ProjectArticleDescriptionRendererProps = {
  articleItems: ProjectArticleItem[] | null | undefined;
  descriptionHtml: string | null | undefined;
  articleListOptions?: ProjectArticleListRenderOptions;
  showSectionTitles?: boolean;
  articleSectionClassName?: string;
  articleListClassName?: string;
  descriptionSectionClassName?: string;
  descriptionHtmlClassName?: string;
  testIdPrefix?: string;
};

function hasVisibleDescriptionContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0;
}

export function renderSelectiveProjectArticleListSection({
  articleItems,
  articleListOptions,
  showSectionTitles = false,
  articleSectionClassName,
  articleListClassName,
  testIdPrefix,
}: Pick<
  ProjectArticleDescriptionRendererProps,
  "articleItems" | "articleListOptions" | "showSectionTitles" | "articleSectionClassName" | "articleListClassName" | "testIdPrefix"
>) {
  const resolvedArticleItems = normalizeRenderableProjectArticleItems(articleItems, articleListOptions);

  if (resolvedArticleItems.length === 0) {
    return null;
  }

  return (
    <section className={articleSectionClassName} data-testid={testIdPrefix ? `${testIdPrefix}-articles` : undefined}>
      {showSectionTitles ? <div className="mb-1 text-[10px] font-semibold text-slate-900">Artikelliste</div> : null}
      <ul
        className={articleListClassName ?? "list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-slate-700"}
        data-testid={testIdPrefix ? `${testIdPrefix}-articles-list` : undefined}
      >
        {resolvedArticleItems.map((item) => (
          <li key={`${item.label}:${item.value}`}>
            <span className="font-semibold text-slate-900">{item.label}:</span>{" "}
            <span className="inline">{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function renderProjectArticleListSection({
  articleItems,
  showSectionTitles = false,
  articleSectionClassName,
  articleListClassName,
  testIdPrefix,
}: Pick<
  ProjectArticleDescriptionRendererProps,
  "articleItems" | "showSectionTitles" | "articleSectionClassName" | "articleListClassName" | "testIdPrefix"
>) {
  return renderSelectiveProjectArticleListSection({
    articleItems,
    articleListOptions: { filter: "all", useShortCodes: false },
    showSectionTitles,
    articleSectionClassName,
    articleListClassName,
    testIdPrefix,
  });
}

export function renderProjectNotesSection({
  descriptionHtml,
  showSectionTitles = false,
  descriptionSectionClassName,
  descriptionHtmlClassName,
  testIdPrefix,
}: Pick<
  ProjectArticleDescriptionRendererProps,
  "descriptionHtml" | "showSectionTitles" | "descriptionSectionClassName" | "descriptionHtmlClassName" | "testIdPrefix"
>) {
  const hasDescription = hasVisibleDescriptionContent(descriptionHtml);

  if (!hasDescription) {
    return null;
  }

  return (
    <section className={descriptionSectionClassName} data-testid={testIdPrefix ? `${testIdPrefix}-description` : undefined}>
      {showSectionTitles ? <div className="mb-1 text-[10px] font-semibold text-slate-900">Anmerkungen</div> : null}
      <div
        className={
          descriptionHtmlClassName
          ?? "text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
        }
        dangerouslySetInnerHTML={{ __html: descriptionHtml ?? "" }}
      />
    </section>
  );
}

export function ProjectArticleDescriptionRenderer({
  articleItems,
  descriptionHtml,
  articleListOptions,
  showSectionTitles = false,
  articleSectionClassName,
  articleListClassName,
  descriptionSectionClassName,
  descriptionHtmlClassName,
  testIdPrefix,
}: ProjectArticleDescriptionRendererProps) {
  const articleSection = renderSelectiveProjectArticleListSection({
    articleItems,
    articleListOptions,
    showSectionTitles,
    articleSectionClassName,
    articleListClassName,
    testIdPrefix,
  });
  const notesSection = renderProjectNotesSection({
    descriptionHtml,
    showSectionTitles,
    descriptionSectionClassName,
    descriptionHtmlClassName,
    testIdPrefix,
  });

  if (!articleSection && !notesSection) {
    return null;
  }

  return <div className="space-y-2" data-testid={testIdPrefix ? `${testIdPrefix}-content` : undefined}>{articleSection}{notesSection}</div>;
}
