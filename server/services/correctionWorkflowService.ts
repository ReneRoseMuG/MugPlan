import fs from "fs/promises";
import path from "path";
import { applyCorrectionWorkflow, previewCorrectionWorkflow } from "../../script/correction-workflows/engine";
import { sha256Utf8 } from "../../script/correction-workflows/json";
import { getCorrectionWorkflow } from "../../script/correction-workflows/registry";
import "../../script/correction-workflows/workflows";
import { logError, logInfo, logWarn } from "../lib/logger";

const SAUNA_PROJECT_TITLE_WORKFLOW_ID = "project-title-from-sauna-model";

type WorkflowMetadata = Record<string, unknown> | undefined;

export class CorrectionWorkflowError extends Error {
  status: number;
  code: "VALIDATION_ERROR" | "MANIFEST_HASH_MISMATCH" | "INTERNAL_ERROR";

  constructor(
    status: number,
    code: "VALIDATION_ERROR" | "MANIFEST_HASH_MISMATCH" | "INTERNAL_ERROR",
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getSaunaProjectTitleWorkflow() {
  return getCorrectionWorkflow(SAUNA_PROJECT_TITLE_WORKFLOW_ID);
}

function getWorkflowOutputDir(): string | undefined {
  const value = process.env.CORRECTION_WORKFLOW_OUTPUT_DIR?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readStringMetadata(metadata: WorkflowMetadata, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumberMetadata(metadata: WorkflowMetadata, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function countPreviewRows(summary: Record<string, number>): number {
  return Object.values(summary).reduce((total, value) => total + value, 0);
}

function toPreviewCandidate(candidate: {
  candidateId: string;
  status: "actionable" | "already_ok" | "ambiguous" | "blocked";
  label: string;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    candidateId: candidate.candidateId,
    status: candidate.status,
    label: candidate.label,
    message: candidate.message ?? null,
    projectId: readNumberMetadata(candidate.metadata, "projectId"),
    orderNumber: readStringMetadata(candidate.metadata, "orderNumber"),
    currentName: readStringMetadata(candidate.metadata, "currentName"),
    targetName: readStringMetadata(candidate.metadata, "targetName"),
    saunaModel: readStringMetadata(candidate.metadata, "saunaModel"),
  };
}

function assertSafeManifestPath(manifestPath: string): string {
  const logsRoot = path.resolve(getWorkflowOutputDir() ?? path.join(process.cwd(), "logs"));
  const resolved = path.resolve(manifestPath);
  const relative = path.relative(logsRoot, resolved);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !resolved.endsWith("_manifest.json")
  ) {
    throw new CorrectionWorkflowError(422, "VALIDATION_ERROR", "Ungültiger Manifest-Pfad.");
  }
  return resolved;
}

async function assertManifestHash(manifestPath: string, expectedHash: string): Promise<void> {
  const rawManifest = await fs.readFile(manifestPath, "utf8");
  const actualHash = sha256Utf8(rawManifest);
  if (actualHash !== expectedHash) {
    throw new CorrectionWorkflowError(409, "MANIFEST_HASH_MISMATCH", "Manifest-Hash passt nicht zur Vorschau.");
  }
}

export async function previewSaunaProjectTitleMigration() {
  try {
    const workflow = getSaunaProjectTitleWorkflow();
    const preview = await previewCorrectionWorkflow(workflow, { outputDir: getWorkflowOutputDir() });
    const sourceCount = countPreviewRows(preview.manifest.summary);

    logInfo("[correction-workflow] preview complete", {
      workflowId: workflow.id,
      runId: preview.manifest.runId,
      summary: preview.manifest.summary,
    });

    return {
      workflowId: preview.manifest.workflowId,
      workflowTitle: preview.manifest.workflowTitle,
      runtimeMode: preview.manifest.runtimeMode,
      target: preview.manifest.target,
      createdAt: preview.manifest.createdAt,
      runId: preview.manifest.runId,
      manifestPath: preview.paths.manifestPath,
      previewReportPath: preview.paths.previewReportPath,
      manifestHash: preview.manifestHash,
      summary: preview.manifest.summary,
      sourceCount,
      resultCount: preview.manifest.summary.actionable,
      candidates: preview.manifest.candidates.map(toPreviewCandidate),
    };
  } catch (error) {
    logError("[correction-workflow] preview failed", {
      workflowId: SAUNA_PROJECT_TITLE_WORKFLOW_ID,
      error,
    });
    throw error;
  }
}

export async function applySaunaProjectTitleMigration(input: {
  manifestPath: string;
  manifestHash: string;
}) {
  const workflow = getSaunaProjectTitleWorkflow();
  const manifestPath = assertSafeManifestPath(input.manifestPath);
  await assertManifestHash(manifestPath, input.manifestHash);

  try {
    const result = await applyCorrectionWorkflow(workflow, manifestPath, { outputDir: getWorkflowOutputDir() });
    const hasFailures = result.summary.failed > 0 || result.summary.failedVerification > 0;
    const hasSkips = result.summary.skippedDueToDrift > 0;
    const logPayload = {
      workflowId: result.workflowId,
      runId: result.runId,
      summary: result.summary,
      verificationPassed: result.verificationPassed,
    };

    if (hasFailures) {
      logError("[correction-workflow] apply completed with failures", logPayload);
    } else if (hasSkips) {
      logWarn("[correction-workflow] apply completed with drift skips", logPayload);
    } else {
      logInfo("[correction-workflow] apply complete", logPayload);
    }

    return {
      workflowId: result.workflowId,
      workflowTitle: result.workflowTitle,
      runtimeMode: result.runtimeMode,
      target: result.target,
      createdAt: result.createdAt,
      runId: result.runId,
      manifestPath: result.manifestPath,
      manifestHash: result.manifestHash,
      verificationPassed: result.verificationPassed,
      summary: result.summary,
      candidateResults: result.candidateResults.map((candidate) => ({
        candidateId: candidate.candidateId,
        label: candidate.label,
        status: candidate.status,
        detail: candidate.detail ?? null,
      })),
    };
  } catch (error) {
    logError("[correction-workflow] apply failed", {
      workflowId: SAUNA_PROJECT_TITLE_WORKFLOW_ID,
      manifestPath,
      error,
    });
    throw error;
  }
}
