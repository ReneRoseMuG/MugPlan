import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as masterDataService from "../services/masterDataService";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { buildCreateMessage, buildDeleteMessage, buildUpdateMessage } from "../lib/journalMessages";
import { parseMultipartFile } from "../lib/multipart";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";

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
    res.status(error.status).json({
      code: error.code,
      ...(error.details ?? {}),
    });
    return true;
  }
  return false;
}

function isMultipartShapeError(error: unknown): boolean {
  return error instanceof Error
    && (error.message === "Missing multipart boundary" || error.message === "No file found in multipart payload");
}

async function recordMasterDataJournal(
  req: Request,
  params: {
    tableName: string;
    recordId: number;
    op: "create" | "update" | "delete";
    before?: unknown;
    after?: unknown;
    triggerKey: string;
    contexts?: journalService.JournalContextInput[];
  },
): Promise<void> {
  const snapshot = params.after ?? params.before ?? null;
  const messageText = params.op === "create"
    ? buildCreateMessage(params.tableName, snapshot, params.recordId)
    : params.op === "delete"
      ? buildDeleteMessage(params.tableName, snapshot, params.recordId)
      : buildUpdateMessage(params.tableName, snapshot, params.recordId);

  await journalService.recordJournalEntry({
    tableName: params.tableName,
    recordId: params.recordId,
    op: params.op,
    oldValue: params.before ?? null,
    newValue: params.after ?? null,
    snapshot,
    actor: getRequestActor(req),
    triggerKey: params.triggerKey,
    messageText,
    contexts: params.contexts ?? [],
  });
}

