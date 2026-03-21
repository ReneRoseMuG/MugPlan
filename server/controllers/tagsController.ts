import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import * as tagRelationsService from "../services/tagRelationsService";

export async function listTagCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { domain } = api.tags.list.input.parse(req.query);
    const tags = await tagRelationsService.listTagCatalog(domain);
    res.json(tags);
  } catch (err) {
    next(err);
  }
}
