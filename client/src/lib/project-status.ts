import type { ProjectStatus } from "@shared/schema";

export function getProjectStatusColor(status?: ProjectStatus | null): string | undefined {
  return status?.color ?? undefined;
}
