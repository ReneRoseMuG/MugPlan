import type { ProjectStatus } from "@shared/schema";

export function getProjectStatusColor(
  status?: Pick<ProjectStatus, "color"> | { color?: string | null } | null,
): string | undefined {
  return status?.color ?? undefined;
}
