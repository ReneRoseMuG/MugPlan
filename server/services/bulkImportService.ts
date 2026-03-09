import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { customers, projectAttachments, projectOrder, projects } from "@shared/schema";
import { parseDocumentHeaderDeterministically } from "./documentHeaderDeterministicParser";
import { extractTextFromPdfBuffer } from "./documentTextExtractor";
import { parseDocumentArticleItemsDeterministically } from "./documentArticleDeterministicParser";
import { validateAndNormalizeExtraction } from "./extractionValidator";
import * as documentProcessingService from "./documentProcessingService";
import * as projectsService from "./projectsService";
import * as customersRepository from "../repositories/customersRepository";
import { buildStoredFilename, resolveMimeType, sanitizeFilename, writeAttachmentBuffer } from "../lib/attachmentFiles";
import * as attachmentQueriesService from "./attachmentQueriesService";

export const BULK_IMPORT_LIMITS = {
  maxFiles: 100,
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxTotalBytes: 250 * 1024 * 1024,
} as const;

type BulkFileInput = {
  fileName: string;
  contentType: string | null;
  buffer: Buffer;
};

type CustomerAnalyzeRow = {
  id: string;
  fileName: string;
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  city: string | null;
  extractedCustomer: ReturnType<typeof validateAndNormalizeExtraction>["customer"];
  fileBuffer: Buffer;
};

type ProjectAnalyzeRow = {
  id: string;
  fileName: string;
  orderNumber: string;
  title: string;
  customerNumber: string;
  customerName: string | null;
  articleListHtml: string;
  extractedCustomer: ReturnType<typeof validateAndNormalizeExtraction>["customer"];
  fileBuffer: Buffer;
};

type BulkImportSession =
  | {
      kind: "customers";
      createdAt: number;
      newCustomers: CustomerAnalyzeRow[];
      duplicates: Array<CustomerAnalyzeRow & { existingCustomerId: number }>;
      errors: Array<{ fileName: string; reason: string }>;
      log: Array<{ fileName: string; status: string }>;
    }
  | {
      kind: "projects";
      createdAt: number;
      newProjects: ProjectAnalyzeRow[];
      duplicates: Array<ProjectAnalyzeRow & { existingProjectId: number }>;
      specialCases: ProjectAnalyzeRow[];
      errors: Array<{ fileName: string; reason: string }>;
      log: Array<{ fileName: string; status: string }>;
    };

const sessionStore = new Map<string, BulkImportSession>();
const SESSION_TTL_MS = 30 * 60 * 1000;

export class BulkImportError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  sessionStore.forEach((session, id) => {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  });
}

