import type { Response } from "express";
import { z } from "zod";

export function handleZodError(err: unknown, res: Response): boolean {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      message: err.errors[0].message,
      field: err.errors[0].path.join("."),
    });
    return true;
  }
  return false;
}
