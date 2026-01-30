import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as teamsService from "../services/teamsService";
import { handleZodError } from "./validation";

export async function listTeams(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await teamsService.listTeams();
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.teams.create.input.parse(req.body);
    const team = await teamsService.createTeam(input);
    res.status(201).json(team);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.teams.update.input.parse(req.body);
    const team = await teamsService.updateTeam(Number(req.params.id), input);
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }
    res.json(team);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await teamsService.deleteTeam(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
