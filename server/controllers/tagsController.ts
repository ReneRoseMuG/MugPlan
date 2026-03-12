import type { NextFunction, Request, Response } from "express";
import * as tagRelationsService from "../services/tagRelationsService";

export async function listTagCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tags = await tagRelationsService.listTagCatalog();
    res.json(tags);
  } catch (err) {
    next(err);
  }
}
