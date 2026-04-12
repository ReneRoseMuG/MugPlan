import type { MonitoringListResponse, MonitoringTriggerSummaryItemResponse } from "@shared/routes";
import {
  monitoringTriggerMetadata,
} from "@shared/routes";
import {
  MONITORING_TRIGGER_PRIORITY,
  type MonitoringTriggerCode,
} from "@shared/monitoring";

export type MonitoringConflictMeta = {
  triggerCode: MonitoringTriggerCode;
  triggerName: string;
  color: string;
};

function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function toAlphaColor(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getMonitoringTriggerColor(triggerCode: MonitoringTriggerCode): string {
  return monitoringTriggerMetadata.colors[triggerCode];
}

export function buildMonitoringTriggerSummary(
  items: MonitoringListResponse | undefined,
): MonitoringTriggerSummaryItemResponse[] {
  const countByCode = new Map<MonitoringTriggerCode, number>();
  for (const item of items ?? []) {
    for (const triggerCode of item.triggerCodes) {
      countByCode.set(triggerCode, (countByCode.get(triggerCode) ?? 0) + 1);
    }
  }

  return Array.from(countByCode.entries())
    .sort(([leftCode], [rightCode]) => MONITORING_TRIGGER_PRIORITY[leftCode] - MONITORING_TRIGGER_PRIORITY[rightCode])
    .map(([triggerCode, count]) => ({
      triggerCode,
      triggerName: monitoringTriggerMetadata.names[triggerCode],
      count,
      color: monitoringTriggerMetadata.colors[triggerCode],
    }));
}

export function buildMonitoringConflictMap(items: MonitoringListResponse | undefined): Map<number, MonitoringConflictMeta> {
  const conflictMap = new Map<number, MonitoringConflictMeta>();
  for (const item of items ?? []) {
    const existing = conflictMap.get(item.appointmentId);
    if (existing && MONITORING_TRIGGER_PRIORITY[existing.triggerCode] <= MONITORING_TRIGGER_PRIORITY[item.triggerCode]) {
      continue;
    }

    conflictMap.set(item.appointmentId, {
      triggerCode: item.triggerCode,
      triggerName: monitoringTriggerMetadata.names[item.triggerCode],
      color: getMonitoringTriggerColor(item.triggerCode),
    });
  }

  return conflictMap;
}