function enforceBulkLimits(files: BulkFileInput[]) {
  if (files.length === 0) {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Keine Dateien uebergeben.");
  }
  if (files.length > BULK_IMPORT_LIMITS.maxFiles) {
    throw new BulkImportError(
      413,
      "BULK_IMPORT_LIMIT_EXCEEDED",
      `Maximal ${BULK_IMPORT_LIMITS.maxFiles} Dateien pro Anfrage erlaubt.`,
    );
  }
  let totalBytes = 0;
  for (const file of files) {
    if (file.buffer.length > BULK_IMPORT_LIMITS.maxFileSizeBytes) {
      throw new BulkImportError(
        413,
        "BULK_IMPORT_LIMIT_EXCEEDED",
        `Datei ${file.fileName} ueberschreitet das Einzeldatei-Limit.`,
      );
    }
    totalBytes += file.buffer.length;
  }
  if (totalBytes > BULK_IMPORT_LIMITS.maxTotalBytes) {
    throw new BulkImportError(
      413,
      "BULK_IMPORT_LIMIT_EXCEEDED",
      "Gesamtgroesse der Anfrage ueberschreitet das Limit.",
    );
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function deriveSaunaModel(descriptions: string[]): string {
  const byKeyword = descriptions.find((description) => /\b(sauna|modell)\b/i.test(description));
  if (byKeyword) return byKeyword.slice(0, 120);
  if (descriptions.length > 0) return descriptions[0].slice(0, 120);
  return "Produktinformationen aus Dokument";
}

async function extractNormalizedFromPdf(fileBuffer: Buffer) {
  const text = await extractTextFromPdfBuffer(fileBuffer);
  const header = parseDocumentHeaderDeterministically(text);
  const articleItems = parseDocumentArticleItemsDeterministically(text);
  return validateAndNormalizeExtraction({
    customer: {
      customerNumber: header.customerNumber,
      firstName: header.firstName,
      lastName: header.lastName,
      company: header.company,
      email: null,
      phone: header.mobile,
      addressLine1: header.addressLine1,
      addressLine2: null,
      postalCode: header.postalCode,
      city: header.city,
    },
    orderNumber: header.orderNumber,
    saunaModel: deriveSaunaModel(articleItems.map((item) => item.description)),
    articleItems: articleItems.map((item) => ({
      quantity: item.quantity,
      description: item.description,
      category: "Artikel",
    })),
    warnings: [],
  });
}

export async function analyzeCustomerBulkImport(files: BulkFileInput[]) {
  cleanupExpiredSessions();
  enforceBulkLimits(files);

  const newCustomers: CustomerAnalyzeRow[] = [];
  const duplicates: Array<CustomerAnalyzeRow & { existingCustomerId: number }> = [];
  const errors: Array<{ fileName: string; reason: string }> = [];
  const log: Array<{ fileName: string; status: string }> = [];

  for (const file of files) {
    try {
      const extraction = await extractNormalizedFromPdf(file.buffer);
      const customerNumber = extraction.customer.customerNumber?.trim() ?? "";
      if (!customerNumber) {
        errors.push({ fileName: file.fileName, reason: "Kundennummer nicht erkannt" });
        log.push({ fileName: file.fileName, status: "error" });
        continue;
      }
      const resolution = await documentProcessingService.resolveCustomerByNumber(customerNumber);
      const row: CustomerAnalyzeRow = {
        id: randomUUID(),
        fileName: file.fileName,
        customerNumber,
        firstName: normalizeOptional(extraction.customer.firstName),
        lastName: normalizeOptional(extraction.customer.lastName),
        company: normalizeOptional(extraction.customer.company),
        city: normalizeOptional(extraction.customer.city),
        extractedCustomer: extraction.customer,
        fileBuffer: file.buffer,
      };
      if (resolution.resolution === "single" && resolution.customer) {
        duplicates.push({ ...row, existingCustomerId: resolution.customer.id });
        log.push({ fileName: file.fileName, status: "duplicate" });
      } else if (resolution.resolution === "multiple") {
        errors.push({ fileName: file.fileName, reason: "Kundennummer mehrfach vorhanden" });
        log.push({ fileName: file.fileName, status: "error" });
      } else {
        newCustomers.push(row);
        log.push({ fileName: file.fileName, status: "new" });
      }
    } catch (error) {
      errors.push({
        fileName: file.fileName,
        reason: error instanceof Error ? error.message : "Extraktion fehlgeschlagen",
      });
      log.push({ fileName: file.fileName, status: "error" });
    }
  }

  const bulkImportSessionId = randomUUID();
  sessionStore.set(bulkImportSessionId, {
    kind: "customers",
    createdAt: Date.now(),
    newCustomers,
    duplicates,
    errors,
    log,
  });

  return {
    bulkImportSessionId,
    newCustomers: newCustomers.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      customerNumber: row.customerNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      city: row.city,
    })),
    duplicates: duplicates.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      customerNumber: row.customerNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      city: row.city,
      existingCustomerId: row.existingCustomerId,
    })),
    errors,
    log,
    limits: BULK_IMPORT_LIMITS,
  };
}

function getCustomerSession(sessionId: string) {
  cleanupExpiredSessions();
  const session = sessionStore.get(sessionId);
  if (!session || session.kind !== "customers") {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Bulk-Import-Session ungueltig oder abgelaufen.");
  }
  return session;
}

