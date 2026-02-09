import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { handleZodError } from "./validation";
import * as adminService from "../services/adminService";

const REQUIRED_CONFIRM_PHRASE = "RESET";

function createBadRequest(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
}

export async function resetDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.admin.resetDatabase.input.parse(req.body);

    if (!input.confirmed) {
      throw createBadRequest("Reset requires confirmed=true");
    }
    if (input.confirmPhrase !== REQUIRED_CONFIRM_PHRASE) {
      throw createBadRequest("Invalid confirmation phrase");
    }

    const result = await adminService.resetDatabase();
    res.json(result);
  } catch (error) {
    if (handleZodError(error, res)) return;
    next(error);
  }
}
