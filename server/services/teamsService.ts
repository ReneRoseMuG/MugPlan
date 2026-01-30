import type { InsertTeam, Team, UpdateTeam } from "@shared/schema";
import * as teamsRepository from "../repositories/teamsRepository";

export async function listTeams(): Promise<Team[]> {
  return teamsRepository.getTeams();
}

function buildNextTeamName(existing: Team[]): string {
  const nextNumber = existing.length + 1;
  let name = `Team ${nextNumber}`;
  const existingNames = new Set(existing.map((team) => team.name));
  while (existingNames.has(name)) {
    const num = parseInt(name.split(" ")[1], 10) + 1;
    name = `Team ${num}`;
  }
  return name;
}

export async function createTeam(data: InsertTeam): Promise<Team> {
  const existing = await teamsRepository.getTeams();
  const name = buildNextTeamName(existing);
  return teamsRepository.createTeam(name, data.color);
}

export async function updateTeam(id: number, data: UpdateTeam): Promise<Team | null> {
  return teamsRepository.updateTeam(id, data.color);
}

export async function deleteTeam(id: number): Promise<void> {
  await teamsRepository.deleteTeam(id);
}
