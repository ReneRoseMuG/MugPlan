import type { Tag } from "@shared/schema";

export const tagCatalogQueryKey = ["/api/tags"] as const;

export async function fetchTagCatalog(): Promise<Tag[]> {
  const response = await fetch("/api/tags", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Tags konnten nicht geladen werden");
  }
  return response.json() as Promise<Tag[]>;
}
