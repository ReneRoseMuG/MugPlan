import crypto from "crypto";
import Holidays, { type HolidaysTypes } from "date-holidays";
import {
  type CalendarMarker,
  type CalendarMarkerUpdateInput,
  type CalendarMarkerWriteInput,
  type GermanStateCode,
} from "@shared/routes";
import type { CanonicalRoleKey } from "../settings/registry";
import {
  CalendarMarkersRepositoryIOError,
  CalendarMarkersRepositoryValidationError,
  readStoredCalendarMarkers,
  writeStoredCalendarMarkers,
} from "../repositories/calendarMarkersRepository";
import { logWarn } from "../lib/logger";

type CalendarMarkersErrorCode =
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "STORAGE_NOT_WRITABLE";

export class CalendarMarkersError extends Error {
  status: number;
  code: CalendarMarkersErrorCode;

  constructor(status: number, code: CalendarMarkersErrorCode, message: string = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const germanStates: GermanStateCode[] = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
];

const partialRegionalHolidayNames = new Set([
  "Augsburger Friedensfest",
  "Mariä Himmelfahrt",
]);

function assertReadRole(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT" && roleKey !== "LESER") {
    throw new CalendarMarkersError(403, "FORBIDDEN");
  }
}

function assertAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new CalendarMarkersError(403, "FORBIDDEN");
  }
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Ungültiges Datum.");
  }
  return parsed;
}

function overlapsRange(marker: CalendarMarker, fromDate: string, toDate: string): boolean {
  const markerEndDate = marker.endDate ?? marker.date;
  return marker.date <= toDate && markerEndDate >= fromDate;
}

function normalizeMarkerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function sortMarkers(markers: CalendarMarker[]): CalendarMarker[] {
  return [...markers].sort((left, right) =>
    left.date.localeCompare(right.date)
    || (left.endDate ?? "").localeCompare(right.endDate ?? "")
    || left.type.localeCompare(right.type)
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id),
  );
}

function validateRange(fromDate: string, toDate: string): void {
  parseDateOnly(fromDate);
  parseDateOnly(toDate);
  if (fromDate > toDate) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Der Datumsbereich ist ungültig.");
  }
}

function validateMarkerInput(input: CalendarMarkerWriteInput): void {
  parseDateOnly(input.date);
  if (input.endDate) {
    parseDateOnly(input.endDate);
    if (input.endDate < input.date) {
      throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Das Enddatum liegt vor dem Startdatum.");
    }
  }

  if (input.source === "automatic" && input.type !== "public_holiday") {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Automatische Overrides sind nur für Feiertage erlaubt.");
  }
  if (input.source === "admin" && input.type === "public_holiday") {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Manuelle Einträge müssen Betriebsfeiertage oder Betriebsferien sein.");
  }
  if (input.type !== "company_vacation" && input.endDate) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Nur Betriebsferien dürfen einen Zeitraum haben.");
  }
  if (input.type === "company_vacation" && !input.endDate) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Betriebsferien benötigen ein Enddatum.");
  }
  if (input.scope === "company" && input.states.length > 0) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Firmenmarker dürfen keine Bundesländer tragen.");
  }
  if (input.scope !== "company" && input.source !== "automatic") {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR", "Regionale oder bundesweite Marker sind automatische Overrides.");
  }
}

function toStoredMarker(input: CalendarMarkerWriteInput): CalendarMarker {
  validateMarkerInput(input);
  return {
    id: `${input.source === "automatic" ? "override" : "admin"}:${crypto.randomUUID()}`,
    date: input.date,
    endDate: input.endDate ?? null,
    name: normalizeMarkerName(input.name),
    type: input.type,
    source: input.source,
    scope: input.scope,
    states: [...input.states].sort(),
    active: input.active,
    note: input.note?.trim() ? input.note.trim() : null,
    version: 1,
  };
}

function toUpdatedMarker(existing: CalendarMarker, input: CalendarMarkerUpdateInput): CalendarMarker {
  validateMarkerInput(input);
  return {
    ...existing,
    date: input.date,
    endDate: input.endDate ?? null,
    name: normalizeMarkerName(input.name),
    type: input.type,
    source: input.source,
    scope: input.scope,
    states: [...input.states].sort(),
    active: input.active,
    note: input.note?.trim() ? input.note.trim() : null,
    version: existing.version + 1,
  };
}

