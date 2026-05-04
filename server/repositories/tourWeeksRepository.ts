import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { tourWeeks } from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = DbTx | typeof db;

export type TourWeekRow = {
  id: number;
  tourId: number;
  isoYear: number;
  isoWeek: number;
  isBlocked: boolean;
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

function mapTourWeekRow(row: typeof tourWeeks.$inferSelect): TourWeekRow {
  return {
    id: Number(row.id),
    tourId: Number(row.tourId),
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    isBlocked: Boolean(row.isBlocked),
  };
}

export async function withTourWeeksTransaction<T>(handler: (tx: DbTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => handler(tx));
}

async function getWeekByTourAndWeekWithDb(
  database: DbLike,
  tourId: number,
  isoYear: number,
  isoWeek: number,
): Promise<TourWeekRow | null> {
  const [row] = await database
    .select()
    .from(tourWeeks)
    .where(and(
      eq(tourWeeks.tourId, tourId),
      eq(tourWeeks.isoYear, isoYear),
      eq(tourWeeks.isoWeek, isoWeek),
    ))
    .limit(1);

  return row ? mapTourWeekRow(row) : null;
}

export async function getWeekByTourAndWeek(
  tourId: number,
  isoYear: number,
  isoWeek: number,
): Promise<TourWeekRow | null> {
  return getWeekByTourAndWeekWithDb(db, tourId, isoYear, isoWeek);
}

export async function getWeekByTourAndWeekTx(
  tx: DbTx,
  tourId: number,
  isoYear: number,
  isoWeek: number,
): Promise<TourWeekRow | null> {
  return getWeekByTourAndWeekWithDb(tx, tourId, isoYear, isoWeek);
}

export async function listWeeksByTour(tourId: number): Promise<TourWeekRow[]> {
  const rows = await db
    .select()
    .from(tourWeeks)
    .where(eq(tourWeeks.tourId, tourId))
    .orderBy(asc(tourWeeks.isoYear), asc(tourWeeks.isoWeek), asc(tourWeeks.id));

  return rows.map(mapTourWeekRow);
}

export async function listWeeksByTourIds(tourIds: number[]): Promise<TourWeekRow[]> {
  const normalizedTourIds = Array.from(new Set(tourIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (normalizedTourIds.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(tourWeeks)
    .where(inArray(tourWeeks.tourId, normalizedTourIds))
    .orderBy(asc(tourWeeks.tourId), asc(tourWeeks.isoYear), asc(tourWeeks.isoWeek), asc(tourWeeks.id));

  return rows.map(mapTourWeekRow);
}

export async function listBlockedWeeks(): Promise<TourWeekRow[]> {
  const rows = await db
    .select()
    .from(tourWeeks)
    .where(eq(tourWeeks.isBlocked, true))
    .orderBy(asc(tourWeeks.tourId), asc(tourWeeks.isoYear), asc(tourWeeks.isoWeek), asc(tourWeeks.id));

  return rows.map(mapTourWeekRow);
}

export async function listBlockedWeeksByTourIds(tourIds: number[]): Promise<TourWeekRow[]> {
  const normalizedTourIds = Array.from(new Set(tourIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (normalizedTourIds.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(tourWeeks)
    .where(and(
      inArray(tourWeeks.tourId, normalizedTourIds),
      eq(tourWeeks.isBlocked, true),
    ))
    .orderBy(asc(tourWeeks.tourId), asc(tourWeeks.isoYear), asc(tourWeeks.isoWeek), asc(tourWeeks.id));

  return rows.map(mapTourWeekRow);
}

export async function createWeekTx(
  tx: DbTx,
  params: {
    tourId: number;
    isoYear: number;
    isoWeek: number;
    isBlocked?: boolean;
  },
): Promise<TourWeekRow> {
  const result = await tx.insert(tourWeeks).values({
    tourId: params.tourId,
    isoYear: params.isoYear,
    isoWeek: params.isoWeek,
    isBlocked: params.isBlocked ?? false,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
  const [row] = await tx.select().from(tourWeeks).where(eq(tourWeeks.id, insertId)).limit(1);
  if (!row) {
    throw new Error("Tour week could not be read back after insert");
  }

  return mapTourWeekRow(row);
}

export async function getOrCreateWeekTx(
  tx: DbTx,
  params: {
    tourId: number;
    isoYear: number;
    isoWeek: number;
    isBlocked?: boolean;
  },
): Promise<TourWeekRow> {
  const existing = await getWeekByTourAndWeekTx(tx, params.tourId, params.isoYear, params.isoWeek);
  if (existing) {
    return existing;
  }

  try {
    return await createWeekTx(tx, params);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const duplicate = await getWeekByTourAndWeekTx(tx, params.tourId, params.isoYear, params.isoWeek);
  if (!duplicate) {
    throw new Error("Tour week duplicate insert could not be resolved");
  }
  return duplicate;
}

export async function updateWeekBlockedTx(
  tx: DbTx,
  params: {
    tourId: number;
    isoYear: number;
    isoWeek: number;
    isBlocked: boolean;
  },
): Promise<TourWeekRow | null> {
  await tx
    .update(tourWeeks)
    .set({ isBlocked: params.isBlocked })
    .where(and(
      eq(tourWeeks.tourId, params.tourId),
      eq(tourWeeks.isoYear, params.isoYear),
      eq(tourWeeks.isoWeek, params.isoWeek),
    ));

  return getWeekByTourAndWeekTx(tx, params.tourId, params.isoYear, params.isoWeek);
}
