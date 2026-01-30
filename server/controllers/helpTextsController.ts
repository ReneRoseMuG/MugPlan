import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as helpTextsService from "../services/helpTextsService";
import { handleZodError } from "./validation";

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
      res.status(409).json({ message: result.error });
      return;
    }
    res.status(201).json(result.helpText);
  } catch (err) {
    if (handleZodError(err, res)) return;
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
        res.status(404).json({ message: result.error });
        return;
      }
      res.status(409).json({ message: result.error });
      return;
    }
    res.json(result.helpText);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function toggleHelpTextActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.helpTexts.toggleActive.input.parse(req.body);
    const helpText = await helpTextsService.toggleHelpTextActive(id, input.isActive);
    if (!helpText) {
      res.status(404).json({ message: "Hilfetext nicht gefunden" });
      return;
    }
    res.json(helpText);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteHelpText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const existing = await helpTextsService.getHelpTextById(id);
    if (!existing) {
      res.status(404).json({ message: "Hilfetext nicht gefunden" });
      return;
    }
    await helpTextsService.deleteHelpText(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