export async function applyNewCustomers(sessionId: string, selectedIds: string[]) {
  const session = getCustomerSession(sessionId);
  const selectedRows = session.newCustomers.filter((row) => selectedIds.includes(row.id));
  if (selectedRows.length === 0) {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Keine gueltigen Eintraege ausgewaehlt.");
  }

  const detailErrors: Array<{ id: string; field: string; message: string }> = [];
  for (const row of selectedRows) {
    if (!row.customerNumber.trim()) {
      detailErrors.push({ id: row.id, field: "customerNumber", message: "Kundennummer fehlt" });
    }
  }
  if (detailErrors.length > 0) {
    throw new BulkImportError(422, "VALIDATION_ERROR", "Validierung fehlgeschlagen", detailErrors);
  }

  const createdCustomerIds = await db.transaction(async (tx) => {
    const ids: number[] = [];
    for (const row of selectedRows) {
      const customerPayload = {
        customerNumber: row.customerNumber.trim(),
        firstName: normalizeOptional(row.extractedCustomer.firstName),
        lastName: normalizeOptional(row.extractedCustomer.lastName),
        fullName: normalizeOptional(row.extractedCustomer.lastName) && normalizeOptional(row.extractedCustomer.firstName)
          ? `${normalizeOptional(row.extractedCustomer.lastName)}, ${normalizeOptional(row.extractedCustomer.firstName)}`
          : normalizeOptional(row.extractedCustomer.company),
        company: normalizeOptional(row.extractedCustomer.company),
        email: normalizeOptional(row.extractedCustomer.email),
        phone: normalizeOptional(row.extractedCustomer.phone),
        addressLine1: normalizeOptional(row.extractedCustomer.addressLine1),
        addressLine2: normalizeOptional(row.extractedCustomer.addressLine2),
        postalCode: normalizeOptional(row.extractedCustomer.postalCode),
        city: normalizeOptional(row.extractedCustomer.city),
      };
      const result = await tx.insert(customers).values(customerPayload);
      ids.push(Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0));
    }
    return ids;
  });

  return {
    created: createdCustomerIds.length,
    createdCustomerIds,
  };
}

function buildCustomerPatch(
  existing: Awaited<ReturnType<typeof customersRepository.getCustomer>>,
  incoming: CustomerAnalyzeRow["extractedCustomer"],
) {
  if (!existing) return null;
  const patch: Record<string, string | null> = {};
  const applyIfEmpty = (key: keyof CustomerAnalyzeRow["extractedCustomer"], existingValue: string | null | undefined) => {
    const incomingValue = normalizeOptional(incoming[key]);
    const existingNormalized = normalizeOptional(existingValue);
    if (!incomingValue || existingNormalized) return;
    patch[key] = incomingValue;
  };
  applyIfEmpty("firstName", existing.firstName);
  applyIfEmpty("lastName", existing.lastName);
  applyIfEmpty("company", existing.company);
  applyIfEmpty("email", existing.email);
  applyIfEmpty("phone", existing.phone);
  applyIfEmpty("addressLine1", existing.addressLine1);
  applyIfEmpty("addressLine2", existing.addressLine2);
  applyIfEmpty("postalCode", existing.postalCode);
  applyIfEmpty("city", existing.city);
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function applyDuplicateCustomers(sessionId: string, selectedIds: string[]) {
  const session = getCustomerSession(sessionId);
  const selectedRows = session.duplicates.filter((row) => selectedIds.includes(row.id));
  let updated = 0;
  for (const row of selectedRows) {
    const matches = await customersRepository.getCustomersByCustomerNumber(row.customerNumber);
    if (matches.length !== 1) continue;
    const existing = matches[0];
    const patch = buildCustomerPatch(existing, row.extractedCustomer);
    if (!patch) continue;
    const result = await customersRepository.updateCustomerWithVersion(existing.id, existing.version, patch);
    if (result.kind === "updated") {
      updated += 1;
    }
  }
  return { updated };
}

function getProjectSession(sessionId: string) {
  cleanupExpiredSessions();
  const session = sessionStore.get(sessionId);
  if (!session || session.kind !== "projects") {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Bulk-Import-Session ungueltig oder abgelaufen.");
  }
  return session;
}

export async function analyzeProjectBulkImport(files: BulkFileInput[]) {
  cleanupExpiredSessions();
  enforceBulkLimits(files);

  const newProjects: ProjectAnalyzeRow[] = [];
  const duplicates: Array<ProjectAnalyzeRow & { existingProjectId: number }> = [];
  const specialCases: ProjectAnalyzeRow[] = [];
  const errors: Array<{ fileName: string; reason: string }> = [];
  const log: Array<{ fileName: string; status: string }> = [];

  for (const file of files) {
    try {
      const extraction = await extractNormalizedFromPdf(file.buffer);
      const orderNumber = extraction.orderNumber?.trim() ?? "";
      if (!orderNumber) {
        errors.push({ fileName: file.fileName, reason: "Auftragsnummer nicht erkannt" });
        log.push({ fileName: file.fileName, status: "error" });
        continue;
      }
      const alreadyImported = await projectsService.isOrderNumberAlreadyImported(orderNumber);
      const customerNumber = extraction.customer.customerNumber?.trim() ?? "";
      if (!customerNumber) {
        errors.push({ fileName: file.fileName, reason: "Kundennummer nicht erkannt" });
        log.push({ fileName: file.fileName, status: "error" });
        continue;
      }

      const row: ProjectAnalyzeRow = {
        id: randomUUID(),
        fileName: file.fileName,
        orderNumber,
        title: extraction.saunaModel.trim(),
        customerNumber,
        customerName: normalizeOptional(extraction.customer.company)
          ?? [normalizeOptional(extraction.customer.lastName), normalizeOptional(extraction.customer.firstName)].filter(Boolean).join(", ")
          ?? null,
        articleListHtml: extraction.articleListHtml,
        extractedCustomer: extraction.customer,
        fileBuffer: file.buffer,
      };

      if (alreadyImported) {
        const [existingProject] = await db
          .select({ id: projects.id })
          .from(projectOrder)
          .innerJoin(projects, eq(projectOrder.projectId, projects.id))
          .where(eq(projectOrder.orderNumber, orderNumber))
          .limit(1);
        duplicates.push({ ...row, existingProjectId: Number(existingProject?.id ?? 0) });
        log.push({ fileName: file.fileName, status: "duplicate" });
        continue;
      }

      const customerResolution = await documentProcessingService.resolveCustomerByNumber(customerNumber);
      if (customerResolution.resolution === "single") {
        newProjects.push(row);
        log.push({ fileName: file.fileName, status: "new" });
      } else if (customerResolution.resolution === "none") {
        specialCases.push(row);
        log.push({ fileName: file.fileName, status: "special" });
      } else {
        errors.push({ fileName: file.fileName, reason: "Kundennummer mehrfach vorhanden" });
        log.push({ fileName: file.fileName, status: "error" });
      }
    } catch (error) {
      errors.push({ fileName: file.fileName, reason: error instanceof Error ? error.message : "Extraktion fehlgeschlagen" });
      log.push({ fileName: file.fileName, status: "error" });
    }
  }

  const bulkImportSessionId = randomUUID();
  sessionStore.set(bulkImportSessionId, {
    kind: "projects",
    createdAt: Date.now(),
    newProjects,
    duplicates,
    specialCases,
    errors,
    log,
  });

  return {
    bulkImportSessionId,
    newProjects: newProjects.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      orderNumber: row.orderNumber,
      title: row.title,
      customerNumber: row.customerNumber,
      customerName: row.customerName,
      articleListHtml: row.articleListHtml,
    })),
    duplicates: duplicates.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      orderNumber: row.orderNumber,
      title: row.title,
      customerNumber: row.customerNumber,
      customerName: row.customerName,
      articleListHtml: row.articleListHtml,
      existingProjectId: row.existingProjectId,
    })),
    specialCases: specialCases.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      orderNumber: row.orderNumber,
      title: row.title,
      customerNumber: row.customerNumber,
      customerName: row.customerName,
      articleListHtml: row.articleListHtml,
      extractedCustomer: row.extractedCustomer,
    })),
    errors,
    log,
    limits: BULK_IMPORT_LIMITS,
  };
}

