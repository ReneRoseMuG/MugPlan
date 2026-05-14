import type { DbRoleCode, CanonicalRoleKey } from "../settings/registry";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import { hasAppointmentCancellationTag } from "../lib/appointmentCancellation";
import * as userSettingsService from "./userSettingsService";
import {
  MONITORING_TRIGGER_COLORS,
  MONITORING_TRIGGER_NAMES,
  MONITORING_TRIGGER_PRIORITY,
  type MonitoringTriggerCode,
  type MonitoringTriggerSummaryItem,
} from "@shared/monitoring";
import { isReservedVacantTagName } from "@shared/appointmentCancellation";

export type MonitoringConfig = {
  tr01: {
    allAppointments: boolean;
    horizonDays: number;
    minimumEmployees: number;
  };
};

export type MonitoringItem = {
  appointmentId: number;
  startDate: string;
  startTime: string | null;
  tourId: number | null;
  tourName: string | null;
  tourColor: string | null;
  orderNumber: string | null;
  projectTitle: string | null;
  projectName: string | null;
  customerNumber: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerName: string | null;
  employeeCount: number;
  triggerCode: MonitoringTriggerCode;
  triggerCodes: MonitoringTriggerCode[];
  triggerName: string;
};

export type MonitoringSummary = {
  count: number;
  triggers: MonitoringTriggerSummaryItem[];
};

export class MonitoringError extends Error {
  status: number;
  code: "FORBIDDEN";

  constructor(status: number, code: "FORBIDDEN") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function assertMonitoringReadRole(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new MonitoringError(403, "FORBIDDEN");
  }
}

function assertAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new MonitoringError(403, "FORBIDDEN");
  }
}

async function readMonitoringConfig(): Promise<MonitoringConfig> {
  const [allAppointmentsValue, horizonDaysValue, minimumEmployeesValue] = await Promise.all([
    userSettingsService.getGlobalSettingValue("monitoring.tr01.allAppointments"),
    userSettingsService.getGlobalSettingValue("monitoring.tr01.horizonDays"),
    userSettingsService.getGlobalSettingValue("monitoring.tr01.minimumEmployees"),
  ]);

  return {
    tr01: {
      allAppointments: allAppointmentsValue === true,
      horizonDays: typeof horizonDaysValue === "number" ? horizonDaysValue : 14,
      minimumEmployees: typeof minimumEmployeesValue === "number" ? minimumEmployeesValue : 1,
    },
  };
}

function buildTriggerSummary(items: MonitoringItem[]): MonitoringTriggerSummaryItem[] {
  const countByCode = new Map<MonitoringTriggerCode, number>();
  for (const item of items) {
    for (const triggerCode of item.triggerCodes) {
      countByCode.set(triggerCode, (countByCode.get(triggerCode) ?? 0) + 1);
    }
  }

  return Array.from(countByCode.entries())
    .sort(([leftCode], [rightCode]) => MONITORING_TRIGGER_PRIORITY[leftCode] - MONITORING_TRIGGER_PRIORITY[rightCode])
    .map(([triggerCode, count]) => ({
      triggerCode,
      triggerName: MONITORING_TRIGGER_NAMES[triggerCode],
      count,
      color: MONITORING_TRIGGER_COLORS[triggerCode],
    }));
}

export async function listMonitoringItems(roleKey: CanonicalRoleKey): Promise<MonitoringItem[]> {
  assertMonitoringReadRole(roleKey);

  const config = await readMonitoringConfig();
  const rows = await appointmentsRepository.listAppointmentsForMonitoring({});
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(
    rows.map((row) => row.appointmentId),
  );

  const items: MonitoringItem[] = [];
  for (const row of rows) {
    const appointmentTags = appointmentTagsByAppointmentId.get(row.appointmentId) ?? [];
    if (hasAppointmentCancellationTag(appointmentTags)) {
      continue;
    }

    const triggerCodes: MonitoringTriggerCode[] = [];
    if (row.employeeCount < config.tr01.minimumEmployees) {
      triggerCodes.push("TR-01");
    }

    if (appointmentTags.some((tag) => isReservedVacantTagName(tag.name))) {
      triggerCodes.push("TR-02");
    }

    if (triggerCodes.length > 0) {
      triggerCodes.sort((leftCode, rightCode) => MONITORING_TRIGGER_PRIORITY[leftCode] - MONITORING_TRIGGER_PRIORITY[rightCode]);
      items.push({
        appointmentId: row.appointmentId,
        startDate: row.startDate,
        startTime: row.startTime,
        tourId: row.tourId,
        tourName: row.tourName,
        tourColor: row.tourColor,
        orderNumber: row.orderNumber,
        projectTitle: row.projectTitle,
        projectName: row.projectName,
        customerNumber: row.customerNumber,
        customerFirstName: row.customerFirstName,
        customerLastName: row.customerLastName,
        customerName: row.customerName,
        employeeCount: row.employeeCount,
        triggerCode: triggerCodes[0],
        triggerCodes,
        triggerName: triggerCodes.map((triggerCode) => MONITORING_TRIGGER_NAMES[triggerCode]).join(" + "),
      });
    }
  }

  return items;
}

export async function getMonitoringSummaryForRole(roleCode: DbRoleCode): Promise<MonitoringSummary | undefined> {
  const roleKey = roleCode === "ADMIN" ? "ADMIN" : roleCode === "DISPATCHER" ? "DISPONENT" : "LESER";
  if (roleKey === "LESER") {
    return undefined;
  }

  const items = await listMonitoringItems(roleKey);
  if (items.length === 0) {
    return undefined;
  }

  return {
    count: items.length,
    triggers: buildTriggerSummary(items),
  };
}

export async function getMonitoringConfigForAdmin(userId: number, roleKey: CanonicalRoleKey): Promise<MonitoringConfig> {
  assertAdmin(roleKey);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Ungültiger User-Kontext");
  }

  return readMonitoringConfig();
}

export async function setMonitoringConfigForAdmin(
  userId: number,
  roleKey: CanonicalRoleKey,
  config: MonitoringConfig,
): Promise<MonitoringConfig> {
  assertAdmin(roleKey);

  const resolvedSettings = await userSettingsService.getResolvedSettingsForUser(userId);
  const versionByKey = new Map(resolvedSettings.map((setting) => [setting.key, setting.globalVersion ?? 1] as const));

  await userSettingsService.setSettingForUser(userId, {
    key: "monitoring.tr01.allAppointments",
    scopeType: "GLOBAL",
    version: versionByKey.get("monitoring.tr01.allAppointments") ?? 1,
    value: config.tr01.allAppointments,
  });
  await userSettingsService.setSettingForUser(userId, {
    key: "monitoring.tr01.horizonDays",
    scopeType: "GLOBAL",
    version: versionByKey.get("monitoring.tr01.horizonDays") ?? 1,
    value: config.tr01.horizonDays,
  });
  await userSettingsService.setSettingForUser(userId, {
    key: "monitoring.tr01.minimumEmployees",
    scopeType: "GLOBAL",
    version: versionByKey.get("monitoring.tr01.minimumEmployees") ?? 1,
    value: config.tr01.minimumEmployees,
  });

  return readMonitoringConfig();
}
