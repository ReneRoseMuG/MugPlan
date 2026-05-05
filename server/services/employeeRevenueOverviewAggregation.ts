import { endOfISOWeek, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import type { Tag } from "@shared/schema";
import type { EmployeeRevenueOverviewResponse } from "@shared/routes";
import { isManagedComplaintTagName, isReservedAppointmentCancellationTagName } from "@shared/appointmentCancellation";

type RawRevenueAppointmentRow = {
  appointment: {
    id: number;
    projectId: number | null;
    startDate: string | Date;
    startTime: string | null;
  };
  project: {
    id: number;
    name: string;
  } | null;
  projectOrder: {
    amount: string | null;
    orderNumber: string | null;
  } | null;
};

type RevenueCandidate = {
  appointmentId: number;
  startDate: string;
  startTime: string | null;
  projectName: string;
  orderNumber: string | null;
  amount: string;
};

function normalizeOrderNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStartDate(value: string | Date): string {
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }
  return value;
}

function parseAmountToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const sign = trimmed.startsWith("-") ? -1 : 1;
  const unsigned = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const normalizedFraction = (fractionPart + "00").slice(0, 2);
  return sign * (Number(wholePart) * 100 + Number(normalizedFraction));
}

function formatCentsToAmount(value: number): string {
  const sign = value < 0 ? "-" : "";
  const normalized = Math.abs(value);
  const whole = Math.floor(normalized / 100);
  const fraction = normalized % 100;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

function compareCandidates(left: RevenueCandidate, right: RevenueCandidate): number {
  if (left.startDate !== right.startDate) {
    return left.startDate.localeCompare(right.startDate);
  }

  const leftTime = left.startTime ?? "";
  const rightTime = right.startTime ?? "";
  if (leftTime !== rightTime) {
    return leftTime.localeCompare(rightTime);
  }

  return left.appointmentId - right.appointmentId;
}

function hasComplaintTag(tags: Tag[] | undefined): boolean {
  return (tags ?? []).some((tag) => isManagedComplaintTagName(tag.name));
}

function hasExcludedAppointmentTag(tags: Tag[] | undefined): boolean {
  return (tags ?? []).some((tag) =>
    isManagedComplaintTagName(tag.name) || isReservedAppointmentCancellationTagName(tag.name)
  );
}

export function buildEmployeeRevenueOverview(params: {
  employeeId: number;
  employeeFullName: string;
  rows: RawRevenueAppointmentRow[];
  appointmentTagsByAppointmentId: Map<number, Tag[]>;
  projectTagsByProjectId: Map<number, Tag[]>;
}): EmployeeRevenueOverviewResponse {
  const candidates: RevenueCandidate[] = [];

  for (const row of params.rows) {
    if (!row.appointment.projectId || !row.project || !row.projectOrder) {
      continue;
    }

    const amount = row.projectOrder.amount?.trim() ?? "";
    if (amount.length === 0 || parseAmountToCents(amount) == null) {
      continue;
    }

    if (hasExcludedAppointmentTag(params.appointmentTagsByAppointmentId.get(row.appointment.id))) {
      continue;
    }

    if (hasComplaintTag(params.projectTagsByProjectId.get(row.project.id))) {
      continue;
    }

    candidates.push({
      appointmentId: row.appointment.id,
      startDate: normalizeStartDate(row.appointment.startDate),
      startTime: row.appointment.startTime,
      projectName: row.project.name,
      orderNumber: normalizeOrderNumber(row.projectOrder.orderNumber),
      amount,
    });
  }

  candidates.sort(compareCandidates);

  const selectedCandidates: RevenueCandidate[] = [];
  const seenOrderNumbers = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.orderNumber) {
      if (seenOrderNumbers.has(candidate.orderNumber)) {
        continue;
      }
      seenOrderNumbers.add(candidate.orderNumber);
    }

    selectedCandidates.push(candidate);
  }

  const weeks = new Map<string, EmployeeRevenueOverviewResponse["weeks"][number] & { revenueCents: number }>();

  for (const candidate of selectedCandidates) {
    const parsedStartDate = parseISO(candidate.startDate);
    const weekStart = startOfISOWeek(parsedStartDate);
    const isoYear = getISOWeekYear(parsedStartDate);
    const isoWeek = getISOWeek(parsedStartDate);
    const key = `${isoYear}-${String(isoWeek).padStart(2, "0")}`;
    const amountCents = parseAmountToCents(candidate.amount);

    if (amountCents == null) {
      continue;
    }

    const existingWeek = weeks.get(key) ?? {
      isoYear,
      isoWeek,
      weekStartDate: format(weekStart, "yyyy-MM-dd"),
      weekEndDate: format(endOfISOWeek(parsedStartDate), "yyyy-MM-dd"),
      weekLabel: `KW ${String(isoWeek).padStart(2, "0")} / ${isoYear}`,
      orderCount: 0,
      revenueAmount: "0.00",
      appointments: [],
      revenueCents: 0,
    };

    existingWeek.orderCount += 1;
    existingWeek.revenueCents += amountCents;
    existingWeek.revenueAmount = formatCentsToAmount(existingWeek.revenueCents);
    existingWeek.appointments.push({
      appointmentId: candidate.appointmentId,
      startDate: candidate.startDate,
      projectName: candidate.projectName,
      orderNumber: candidate.orderNumber,
      amount: candidate.amount,
    });
    weeks.set(key, existingWeek);
  }

  return {
    employeeId: params.employeeId,
    employeeFullName: params.employeeFullName,
    weeks: Array.from(weeks.values())
      .sort((left, right) => {
        if (left.isoYear !== right.isoYear) {
          return left.isoYear - right.isoYear;
        }
        return left.isoWeek - right.isoWeek;
      })
      .map(({ revenueCents: _revenueCents, ...week }) => week),
  };
}
