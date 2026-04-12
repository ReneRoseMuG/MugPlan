import { RESERVED_VACANT_TAG_COLOR } from "./appointmentCancellation";

export const MONITORING_TRIGGER_CODES = ["TR-01", "TR-02"] as const;

export type MonitoringTriggerCode = (typeof MONITORING_TRIGGER_CODES)[number];

export const MONITORING_TRIGGER_NAMES: Record<MonitoringTriggerCode, string> = {
  "TR-01": "Mindestzahl Mitarbeiter",
  "TR-02": "Geparkt",
};

export const MONITORING_TRIGGER_COLORS: Record<MonitoringTriggerCode, string> = {
  "TR-01": "#DC2626",
  "TR-02": RESERVED_VACANT_TAG_COLOR,
};

export const MONITORING_TRIGGER_PRIORITY: Record<MonitoringTriggerCode, number> = {
  "TR-01": 1,
  "TR-02": 2,
};

export type MonitoringTriggerSummaryItem = {
  triggerCode: MonitoringTriggerCode;
  triggerName: string;
  count: number;
  color: string;
};
