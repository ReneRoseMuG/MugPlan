import type { DbRoleCode, CanonicalRoleKey } from "../settings/registry";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import { hasAppointmentCancellationTag } from "../lib/appointmentCancellation";
import * as userSettingsService from "./userSettingsService";

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
  tourName: string | null;
  projectName: string | null;
  customerName: string | null;
  employeeCount: number;
  triggerName: string;
  problemDescription: string;
};

export type MonitoringSummary = {
  count: number;
  triggerNames: string[];
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

const berlinDateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatBerlinDate(date: Date): string {
  const parts = berlinDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Das Berliner Datum konnte nicht bestimmt werden.");
  }

  return `${year}-${month}-${day}`;
}

function getBerlinTodayDateString(): string {
  return formatBerlinDate(new Date());
}

function parseDateOnly(input: string): Date {
  const [year, month, day] = input.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(year, month - 1, day);
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

function buildProblemDescription(employeeCount: number, minimumEmployees: number): string {
  return `Nur ${employeeCount} Mitarbeiter zugewiesen; mindestens ${minimumEmployees} erforderlich.`;
}

export async function listMonitoringItems(roleKey: CanonicalRoleKey): Promise<MonitoringItem[]> {
  assertMonitoringReadRole(roleKey);

  const config = await readMonitoringConfig();
  const todayBerlin = getBerlinTodayDateString();
  const rows = await appointmentsRepository.listAppointmentsForMonitoring({
    fromDate: parseDateOnly(todayBerlin),
  });
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(
    rows.map((row) => row.appointmentId),
  );

  const items: MonitoringItem[] = [];
  for (const row of rows) {
    if (hasAppointmentCancellationTag(appointmentTagsByAppointmentId.get(row.appointmentId) ?? [])) {
      continue;
    }
    if (row.startDate < todayBerlin) {
      continue;
    }
    if (row.employeeCount >= config.tr01.minimumEmployees) {
      continue;
    }

    items.push({
      appointmentId: row.appointmentId,
      startDate: row.startDate,
      startTime: row.startTime,
      tourName: row.tourName,
      projectName: row.projectName,
      customerName: row.customerName,
      employeeCount: row.employeeCount,
      triggerName: "TR-01 Ressourcenunterschreitung",
      problemDescription: buildProblemDescription(row.employeeCount, config.tr01.minimumEmployees),
    });
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
    triggerNames: Array.from(new Set(items.map((item) => item.triggerName))),
  };
}

export async function getMonitoringConfigForAdmin(userId: number, roleKey: CanonicalRoleKey): Promise<MonitoringConfig> {
  assertAdmin(roleKey);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Ungueltiger User-Kontext");
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
