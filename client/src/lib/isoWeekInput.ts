export function sanitizeIsoWeekInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 3);
}

export function parseIsoWeekNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || Number.isNaN(value)) {
    return undefined;
  }
  if (value < 1 || value > 53) {
    return undefined;
  }
  return value;
}

export function normalizeIsoWeekNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || Number.isNaN(value)) {
    return undefined;
  }
  if (value < 1) {
    return undefined;
  }
  return Math.min(53, value);
}

export function parseIsoWeekInput(value: string): number | undefined {
  const sanitizedValue = sanitizeIsoWeekInput(value);
  if (sanitizedValue.length === 0) {
    return undefined;
  }
  return parseIsoWeekNumber(Number.parseInt(sanitizedValue, 10));
}

export function stepIsoWeekValue(currentValue: number | string | undefined, delta: number): number {
  const normalizedCurrentValue = typeof currentValue === "number"
    ? parseIsoWeekNumber(currentValue)
    : parseIsoWeekInput(currentValue ?? "");
  const baseValue = normalizedCurrentValue ?? 1;
  return Math.min(53, Math.max(1, baseValue + delta));
}
