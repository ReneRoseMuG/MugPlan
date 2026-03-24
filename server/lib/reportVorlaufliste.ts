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

