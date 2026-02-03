import type { Project } from "@shared/schema";

export interface ProjectFilters {
  title: string;
}

export const defaultProjectFilters: ProjectFilters = {
  title: "",
};

export function applyProjectFilters(
  projects: Project[],
  filters: ProjectFilters,
): Project[] {
  const normalizedTitle = filters.title.trim().toLowerCase();

  if (!normalizedTitle) {
    return projects;
  }

  return projects.filter((project) =>
    (project.name ?? "").toLowerCase().includes(normalizedTitle),
  );
}
