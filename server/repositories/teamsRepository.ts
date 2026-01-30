import { eq } from "drizzle-orm";
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

export async function updateTeam(id: number, color: string): Promise<Team | null> {
  await db.update(teams).set({ color }).where(eq(teams.id, id));
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return team || null;
}

export async function deleteTeam(id: number): Promise<void> {
  await db.delete(teams).where(eq(teams.id, id));
}
