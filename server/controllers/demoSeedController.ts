import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { handleZodError } from "./validation";
import * as demoSeedService from "../services/demoSeedService";

export async function createDemoSeedRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.demoSeed.createRun.input.parse(req.body);
    const summary = await demoSeedService.createSeedRun(input);
    res.status(201).json(summary);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function listDemoSeedRuns(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const runs = await demoSeedService.listSeedRuns();
    res.json(runs);
  } catch (err) {
    next(err);
  }
}

export async function purgeDemoSeedRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const seedRunId = String(req.params.seedRunId);
    const summary = await demoSeedService.purgeSeedRun(seedRunId);
    res.json(summary);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 409) {
      const message = (err as { message?: string })?.message ?? "Konflikt";
      const dependentRunIds = (err as { dependentRunIds?: string[] })?.dependentRunIds ?? [];
      res.status(409).json({ message, dependentRunIds });
      return;
    }
    next(err);
  }
}
