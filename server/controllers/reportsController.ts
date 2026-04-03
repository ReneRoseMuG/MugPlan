import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { api } from "@shared/routes";
import * as reportsService from "../services/reportsService";

function setNoStoreHeaders(res: Response) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

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
      useShortCodes: input.useShortCodes,
      page: input.page,
      pageSize: input.pageSize,
    }, roleKey);

    setNoStoreHeaders(res);
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

export async function getVorlauflistePrintPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const input = api.reports.vorlaufliste.printPreview.input.parse(req.query);
    const report = await reportsService.getVorlauflistePrintPreview({
      fromDate: input.fromDate,
      toDate: input.toDate,
      useShortCodes: input.useShortCodes,
    }, roleKey);

    setNoStoreHeaders(res);
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

export async function listProduktionsplanung(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const input = api.reports.produktionsplanung.list.input.parse(req.query);
    const report = await reportsService.listProduktionsplanung({
      fromDate: input.fromDate,
      toDate: input.toDate,
      productCategoryIds: input.productCategoryIds,
      componentCategoryIds: input.componentCategoryIds,
      useShortCodes: input.useShortCodes,
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
