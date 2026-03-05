import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as masterDataService from "../services/masterDataService";

function parseId(value: string | string[]): number {
  if (Array.isArray(value)) {
    return Number(value[0]);
  }
  return Number(value);
}

function ensureRoleKey(req: Request): "LESER" | "DISPONENT" | "ADMIN" | null {
  return req.userContext?.roleKey ?? null;
}

function handleServiceError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }
  if (masterDataService.isMasterDataError(error)) {
    res.status(error.status).json({ code: error.code });
    return true;
  }
  return false;
}

export async function listProductCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.productCategories.list.input.parse(req.query);
    const rows = await masterDataService.listProductCategories(input.active, roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createProductCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.productCategories.create.input.parse(req.body);
    const row = await masterDataService.createProductCategory(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateProductCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.productCategories.update.input.parse(req.body);
    const row = await masterDataService.updateProductCategory(id, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteProductCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.productCategories.delete.input.parse(req.body);
    await masterDataService.deleteProductCategory(id, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listComponentCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentCategories.list.input.parse(req.query);
    const rows = await masterDataService.listComponentCategories(input.active, roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createComponentCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentCategories.create.input.parse(req.body);
    const row = await masterDataService.createComponentCategory(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateComponentCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentCategories.update.input.parse(req.body);
    const row = await masterDataService.updateComponentCategory(id, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteComponentCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentCategories.delete.input.parse(req.body);
    await masterDataService.deleteComponentCategory(id, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.products.list.input.parse(req.query);
    const rows = await masterDataService.listProducts(input.active, roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.products.create.input.parse(req.body);
    const row = await masterDataService.createProduct(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.products.update.input.parse(req.body);
    const row = await masterDataService.updateProduct(id, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.products.delete.input.parse(req.body);
    await masterDataService.deleteProduct(id, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listComponents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.components.list.input.parse(req.query);
    const rows = await masterDataService.listComponents(input.active, roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.components.create.input.parse(req.body);
    const row = await masterDataService.createComponent(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.components.update.input.parse(req.body);
    const row = await masterDataService.updateComponent(id, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.components.delete.input.parse(req.body);
    await masterDataService.deleteComponent(id, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}
