import { getProjectArticleFieldByCategoryName } from "@shared/projectArticleList";

export type ReportComponentSlot = "door" | "window" | "oven" | "control" | "roof" | null;

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function stripReportHtmlToText(value: string | null): string | null {
  if (!value) return null;
  const withoutTags = value.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
  return decoded.length > 0 ? decoded : null;
}

export function resolveReportComponentSlot(categoryName: string): ReportComponentSlot {
  const fieldKey = getProjectArticleFieldByCategoryName(categoryName);
  if (fieldKey === "door") return "door";
  if (fieldKey === "window") return "window";
  if (fieldKey === "oven") return "oven";
  if (fieldKey === "control") return "control";
  if (fieldKey === "roof") return "roof";
  return null;
}