async function persistProjectAttachmentFromBuffer(params: {
  projectId: number;
  fileName: string;
  buffer: Buffer;
}) {
  const originalName = sanitizeFilename(params.fileName);
  const duplicateInfo = await attachmentQueriesService.checkAttachmentDuplicatesByOriginalName(originalName);
  if (duplicateInfo.duplicate) {
    return false;
  }
  const filename = buildStoredFilename(originalName);
  const storagePath = await writeAttachmentBuffer(filename, params.buffer);
  await db.insert(projectAttachments).values({
    projectId: params.projectId,
    filename,
    originalName,
    mimeType: resolveMimeType(originalName, "application/pdf"),
    fileSize: params.buffer.length,
    storagePath,
  });
  return true;
}

export async function applyNewProjects(sessionId: string, selectedIds: string[]) {
  const session = getProjectSession(sessionId);
  const selectedRows = session.newProjects.filter((row) => selectedIds.includes(row.id));
  if (selectedRows.length === 0) {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Keine gueltigen Eintraege ausgewaehlt.");
  }

  const detailErrors: Array<{ id: string; field: string; message: string }> = [];
  for (const row of selectedRows) {
    if (!row.orderNumber.trim()) {
      detailErrors.push({ id: row.id, field: "orderNumber", message: "Auftragsnummer fehlt" });
    }
  }
  if (detailErrors.length > 0) {
    throw new BulkImportError(422, "VALIDATION_ERROR", "Validierung fehlgeschlagen", detailErrors);
  }

  const createdProjects = await db.transaction(async () => {
    const created: Array<{ id: number; fileName: string; buffer: Buffer }> = [];
    for (const row of selectedRows) {
      const customerResolution = await documentProcessingService.resolveCustomerByNumber(row.customerNumber);
      if (customerResolution.resolution !== "single" || !customerResolution.customer) {
        throw new BulkImportError(422, "VALIDATION_ERROR", "Kundenzuordnung ungueltig", [
          { id: row.id, field: "customerNumber", message: "Kunde existiert nicht eindeutig" },
        ]);
      }
      const payload = {
        name: row.title.trim(),
        orderNumber: row.orderNumber,
        customerId: customerResolution.customer.id,
        descriptionMd: row.articleListHtml,
        type: 1,
      };
      const createdProject = await projectsService.createProject(payload);
      const projectId = createdProject.id;
      created.push({
        id: projectId,
        fileName: row.fileName,
        buffer: row.fileBuffer,
      });
    }
    return created;
  });

  let attachmentLinked = 0;
  for (const created of createdProjects) {
    const linked = await persistProjectAttachmentFromBuffer({
      projectId: created.id,
      fileName: created.fileName,
      buffer: created.buffer,
    });
    if (linked) attachmentLinked += 1;
  }

  return {
    created: createdProjects.length,
    createdProjectIds: createdProjects.map((item) => item.id),
    attachmentLinked,
  };
}

