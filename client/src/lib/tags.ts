import type { TagPickerDomain } from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";

export type TagCatalogDomain = TagPickerDomain;

export function getTagCatalogQueryKey(domain: TagCatalogDomain = "appointment") {
  return ["/api/tags", domain] as const;
}

export async function fetchTagCatalog(domain: TagCatalogDomain = "appointment"): Promise<Tag[]> {
  const params = new URLSearchParams({ domain });
  const response = await fetch(`/api/tags?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Tags konnten nicht geladen werden");
  }
  return response.json() as Promise<Tag[]>;
}
