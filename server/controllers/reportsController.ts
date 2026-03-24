import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { api } from "@shared/routes";
import * as reportsService from "../services/reportsService";

export async function listVorlaufliste(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const input = api.reports.vorlaufliste.list.input.parse(req.query);
    const report = await reportsService.listVorlaufliste({
      fromDate: input.fromDate,
      toDate: input.toDate,
      productCategoryIds: input.productCategoryIds,
      componentCategoryIds: input.componentCategoryIds,
      useShortCodes: input.useShortCodes,
      page: input.page,
      pageSize: input.pageSize,
    }, roleKey);

    res.json(report);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (error instanceof reportsService.ReportsError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function listProductVorlauf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const input = api.reports.productVorlauf.list.input.parse(req.query);
    const report = await reportsService.listProductVorlauf({
      fromDate: input.fromDate,
      toDate: input.toDate,
      productCategoryIds: input.productCategoryIds,
      componentCategoryIds: input.componentCategoryIds,
    }, roleKey);

    res.json(report);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (error instanceof reportsService.ReportsError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}
