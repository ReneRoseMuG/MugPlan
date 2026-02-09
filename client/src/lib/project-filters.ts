import type { Project } from "@shared/schema";

export interface ProjectFilters {
  title: string;
  statusIds: number[];
}

export type ProjectScope = "upcoming" | "noAppointments";

export const defaultProjectFilters: ProjectFilters = {
  title: "",
  statusIds: [],
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export function applyProjectFilters(
  projects: Project[],
  filters: ProjectFilters,
): Project[] {
  const normalizedTitle = normalizeText(filters.title);

  return projects.filter((project) => {
    if (!normalizedTitle) {
      return true;
    }

    return (project.name ?? "").toLowerCase().includes(normalizedTitle);
  });
}

export function buildProjectFilterQueryParams(
  filters: ProjectFilters,
  scope: ProjectScope,
): string {
  const params = new URLSearchParams();
  params.set("scope", scope);

  if (filters.statusIds.length > 0) {
    params.set("statusIds", filters.statusIds.join(","));
  }

  return params.toString();
}
