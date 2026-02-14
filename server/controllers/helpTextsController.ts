import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as helpTextsService from "../services/helpTextsService";

export async function getHelpTextByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const helpKey = req.params.helpKey as string;
    const helpText = await helpTextsService.getHelpTextByKey(helpKey);
    if (!helpText) {
      res.json(null);
      return;
    }
    res.json({
      helpKey: helpText.helpKey,
      title: helpText.title,
      body: helpText.body,
    });
  } catch (err) {
    next(err);
  }
}

export async function listHelpTexts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query.query as string | undefined;
    const helpTexts = await helpTextsService.listHelpTexts(query);
    res.json(helpTexts);
  } catch (err) {
    next(err);
  }
}

export async function getHelpTextById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const helpText = await helpTextsService.getHelpTextById(id);
    if (!helpText) {
      res.status(404).json({ message: "Hilfetext nicht gefunden" });
      return;
    }
    res.json(helpText);
  } catch (err) {
    next(err);
  }
}

export async function createHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.helpTexts.create.input.parse(req.body);
    const result = await helpTextsService.createHelpText(input);
    if (result.error) {
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
    res.status(201).json(result.helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.helpTexts.update.input.parse(req.body);
    const result = await helpTextsService.updateHelpText(id, input);
    if (result.error) {
      if (result.error === "Hilfetext nicht gefunden") {
        res.status(404).json({ code: "NOT_FOUND" });
        return;
      }
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
    res.json(result.helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function toggleHelpTextActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.helpTexts.toggleActive.input.parse(req.body);
    const helpText = await helpTextsService.toggleHelpTextActive(id, input.isActive, input.version);
    if (!helpText) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(helpText);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.helpTexts.delete.input.parse(req.body);
    const id = Number(req.params.id);
    const existing = await helpTextsService.getHelpTextById(id);
    if (!existing) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await helpTextsService.deleteHelpText(id, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof helpTextsService.HelpTextsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
