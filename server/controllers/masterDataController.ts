import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as masterDataService from "../services/masterDataService";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import { getEmployeesSeedStatus, applyEmployeesSeed, exportEmployeesSeed } from "../services/seedEmployeesService";
import { getHelpTextsSeedStatus, applyHelpTextsSeed, exportHelpTextsSeed } from "../services/seedHelpTextsService";
import {
  getProductSeedStatus,
  getComponentSeedStatus,
  applyProductManagementSeed,
  exportProductManagementSeed,
} from "../services/seedProductManagementService";
import { getProjectStatusSeedStatus, applyProjectStatusSeed, exportProjectStatusSeed } from "../services/seedProjectStatusService";
import { getNoteTemplatesSeedStatus, applyNoteTemplatesSeed, exportNoteTemplatesSeed } from "../services/seedNoteTemplatesService";
import { getTagsSeedStatus, applyTagsSeed, exportTagsSeed } from "../services/seedTagsService";

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

function isMultipartShapeError(error: unknown): boolean {
  return error instanceof Error
    && (error.message === "Missing multipart boundary" || error.message === "No file found in multipart payload");
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

export async function importProductCategoryCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
    const result = await masterDataService.importProductsForCategory(id, parsed.buffer, roleKey);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (isMultipartShapeError(error)) {
      res.status(422).json({ code: "INVALID_CSV_FORMAT" });
      return;
    }
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function getEmployeesSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    await masterDataService.assertMasterDataAdmin(roleKey);
    const result = await getEmployeesSeedStatus();
    res.json(result);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

async function handleSeedExecution(
  req: Request,
  res: Response,
  next: NextFunction,
  parseInput: () => void,
  execute: () => Promise<unknown>,
): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    await masterDataService.assertMasterDataAdmin(roleKey);
    parseInput();
    const result = await execute();
    res.json(result);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function applyEmployeesSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.employees.apply.input.parse(req.body ?? {}), applyEmployeesSeed);
}

export async function exportEmployeesSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.employees.export.input.parse(req.body ?? {}), exportEmployeesSeed);
}

export async function getHelpTextsSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => undefined, getHelpTextsSeedStatus);
}

export async function applyHelpTextsSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.helpTexts.apply.input.parse(req.body ?? {}), applyHelpTextsSeed);
}

export async function exportHelpTextsSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.helpTexts.export.input.parse(req.body ?? {}), exportHelpTextsSeed);
}

export async function getProductManagementSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => undefined, async () => ({
    ...(await getProductSeedStatus()),
    extraFiles: [await getComponentSeedStatus()],
  }));
}

export async function applyProductManagementSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.productManagement.apply.input.parse(req.body ?? {}), applyProductManagementSeed);
}

export async function exportProductManagementSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.productManagement.export.input.parse(req.body ?? {}), exportProductManagementSeed);
}

export async function getProjectStatusSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => undefined, getProjectStatusSeedStatus);
}

export async function applyProjectStatusSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.projectStatus.apply.input.parse(req.body ?? {}), applyProjectStatusSeed);
}

export async function exportProjectStatusSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.projectStatus.export.input.parse(req.body ?? {}), exportProjectStatusSeed);
}

export async function getNoteTemplatesSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => undefined, getNoteTemplatesSeedStatus);
}

export async function applyNoteTemplatesSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.noteTemplates.apply.input.parse(req.body ?? {}), applyNoteTemplatesSeed);
}

export async function exportNoteTemplatesSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.noteTemplates.export.input.parse(req.body ?? {}), exportNoteTemplatesSeed);
}

export async function getTagsSeedStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => undefined, getTagsSeedStatus);
}

export async function applyTagsSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.tags.apply.input.parse(req.body ?? {}), applyTagsSeed);
}

export async function exportTagsSeedController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await handleSeedExecution(req, res, next, () => api.masterData.seed.tags.export.input.parse(req.body ?? {}), exportTagsSeed);
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

export async function importComponentCategoryCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
    const result = await masterDataService.importComponentsForCategory(id, parsed.buffer, roleKey);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (isMultipartShapeError(error)) {
      res.status(422).json({ code: "INVALID_CSV_FORMAT" });
      return;
    }
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

export async function listComponentSpecifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const componentId = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(componentId) || componentId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const rows = await masterDataService.listComponentSpecifications(componentId, roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createComponentSpecification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const componentId = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(componentId) || componentId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentSpecifications.create.input.parse({
      ...req.body,
      componentId,
    });
    const row = await masterDataService.createComponentSpecification(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateComponentSpecification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const specificationId = parseId(req.params.specificationId);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(specificationId) || specificationId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentSpecifications.update.input.parse(req.body);
    const row = await masterDataService.updateComponentSpecification(specificationId, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteComponentSpecification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const specificationId = parseId(req.params.specificationId);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(specificationId) || specificationId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentSpecifications.delete.input.parse(req.body);
    await masterDataService.deleteComponentSpecification(specificationId, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const rows = await masterDataService.listTags(roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.tags.create.input.parse(req.body);
    const row = await masterDataService.createTag(input, roleKey);
    res.status(201).json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const input = api.masterData.tags.update.input.parse(req.body);
    const row = await masterDataService.updateTag(id, input.version, input, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const input = api.masterData.tags.delete.input.parse(req.body);
    await masterDataService.deleteTag(id, input.version, roleKey);
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listComponentProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const rows = await masterDataService.listComponentProducts(roleKey);
    res.json(rows);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function replaceComponentProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const componentId = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(componentId) || componentId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.masterData.componentProducts.replaceByComponent.input.parse(req.body);
    const row = await masterDataService.replaceComponentProducts(componentId, input.version, input.productIds, roleKey);
    res.json(row);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}
