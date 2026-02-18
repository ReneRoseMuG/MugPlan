import type { InsertTeam, Team, UpdateTeam } from "@shared/schema";
import * as teamsRepository from "../repositories/teamsRepository";

export class TeamsError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

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

export async function updateTeam(id: number, data: UpdateTeam & { version: number }): Promise<Team | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new TeamsError(422, "VALIDATION_ERROR");
  }
  const result = await teamsRepository.updateTeamWithVersion(id, data.version, data.color);
  if (result.kind === "version_conflict") {
    const exists = await teamsRepository.getTeam(id);
    if (!exists) return null;
    throw new TeamsError(409, "VERSION_CONFLICT");
  }
  return result.team;
}

export async function deleteTeam(id: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new TeamsError(422, "VALIDATION_ERROR");
  }
  const result = await teamsRepository.deleteTeamWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await teamsRepository.getTeam(id);
    if (!exists) {
      throw new TeamsError(404, "NOT_FOUND");
    }
    throw new TeamsError(409, "VERSION_CONFLICT");
  }
}