function getYearsInRange(fromDate: string, toDate: string): number[] {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  const years: number[] = [];
  for (let year = from.getFullYear(); year <= to.getFullYear(); year += 1) {
    years.push(year);
  }
  return years;
}

function toDateOnlyFromHoliday(holiday: HolidaysTypes.Holiday): string {
  return holiday.date.slice(0, 10);
}

function buildAutomaticHolidayMarkers(fromDate: string, toDate: string): CalendarMarker[] {
  const markers: CalendarMarker[] = [];
  for (const year of getYearsInRange(fromDate, toDate)) {
    const nationalHolidays = new Holidays("DE", {
      languages: ["de"],
      timezone: "Europe/Berlin",
      types: ["public"],
    }).getHolidays(year, "de").filter((holiday) => holiday.type === "public");

    const nationalKeys = new Set<string>();
    for (const holiday of nationalHolidays) {
      const date = toDateOnlyFromHoliday(holiday);
      const key = `${date}:${holiday.name}`;
      nationalKeys.add(key);
      markers.push({
        id: `auto:${date}:national:${holiday.name}`,
        date,
        endDate: null,
        name: holiday.name,
        type: "public_holiday",
        source: "automatic",
        scope: "national",
        states: [],
        active: true,
        note: null,
        version: 1,
      });
    }

    const regionalStatesByKey = new Map<string, GermanStateCode[]>();
    for (const state of germanStates) {
      const stateHolidays = new Holidays("DE", state, {
        languages: ["de"],
        timezone: "Europe/Berlin",
        types: ["public"],
      }).getHolidays(year, "de").filter((holiday) => holiday.type === "public");

      for (const holiday of stateHolidays) {
        const date = toDateOnlyFromHoliday(holiday);
        const key = `${date}:${holiday.name}`;
        if (nationalKeys.has(key) || partialRegionalHolidayNames.has(holiday.name)) {
          continue;
        }
        const states = regionalStatesByKey.get(key) ?? [];
        states.push(state);
        regionalStatesByKey.set(key, states);
      }
    }

    for (const [key, states] of Array.from(regionalStatesByKey.entries())) {
      const [date, name] = key.split(":");
      const sortedStates = Array.from(new Set(states)).sort() as GermanStateCode[];
      markers.push({
        id: `auto:${date}:regional:${name}:${sortedStates.join("-")}`,
        date,
        endDate: null,
        name,
        type: "public_holiday",
        source: "automatic",
        scope: "regional",
        states: sortedStates,
        active: true,
        note: null,
        version: 1,
      });
    }
  }

  return markers.filter((marker) => overlapsRange(marker, fromDate, toDate));
}

function automaticOverrideMatches(override: CalendarMarker, marker: CalendarMarker): boolean {
  if (override.source !== "automatic" || marker.source !== "automatic") {
    return false;
  }
  if (override.date !== marker.date || override.type !== marker.type) {
    return false;
  }
  if (override.name.trim().length > 0 && override.name !== marker.name) {
    return false;
  }
  if (override.scope !== marker.scope) {
    return false;
  }
  if (override.states.length === 0) {
    return true;
  }
  return override.states.join("|") === marker.states.join("|");
}

function applyStoredMarkers(automaticMarkers: CalendarMarker[], storedMarkers: CalendarMarker[]): CalendarMarker[] {
  const automaticOverrides = storedMarkers.filter((marker) => marker.source === "automatic");
  const effectiveAutomatic = automaticMarkers.flatMap((marker) => {
    const override = automaticOverrides.find((candidate) => automaticOverrideMatches(candidate, marker));
    if (!override) {
      return [marker];
    }
    if (!override.active) {
      return [];
    }
    return [{
      ...marker,
      name: override.name || marker.name,
      note: override.note,
      active: true,
      version: override.version,
    }];
  });

  const adminMarkers = storedMarkers.filter((marker) => marker.source === "admin" && marker.active);
  const deduped = new Map<string, CalendarMarker>();
  for (const marker of [...effectiveAutomatic, ...adminMarkers]) {
    const key = [
      marker.date,
      marker.endDate ?? "",
      marker.name,
      marker.type,
      marker.scope,
      marker.states.join("|"),
    ].join("::");
    if (!deduped.has(key)) {
      deduped.set(key, marker);
    }
  }
  return sortMarkers(Array.from(deduped.values()));
}

