import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as teamsService from "../services/teamsService";

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
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.teams.update.input.parse(req.body);
    const team = await teamsService.updateTeam(Number(req.params.id), input);
    if (!team) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(team);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof teamsService.TeamsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.teams.delete.input.parse(req.body);
    await teamsService.deleteTeam(Number(req.params.id), input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof teamsService.TeamsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