export async function listProductCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.productCategories.create.input.parse(req.body);
    const row = await masterDataService.createProductCategory(input, roleKey);
    await recordMasterDataJournal(req, {
      tableName: "product_category",
      recordId: row.id,
      op: "create",
      after: row,
      triggerKey: "master_data.product_category.create",
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.productCategories.update.input.parse(req.body);
    const previousRow = await masterDataService.getProductCategoryById(id, roleKey);
    const row = await masterDataService.updateProductCategory(id, input.version, input, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "product_category",
        recordId: row.id,
        op: "update",
        before: previousRow,
        after: row,
        triggerKey: "master_data.product_category.update",
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.productCategories.delete.input.parse(req.body);
    const previousRow = await masterDataService.getProductCategoryById(id, roleKey);
    await masterDataService.deleteProductCategory(id, input.version, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "product_category",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.product_category.delete",
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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


export async function listComponentCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.componentCategories.create.input.parse(req.body);
    const row = await masterDataService.createComponentCategory(input, roleKey);
    await recordMasterDataJournal(req, {
      tableName: "component_category",
      recordId: row.id,
      op: "create",
      after: row,
      triggerKey: "master_data.component_category.create",
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.componentCategories.update.input.parse(req.body);
    const previousRow = await masterDataService.getComponentCategoryById(id, roleKey);
    const row = await masterDataService.updateComponentCategory(id, input.version, input, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "component_category",
        recordId: row.id,
        op: "update",
        before: previousRow,
        after: row,
        triggerKey: "master_data.component_category.update",
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.componentCategories.delete.input.parse(req.body);
    const previousRow = await masterDataService.getComponentCategoryById(id, roleKey);
    await masterDataService.deleteComponentCategory(id, input.version, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "component_category",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.component_category.delete",
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.products.create.input.parse(req.body);
    const row = await masterDataService.createProduct(input, roleKey);
    await recordMasterDataJournal(req, {
      tableName: "product",
      recordId: row.id,
      op: "create",
      after: row,
      triggerKey: "master_data.product.create",
      contexts: row.categoryId != null
        ? [{ tableName: "product_category", recordId: row.categoryId, relationRole: "category" }]
        : [],
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.products.update.input.parse(req.body);
    const previousRow = await masterDataService.getProductById(id, roleKey);
    const row = await masterDataService.updateProduct(id, input.version, input, roleKey);
    if (previousRow) {
      const contexts: journalService.JournalContextInput[] = [];
      if (previousRow.categoryId != null) {
        contexts.push({ tableName: "product_category", recordId: previousRow.categoryId, relationRole: "previous_category" });
      }
      if (row.categoryId != null && row.categoryId !== previousRow.categoryId) {
        contexts.push({ tableName: "product_category", recordId: row.categoryId, relationRole: "category" });
      } else if (row.categoryId != null) {
        contexts.push({ tableName: "product_category", recordId: row.categoryId, relationRole: "category" });
      }
      await recordMasterDataJournal(req, {
        tableName: "product",
        recordId: row.id,
        op: "update",
        before: previousRow,
        after: row,
        triggerKey: "master_data.product.update",
        contexts,
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.products.delete.input.parse(req.body);
    const previousRow = await masterDataService.getProductById(id, roleKey);
    await masterDataService.deleteProduct(id, input.version, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "product",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.product.delete",
        contexts: previousRow.categoryId != null
          ? [{ tableName: "product_category", recordId: previousRow.categoryId, relationRole: "category" }]
          : [],
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.components.create.input.parse(req.body);
    const row = await masterDataService.createComponent(input, roleKey);
    await recordMasterDataJournal(req, {
      tableName: "component",
      recordId: row.id,
      op: "create",
      after: row,
      triggerKey: "master_data.component.create",
      contexts: row.categoryId != null
        ? [{ tableName: "component_category", recordId: row.categoryId, relationRole: "category" }]
        : [],
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.components.update.input.parse(req.body);
    const previousRow = await masterDataService.getComponentById(id, roleKey);
    const row = await masterDataService.updateComponent(id, input.version, input, roleKey);
    if (previousRow) {
      const contexts: journalService.JournalContextInput[] = [];
      if (previousRow.categoryId != null) {
        contexts.push({ tableName: "component_category", recordId: previousRow.categoryId, relationRole: "previous_category" });
      }
      if (row.categoryId != null && row.categoryId !== previousRow.categoryId) {
        contexts.push({ tableName: "component_category", recordId: row.categoryId, relationRole: "category" });
      } else if (row.categoryId != null) {
        contexts.push({ tableName: "component_category", recordId: row.categoryId, relationRole: "category" });
      }
      await recordMasterDataJournal(req, {
        tableName: "component",
        recordId: row.id,
        op: "update",
        before: previousRow,
        after: row,
        triggerKey: "master_data.component.update",
        contexts,
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.components.delete.input.parse(req.body);
    const previousRow = await masterDataService.getComponentById(id, roleKey);
    await masterDataService.deleteComponent(id, input.version, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "component",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.component.delete",
        contexts: previousRow.categoryId != null
          ? [{ tableName: "component_category", recordId: previousRow.categoryId, relationRole: "category" }]
          : [],
      });
    }
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoryId = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const previousRows = await masterDataService.listProductsByCategoryId(categoryId, roleKey);
    const result = await masterDataService.deleteProductsByCategory(categoryId, roleKey);
    const remainingRows = await masterDataService.listProductsByCategoryId(categoryId, roleKey);
    const remainingIds = new Set(remainingRows.map((item) => item.id));
    for (const previousRow of previousRows) {
      if (remainingIds.has(previousRow.id)) continue;
      await recordMasterDataJournal(req, {
        tableName: "product",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.product.bulk_delete",
        contexts: [{ tableName: "product_category", recordId: categoryId, relationRole: "category" }],
      });
    }
    res.json(result);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function deleteComponentsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoryId = parseId(req.params.id);
    const roleKey = ensureRoleKey(req);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const previousRows = await masterDataService.listComponentsByCategoryId(categoryId, roleKey);
    const result = await masterDataService.deleteComponentsByCategory(categoryId, roleKey);
    const remainingRows = await masterDataService.listComponentsByCategoryId(categoryId, roleKey);
    const remainingIds = new Set(remainingRows.map((item) => item.id));
    for (const previousRow of previousRows) {
      if (remainingIds.has(previousRow.id)) continue;
      await recordMasterDataJournal(req, {
        tableName: "component",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.component.bulk_delete",
        contexts: [{ tableName: "component_category", recordId: categoryId, relationRole: "category" }],
      });
    }
    res.json(result);
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = ensureRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.tags.create.input.parse(req.body);
    const row = await masterDataService.createTag(input, roleKey);
    await recordMasterDataJournal(req, {
      tableName: "tag",
      recordId: row.id,
      op: "create",
      after: row,
      triggerKey: "master_data.tag.create",
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.tags.update.input.parse(req.body);
    const previousRow = await masterDataService.getTagById(id, roleKey);
    const row = await masterDataService.updateTag(id, input.version, input, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "tag",
        recordId: row.id,
        op: "update",
        before: previousRow,
        after: row,
        triggerKey: "master_data.tag.update",
      });
    }
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.masterData.tags.delete.input.parse(req.body);
    const previousRow = await masterDataService.getTagById(id, roleKey);
    await masterDataService.deleteTag(id, input.version, roleKey);
    if (previousRow) {
      await recordMasterDataJournal(req, {
        tableName: "tag",
        recordId: previousRow.id,
        op: "delete",
        before: previousRow,
        triggerKey: "master_data.tag.delete",
      });
    }
    res.status(204).send();
  } catch (error) {
    if (handleServiceError(error, res)) return;
    next(error);
  }
}