export async function applyProjectSpecialCase(sessionId: string, id: string) {
  const session = getProjectSession(sessionId);
  const row = session.specialCases.find((entry) => entry.id === id);
  if (!row) {
    throw new BulkImportError(400, "VALIDATION_ERROR", "Sonderfall-Eintrag nicht gefunden.");
  }

  const inserted = await db.transaction(async (tx) => {
    const customerPayload = {
      customerNumber: row.customerNumber,
      firstName: normalizeOptional(row.extractedCustomer.firstName),
      lastName: normalizeOptional(row.extractedCustomer.lastName),
      fullName: normalizeOptional(row.extractedCustomer.lastName) && normalizeOptional(row.extractedCustomer.firstName)
        ? `${normalizeOptional(row.extractedCustomer.lastName)}, ${normalizeOptional(row.extractedCustomer.firstName)}`
        : normalizeOptional(row.extractedCustomer.company),
      company: normalizeOptional(row.extractedCustomer.company),
      email: normalizeOptional(row.extractedCustomer.email),
      phone: normalizeOptional(row.extractedCustomer.phone),
      addressLine1: normalizeOptional(row.extractedCustomer.addressLine1),
      addressLine2: normalizeOptional(row.extractedCustomer.addressLine2),
      postalCode: normalizeOptional(row.extractedCustomer.postalCode),
      city: normalizeOptional(row.extractedCustomer.city),
    };
    const customerResult = await tx.insert(customers).values(customerPayload);
    const customerId = Number((customerResult as any)?.[0]?.insertId ?? (customerResult as any)?.insertId ?? 0);

    const projectPayload = {
      name: row.title.trim(),
      orderNumber: row.orderNumber,
      customerId,
      descriptionMd: row.articleListHtml,
      type: 1,
    };
    const project = await projectsService.createProject(projectPayload);
    const projectId = project.id;
    return { customerId, projectId };
  });

  const attachmentLinked = await persistProjectAttachmentFromBuffer({
    projectId: inserted.projectId,
    fileName: row.fileName,
    buffer: row.fileBuffer,
  });

  return {
    customerId: inserted.customerId,
    projectId: inserted.projectId,
    attachmentLinked,
  };
}

export function toBulkFileInputs(files: Array<{ filename: string; contentType: string | null; buffer: Buffer }>): BulkFileInput[] {
  return files
    .filter((file) => file.filename.toLowerCase().endsWith(".pdf"))
    .map((file) => ({
      fileName: file.filename,
      contentType: file.contentType,
      buffer: file.buffer,
    }));
}

export async function invalidateProjectOrderConflictCache(_orderNumber: string) {
  // Placeholder for potential future cache invalidation.
}

export async function ensureNoDuplicateOrderNumber(orderNumber: string) {
  const exists = await db
    .select({ id: projectOrder.id })
    .from(projectOrder)
    .where(and(eq(projectOrder.orderNumber, orderNumber)))
    .limit(1);
  return exists.length === 0;
}
