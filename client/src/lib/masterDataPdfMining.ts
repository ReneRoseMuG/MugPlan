export type MiningArticleItem = {
  kind: "product" | "component";
  quantity: string;
  articleNumber: string | null;
  name: string;
  description: string | null;
};

export type MiningProductGroup = {
  productName: string;
  productDescription: string | null;
  sourceFileNames: string[];
  articleItems: MiningArticleItem[];
};

export type MiningAnalyzeResponse = {
  documents: Array<{
    fileName: string;
    orderNumber: string | null;
    productName: string;
    productDescription: string | null;
    articleItems: MiningArticleItem[];
  }>;
  productGroups: MiningProductGroup[];
  skipped: Array<{ fileName: string; reason: string }>;
  errors: Array<{ fileName: string; reason: string }>;
  limits: MiningLimits;
};

export type MiningLimits = {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxTotalBytes: number;
};

export type MiningFileLike = {
  name: string;
  size: number;
};

export type PartitionedMiningFiles<TFile extends MiningFileLike> = {
  batches: TFile[][];
  rejected: Array<{ fileName: string; reason: string }>;
};

function normalizeGroupingKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function mergeProductGroups(groups: MiningProductGroup[]): MiningProductGroup[] {
  const groupMap = new Map<string, MiningProductGroup>();

  for (const group of groups) {
    const key = normalizeGroupingKey(group.productName);
    const current = groupMap.get(key);

    if (!current) {
      groupMap.set(key, {
        productName: group.productName,
        productDescription: group.productDescription,
        sourceFileNames: [...group.sourceFileNames],
        articleItems: group.articleItems.map((item) => ({ ...item })),
      });
      continue;
    }

    if (!current.productDescription && group.productDescription) {
      current.productDescription = group.productDescription;
    }

    const sourceNames = new Set(current.sourceFileNames);
    for (const sourceFileName of group.sourceFileNames) {
      if (!sourceNames.has(sourceFileName)) {
        sourceNames.add(sourceFileName);
        current.sourceFileNames.push(sourceFileName);
      }
    }

    const existingComponentKeys = new Set(
      current.articleItems
        .filter((item) => item.kind === "component")
        .map((item) => normalizeGroupingKey(item.name)),
    );

    for (const item of group.articleItems) {
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

export function createEmptyMiningResult(limits: MiningLimits): MiningAnalyzeResponse {
  return {
    documents: [],
    productGroups: [],
    skipped: [],
    errors: [],
    limits,
  };
}

export function partitionMiningFiles<TFile extends MiningFileLike>(
  files: TFile[],
  limits: MiningLimits,
): PartitionedMiningFiles<TFile> {
  const batches: TFile[][] = [];
  const rejected: Array<{ fileName: string; reason: string }> = [];

  let currentBatch: TFile[] = [];
  let currentBatchBytes = 0;

  for (const file of files) {
    if (file.size > limits.maxFileSizeBytes) {
      rejected.push({
        fileName: file.name,
        reason: `Datei ${file.name} ueberschreitet das Einzeldatei-Limit.`,
      });
      continue;
    }

    const wouldExceedFileCount = currentBatch.length >= limits.maxFiles;
    const wouldExceedTotalBytes = currentBatchBytes + file.size > limits.maxTotalBytes;
    if (currentBatch.length > 0 && (wouldExceedFileCount || wouldExceedTotalBytes)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchBytes = 0;
    }

    currentBatch.push(file);
    currentBatchBytes += file.size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return { batches, rejected };
}

export function mergeMiningAnalyzeResponses(
  current: MiningAnalyzeResponse,
  next: Pick<MiningAnalyzeResponse, "documents" | "productGroups" | "skipped" | "errors">,
): MiningAnalyzeResponse {
  return {
    documents: [...current.documents, ...next.documents],
    productGroups: mergeProductGroups([...current.productGroups, ...next.productGroups]),
    skipped: [...current.skipped, ...next.skipped],
    errors: [...current.errors, ...next.errors],
    limits: current.limits,
  };
}
