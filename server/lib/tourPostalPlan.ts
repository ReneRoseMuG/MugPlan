import { endOfWeek, getISOWeek, getISOWeekYear, startOfWeek } from "date-fns";

export const TOUR_POSTAL_PLAN_SCORE_LABELS = {
  5: "exakt",
  4: "sehr nah",
  3: "nah",
  2: "grob passend",
  1: "schwach passend",
} as const;

export type TourPostalPlanRow = {
  appointment: {
    id: number;
    startDate: Date | string;
  };
  project: {
    id: number;
    name: string;
  } | null;
  customer: {
    id: number;
    fullName: string | null;
    postalCode: string | null;
  };
  tour: {
    id: number;
    name: string;
    color: string | null;
  } | null;
};

export type TourPostalPlanMatch<Row extends TourPostalPlanRow = TourPostalPlanRow> = {
  appointment: Row["appointment"];
  project: Row["project"];
  customer: Row["customer"];
  tour: NonNullable<Row["tour"]>;
  matchedPostalCode: string;
  prefixLength: 1 | 2 | 3 | 4 | 5;
};

export function normalizeTourPostalCode(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

export function isEligibleTourPostalPlanName(value: string | null | undefined): boolean {
  return /^Tour \d+$/.test(String(value ?? "").trim());
}

export function toDateOnlyString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input.slice(0, 10);

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(input: string): Date {
  return new Date(`${input}T00:00:00`);
}

function getPostalCodePrefixLength(left: string, right: string): 0 | 1 | 2 | 3 | 4 | 5 {
  const maxLength = Math.min(left.length, right.length, 5);
  let index = 0;
  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }
  return index as 0 | 1 | 2 | 3 | 4 | 5;
}

export function resolveTourPostalPlanScoreLabel(score: 1 | 2 | 3 | 4 | 5): (typeof TOUR_POSTAL_PLAN_SCORE_LABELS)[1 | 2 | 3 | 4 | 5] {
  return TOUR_POSTAL_PLAN_SCORE_LABELS[score];
}

export function buildTourPostalPlanMatches<Row extends TourPostalPlanRow>(params: {
  postalCode: string;
  rows: Row[];
}) {
  const normalizedPostalCode = normalizeTourPostalCode(params.postalCode);
  const grouped = new Map<string, {
    isoYear: number;
    isoWeek: number;
    weekStartDate: string;
    weekEndDate: string;
    tourId: number;
    tourName: string;
    tourColor: string | null;
    matches: Array<TourPostalPlanMatch<Row>>;
  }>();

  for (const row of params.rows) {
    if (!row.tour?.id) continue;
    if (!isEligibleTourPostalPlanName(row.tour.name)) continue;
    const matchedPostalCode = normalizeTourPostalCode(row.customer.postalCode);
    if (normalizedPostalCode.length === 0 || matchedPostalCode.length === 0) continue;

    const prefixLength = getPostalCodePrefixLength(normalizedPostalCode, matchedPostalCode);
    if (prefixLength === 0) continue;

    const appointmentStartDate = toDateOnlyString(row.appointment.startDate) ?? "";
    const appointmentStartDateValue = parseDateOnly(appointmentStartDate);
    const weekStartDate = toDateOnlyString(startOfWeek(appointmentStartDateValue, { weekStartsOn: 1 })) ?? appointmentStartDate;
    const weekEndDate = toDateOnlyString(endOfWeek(appointmentStartDateValue, { weekStartsOn: 1 })) ?? appointmentStartDate;
    const isoYear = getISOWeekYear(appointmentStartDateValue);
    const isoWeek = getISOWeek(appointmentStartDateValue);
    const groupKey = `${isoYear}-${String(isoWeek).padStart(2, "0")}-tour-${row.tour.id}`;
    const existing = grouped.get(groupKey) ?? {
      isoYear,
      isoWeek,
      weekStartDate,
      weekEndDate,
      tourId: row.tour.id,
      tourName: row.tour.name,
      tourColor: row.tour.color ?? null,
      matches: [],
    };
    existing.matches.push({
      appointment: row.appointment,
      project: row.project,
      customer: row.customer,
      tour: row.tour,
      matchedPostalCode,
      prefixLength: prefixLength as 1 | 2 | 3 | 4 | 5,
    });
    grouped.set(groupKey, existing);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const score = group.matches.reduce<1 | 2 | 3 | 4 | 5>((best, match) => (
        match.prefixLength > best ? match.prefixLength : best
      ), 1);
      const matchedPostalCodes = Array.from(new Set(
        group.matches
          .filter((match) => match.prefixLength === score)
          .map((match) => match.matchedPostalCode),
      )).sort();

      return {
        ...group,
        score,
        scoreLabel: resolveTourPostalPlanScoreLabel(score),
        matchedPostalCodes,
        matchedAppointmentCount: group.matches.filter((match) => match.prefixLength === score).length,
      };
    })
    .sort((a, b) => {
      if (a.weekStartDate !== b.weekStartDate) return a.weekStartDate.localeCompare(b.weekStartDate);
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedAppointmentCount !== a.matchedAppointmentCount) return b.matchedAppointmentCount - a.matchedAppointmentCount;
      return a.tourName.localeCompare(b.tourName, "de");
    });
}
