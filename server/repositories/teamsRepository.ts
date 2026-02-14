import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { teams, type Team } from "@shared/schema";

export async function getTeams(): Promise<Team[]> {
  return db.select().from(teams).orderBy(teams.id);
}

export async function getTeam(id: number): Promise<Team | null> {
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return team || null;
}

export async function createTeam(name: string, color: string): Promise<Team> {
  const result = await db.insert(teams).values({ name, color });
  const insertId = (result as any)[0].insertId;
  const [team] = await db.select().from(teams).where(eq(teams.id, insertId));
  return team;
}

export async function updateTeamWithVersion(
  id: number,
  expectedVersion: number,
  color: string,
): Promise<{ kind: "updated"; team: Team } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update teams
    set
      color = ${color},
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };

  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return { kind: "updated", team };
}

export async function deleteTeamWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from teams
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}