async function readStoredMarkersForCalendar(): Promise<CalendarMarker[]> {
  try {
    return await readStoredCalendarMarkers();
  } catch (error) {
    if (error instanceof CalendarMarkersRepositoryValidationError) {
      logWarn("[calendar-markers] gespeicherte Marker sind ungültig und werden für die Kalenderanzeige ignoriert");
      return [];
    }
    throw error;
  }
}

function mapStorageError(error: unknown): never {
  if (error instanceof CalendarMarkersRepositoryIOError) {
    throw new CalendarMarkersError(503, "STORAGE_NOT_WRITABLE");
  }
  if (error instanceof CalendarMarkersRepositoryValidationError) {
    throw new CalendarMarkersError(422, "VALIDATION_ERROR");
  }
  throw error;
}

export async function listEffectiveCalendarMarkers(
  roleKey: CanonicalRoleKey,
  input: { fromDate: string; toDate: string },
): Promise<CalendarMarker[]> {
  assertReadRole(roleKey);
  validateRange(input.fromDate, input.toDate);
  const automaticMarkers = buildAutomaticHolidayMarkers(input.fromDate, input.toDate);
  const storedMarkers = await readStoredMarkersForCalendar();
  return applyStoredMarkers(
    automaticMarkers,
    storedMarkers.filter((marker) => overlapsRange(marker, input.fromDate, input.toDate)),
  );
}

export async function listAdminCalendarMarkers(roleKey: CanonicalRoleKey): Promise<CalendarMarker[]> {
  assertAdmin(roleKey);
  try {
    return sortMarkers(await readStoredCalendarMarkers());
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function createCalendarMarker(
  roleKey: CanonicalRoleKey,
  input: CalendarMarkerWriteInput,
): Promise<CalendarMarker> {
  assertAdmin(roleKey);
  const marker = toStoredMarker(input);
  try {
    const markers = await readStoredCalendarMarkers();
    await writeStoredCalendarMarkers(sortMarkers([...markers, marker]));
    return marker;
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function updateCalendarMarker(
  roleKey: CanonicalRoleKey,
  markerId: string,
  input: CalendarMarkerUpdateInput,
): Promise<CalendarMarker> {
  assertAdmin(roleKey);
  try {
    const markers = await readStoredCalendarMarkers();
    const markerIndex = markers.findIndex((marker) => marker.id === markerId);
    if (markerIndex === -1) {
      throw new CalendarMarkersError(404, "NOT_FOUND");
    }
    const existing = markers[markerIndex];
    if (existing.version !== input.version) {
      throw new CalendarMarkersError(409, "VERSION_CONFLICT");
    }
    const updated = toUpdatedMarker(existing, input);
    const nextMarkers = [...markers];
    nextMarkers[markerIndex] = updated;
    await writeStoredCalendarMarkers(sortMarkers(nextMarkers));
    return updated;
  } catch (error) {
    if (error instanceof CalendarMarkersError) {
      throw error;
    }
    return mapStorageError(error);
  }
}

export async function deleteCalendarMarker(
  roleKey: CanonicalRoleKey,
  markerId: string,
  version: number,
): Promise<void> {
  assertAdmin(roleKey);
  try {
    const markers = await readStoredCalendarMarkers();
    const marker = markers.find((candidate) => candidate.id === markerId);
    if (!marker) {
      throw new CalendarMarkersError(404, "NOT_FOUND");
    }
    if (marker.version !== version) {
      throw new CalendarMarkersError(409, "VERSION_CONFLICT");
    }
    await writeStoredCalendarMarkers(markers.filter((candidate) => candidate.id !== markerId));
  } catch (error) {
    if (error instanceof CalendarMarkersError) {
      throw error;
    }
    return mapStorageError(error);
  }
}
