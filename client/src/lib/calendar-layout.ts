export const DEFAULT_WEEKEND_COLUMN_PERCENT = 33;

export function normalizeWeekendColumnPercent(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
    return value;
  }
  return DEFAULT_WEEKEND_COLUMN_PERCENT;
}

export function getDayWeights(weekendColumnPercent: number): number[] {
  const weekendWeight = weekendColumnPercent / 100;
  return [1, 1, 1, 1, 1, weekendWeight, weekendWeight];
}

export function buildDayGridTemplate(dayWeights: number[]): string {
  return dayWeights.map((weight) => `${weight}fr`).join(" ");
}

export function sumWeights(dayWeights: number[], startIndex: number, endIndexExclusive: number): number {
  let total = 0;
  for (let i = startIndex; i < endIndexExclusive; i += 1) {
    total += dayWeights[i] ?? 0;
  }
  return total;
}
