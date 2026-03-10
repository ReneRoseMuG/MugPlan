import React from "react";
import type { ProjectArticleItem } from "@shared/projectArticleList";

function hasVisibleDescriptionContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0;
}

function normalizeArticleItems(items: ProjectArticleItem[] | null | undefined): ProjectArticleItem[] {
  return (items ?? []).filter((item) => item.label.trim().length > 0 && item.value.trim().length > 0);
}

export function ProjectArticleDescriptionRenderer({
  articleItems,
  descriptionHtml,
  showSectionTitles = false,
  articleSectionClassName,
  articleListClassName,
  descriptionSectionClassName,
  descriptionHtmlClassName,
  testIdPrefix,
}: {
  articleItems: ProjectArticleItem[] | null | undefined;
  descriptionHtml: string | null | undefined;
  showSectionTitles?: boolean;
  articleSectionClassName?: string;
  articleListClassName?: string;
  descriptionSectionClassName?: string;
  descriptionHtmlClassName?: string;
  testIdPrefix?: string;
}) {
  const resolvedArticleItems = normalizeArticleItems(articleItems);
  const hasDescription = hasVisibleDescriptionContent(descriptionHtml);

  if (resolvedArticleItems.length === 0 && !hasDescription) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid={testIdPrefix ? `${testIdPrefix}-content` : undefined}>
      {resolvedArticleItems.length > 0 ? (
        <section className={articleSectionClassName} data-testid={testIdPrefix ? `${testIdPrefix}-articles` : undefined}>
          {showSectionTitles ? <div className="mb-1 text-[10px] font-semibold text-slate-500">Artikelliste</div> : null}
          <ul
            className={articleListClassName ?? "list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-slate-700"}
            data-testid={testIdPrefix ? `${testIdPrefix}-articles-list` : undefined}
          >
            {resolvedArticleItems.map((item) => (
              <li key={`${item.label}:${item.value}`}>
                <span className="font-medium">{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hasDescription ? (
        <section className={descriptionSectionClassName} data-testid={testIdPrefix ? `${testIdPrefix}-description` : undefined}>
          {showSectionTitles ? <div className="mb-1 text-[10px] font-semibold text-slate-500">Beschreibung</div> : null}
          <div
            className={
              descriptionHtmlClassName
              ?? "text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
            }
            dangerouslySetInnerHTML={{ __html: descriptionHtml ?? "" }}
          />
        </section>
      ) : null}
    </div>
  );
}
