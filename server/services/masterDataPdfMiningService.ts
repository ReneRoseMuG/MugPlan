import { parseDocumentHeaderDeterministically } from "./documentHeaderDeterministicParser";
import { extractTextFromPdfBuffer } from "./documentTextExtractor";
import {
  parseMasterDataArticleItemsDeterministically,
  type MasterDataArticleItem,
} from "./documentArticleMasterDataParser";
import { BULK_IMPORT_LIMITS } from "./bulkImportService";

type BulkFileInput = {
  fileName: string;
  contentType: string | null;
  buffer: Buffer;
};

type MiningDocument = {
  fileName: string;
  orderNumber: string | null;
  productName: string;
  productDescription: string | null;
  articleItems: MasterDataArticleItem[];
};

type MiningSkippedDocument = {
  fileName: string;
  reason: string;
};

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeGroupingKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function enforceBulkLimits(files: BulkFileInput[]) {
  if (files.length === 0) {
    throw new Error("Keine Dateien übergeben.");
  }
  if (files.length > BULK_IMPORT_LIMITS.maxFiles) {
    throw new Error(`Maximal ${BULK_IMPORT_LIMITS.maxFiles} Dateien pro Anfrage erlaubt.`);
  }

  let totalBytes = 0;
  for (const file of files) {
    if (file.buffer.length > BULK_IMPORT_LIMITS.maxFileSizeBytes) {
      throw new Error(`Datei ${file.fileName} überschreitet das Einzeldatei-Limit.`);
    }
    totalBytes += file.buffer.length;
  }
  if (totalBytes > BULK_IMPORT_LIMITS.maxTotalBytes) {
    throw new Error("Gesamtgröße der Anfrage überschreitet das Limit.");
  }
}

function containsSauna(items: MasterDataArticleItem[]): boolean {
  return items.some((item) => /sauna/i.test(`${item.name} ${item.description ?? ""}`));
}

function containsAllowedSingleItemProduct(items: MasterDataArticleItem[]): boolean {
  return items.some((item) => /(schlaffass|gartenfass)/i.test(`${item.name} ${item.description ?? ""}`));
}

function consolidateDocuments(documents: MiningDocument[]) {
  const groupMap = new Map<string, {
    productName: string;
    productDescription: string | null;
    sourceFileNames: string[];
    articleItems: MasterDataArticleItem[];
  }>();

  for (const document of documents) {
    const key = normalizeGroupingKey(document.productName);
    const current = groupMap.get(key);

    if (!current) {
      groupMap.set(key, {
        productName: document.productName,
        productDescription: document.productDescription,
        sourceFileNames: [document.fileName],
        articleItems: document.articleItems.map((item) => ({ ...item })),
      });
      continue;
    }

    current.sourceFileNames.push(document.fileName);
    if (!current.productDescription && document.productDescription) {
      current.productDescription = document.productDescription;
    }

    const existingComponentKeys = new Set(
      current.articleItems
        .filter((item) => item.kind === "component")
        .map((item) => normalizeGroupingKey(item.name)),
    );

    for (const item of document.articleItems) {
      if (item.kind === "product") {
        if (!current.articleItems.some((candidate) => candidate.kind === "product")) {
          current.articleItems.unshift({ ...item });
        }
        continue;
      }

      const componentKey = normalizeGroupingKey(item.name);
      if (existingComponentKeys.has(componentKey)) {
        continue;
      }
      existingComponentKeys.add(componentKey);
      current.articleItems.push({ ...item });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.productName.localeCompare(b.productName, "de"));
}

export async function analyzeMasterDataPdfMining(files: BulkFileInput[]) {
  enforceBulkLimits(files);

  const documents: MiningDocument[] = [];
  const skipped: MiningSkippedDocument[] = [];
  const errors: Array<{ fileName: string; reason: string }> = [];

  for (const file of files) {
    try {
      const extractedText = await extractTextFromPdfBuffer(file.buffer);
      const header = parseDocumentHeaderDeterministically(extractedText);
      const parsed = parseMasterDataArticleItemsDeterministically(extractedText);

      const hasAllowedSingleItemProduct = containsAllowedSingleItemProduct(parsed.articleItems);

      if (parsed.articleItems.length <= 1 && !hasAllowedSingleItemProduct) {
        skipped.push({ fileName: file.fileName, reason: "Artikelliste enthält nur einen Eintrag" });
        continue;
      }

      if (!containsSauna(parsed.articleItems) && !hasAllowedSingleItemProduct) {
        skipped.push({ fileName: file.fileName, reason: "Begriff Sauna kommt in der Artikelliste nicht vor" });
        continue;
      }

      documents.push({
        fileName: file.fileName,
        orderNumber: normalizeOptional(header.orderNumber),
        productName: parsed.productName,
        productDescription: parsed.productDescription,
        articleItems: parsed.articleItems,
      });
    } catch (error) {
      errors.push({
        fileName: file.fileName,
        reason: error instanceof Error ? error.message : "Extraktion fehlgeschlagen",
      });
    }
  }

  return {
    documents,
    productGroups: consolidateDocuments(documents),
    skipped,
    errors,
    limits: BULK_IMPORT_LIMITS,
  };
}
