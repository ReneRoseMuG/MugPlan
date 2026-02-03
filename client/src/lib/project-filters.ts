import type { Project } from "@shared/schema";

export interface ProjectFilters {
  title: string;
}

export const defaultProjectFilters: ProjectFilters = {
  title: "",
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
