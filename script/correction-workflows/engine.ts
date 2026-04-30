import fs from "fs/promises";
import path from "path";
import type { CorrectionWorkflowDefinition, JsonValue, WorkflowApplyResult, WorkflowCandidate, WorkflowCandidateApplyResult, WorkflowDriftIssue, WorkflowManifest, WorkflowPreviewArtifacts, WorkflowRunOptions, WorkflowSnapshotRow, WorkflowSummary, WorkflowVerificationIssue, WorkflowVerificationResult } from "./types";
import { jsonValuesEqual, normalizeDatabaseValue, sha256Utf8, stableStringifyJson } from "./json";
import { openWorkflowExecutionContext } from "./safety";
import { buildRowReference, selectRowByKey, updateRowByKey } from "./sql";
import { assertWorkflowCandidateValid, assertWorkflowDefinitionValid, assertWorkflowManifestValid } from "./validation";

const MANIFEST_FORMAT_VERSION = 1 as const;

function buildArtifactBaseName(workflowId: string, runId: string, createdAt: string): string {
  return `${createdAt.slice(0, 10)}_${workflowId}_${runId}`;
}

function createWorkflowSummary(): WorkflowSummary {
  return {
    actionable: 0,
    already_ok: 0,
    ambiguous: 0,
    blocked: 0,
  };
}

export function buildWorkflowSummary(candidates: WorkflowCandidate[]): WorkflowSummary {
  const summary = createWorkflowSummary();
  for (const candidate of candidates) {
    summary[candidate.status] += 1;
  }
  return summary;
}

function renderCandidateMarkdown(workflow: CorrectionWorkflowDefinition, candidate: WorkflowCandidate): string {
  if (workflow.renderCandidateMarkdown) {
    return workflow.renderCandidateMarkdown(candidate);
  }
  const marker = candidate.status === "actionable"
    ? "[ ]"
    : candidate.status === "already_ok"
      ? "[=]"
      : candidate.status === "ambiguous"
        ? "[?]"
        : "[!]";
  const detail = candidate.message?.trim() ? ` | ${candidate.message.trim()}` : "";
  return `- ${marker} ${candidate.label}${detail}`;
}

function renderPreviewMarkdown(workflow: CorrectionWorkflowDefinition, manifest: WorkflowManifest, manifestHash: string): string {
  const lines = [
    `# ${workflow.title} Preview`,
    "",
    `Erzeugt: ${manifest.createdAt}`,
    `Workflow: ${manifest.workflowId}`,
    `Run-ID: ${manifest.runId}`,
    `Ziel: ${manifest.target.dbName} (${manifest.target.host}:${manifest.target.port})`,
    `Runtime: ${manifest.runtimeMode}`,
    `Manifest-Hash: ${manifestHash}`,
    "",
    "Zusammenfassung:",
    `- Actionable Kandidaten: ${manifest.summary.actionable}`,
    `- Bereits passend: ${manifest.summary.already_ok}`,
    `- Mehrdeutig: ${manifest.summary.ambiguous}`,
    `- Blockiert: ${manifest.summary.blocked}`,
    "",
    "## Auswahl",
    "",
  ];

  for (const candidate of manifest.candidates) {
    lines.push(renderCandidateMarkdown(workflow, candidate));
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderApplyMarkdown(result: WorkflowApplyResult): string {
  const lines = [
    `# ${result.workflowTitle} Apply Report`,
    "",
    `Erzeugt: ${result.createdAt}`,
    `Workflow: ${result.workflowId}`,
    `Run-ID: ${result.runId}`,
    `Ziel: ${result.target.dbName} (${result.target.host}:${result.target.port})`,
    `Runtime: ${result.runtimeMode}`,
    `Manifest: ${result.manifestPath}`,
    `Manifest-Hash: ${result.manifestHash}`,
    "",
    "Zusammenfassung:",
    `- Actionable Kandidaten: ${result.summary.actionableCandidates}`,
    `- Angewendet: ${result.summary.applied}`,
    `- Uebersprungen (nicht actionable): ${result.summary.skippedNonActionable}`,
    `- Uebersprungen (Drift): ${result.summary.skippedDueToDrift}`,
    `- Verifikation fehlgeschlagen: ${result.summary.failedVerification}`,
    `- Fehler: ${result.summary.failed}`,
    `- Gesamtverifikation bestanden: ${result.verificationPassed ? "ja" : "nein"}`,
    "",
    "## Ergebnisse",
    "",
  ];

  for (const candidate of result.candidateResults) {
    lines.push(`- ${candidate.label} -> ${candidate.status}${candidate.detail ? ` | ${candidate.detail}` : ""}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function parseManifest(raw: string): WorkflowManifest {
  const parsed = JSON.parse(raw) as WorkflowManifest;
  assertWorkflowManifestValid(parsed);
  return parsed;
}

async function ensureOutputDir(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

async function canonicalizeCandidatesForManifest(
  connection: Awaited<ReturnType<typeof openWorkflowExecutionContext>>["connection"],
  candidates: WorkflowCandidate[],
): Promise<WorkflowCandidate[]> {
  const normalizedCandidates: WorkflowCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.status !== "actionable") {
      normalizedCandidates.push(candidate);
      continue;
    }

    const snapshotRows: WorkflowSnapshotRow[] = [];
    for (const snapshotRow of candidate.snapshotRows ?? []) {
      const currentRow = await selectRowByKey(connection, snapshotRow.table, snapshotRow.key);
      if (!currentRow) {
        throw new Error(
          `Cannot build preview manifest because ${buildRowReference(snapshotRow.table, snapshotRow.key)} is missing.`,
        );
      }

      const canonicalData = Object.keys(snapshotRow.data).reduce<Record<string, JsonValue>>((acc, field) => {
        acc[field] = (currentRow[field] ?? null) as JsonValue;
        return acc;
      }, {});

      snapshotRows.push({
        table: snapshotRow.table,
        key: snapshotRow.key,
        data: canonicalData,
      });
    }

    normalizedCandidates.push({
      ...candidate,
      snapshotRows,
      mutationPlans: (candidate.mutationPlans ?? []).map((mutationPlan) => ({
        ...mutationPlan,
        set: Object.entries(mutationPlan.set).reduce<Record<string, JsonValue>>((acc, [field, value]) => {
          acc[field] = normalizeDatabaseValue(value);
          return acc;
        }, {}),
      })),
    });
  }

  return normalizedCandidates;
}

export function detectSnapshotDrift(
  expectedSnapshot: WorkflowSnapshotRow,
  actualRow: Record<string, JsonValue> | null,
): WorkflowDriftIssue[] {
  if (!actualRow) {
    return [
      {
        table: expectedSnapshot.table,
        key: expectedSnapshot.key,
        field: "__row__",
        expected: normalizeDatabaseValue(expectedSnapshot.data),
        actual: null,
        reason: "row_missing",
      },
    ];
  }

  const issues: WorkflowDriftIssue[] = [];
  for (const [field, expectedValue] of Object.entries(expectedSnapshot.data)) {
    const actualValue = (actualRow[field] ?? null) as JsonValue;
    if (!jsonValuesEqual(expectedValue, actualValue)) {
      issues.push({
        table: expectedSnapshot.table,
        key: expectedSnapshot.key,
        field,
        expected: expectedValue,
        actual: actualValue,
        reason: "field_mismatch",
      });
    }
  }
  return issues;
}

export function verifyMutationChangeSet(
  table: string,
  key: Record<string, string | number | boolean | null>,
  beforeRow: Record<string, JsonValue>,
  afterRow: Record<string, JsonValue> | null,
  expectedSet: Record<string, JsonValue>,
  allowedChangedFields: string[],
): WorkflowVerificationResult {
  if (!afterRow) {
    return {
      passed: false,
      changedFields: [],
      issues: [
        {
          table,
          key,
          field: "__row__",
          reason: "row_missing_after_update",
          expected: null,
          actual: null,
        },
      ],
    };
  }

  const changedFields = new Set<string>();
  const issues: WorkflowVerificationIssue[] = [];
  const fieldNames = new Set([...Object.keys(beforeRow), ...Object.keys(afterRow)]);

  for (const field of fieldNames) {
    const beforeValue = (beforeRow[field] ?? null) as JsonValue;
    const afterValue = (afterRow[field] ?? null) as JsonValue;
    if (!jsonValuesEqual(beforeValue, afterValue)) {
      changedFields.add(field);
      if (!allowedChangedFields.includes(field)) {
        issues.push({
          table,
          key,
          field,
          reason: "unexpected_field_change",
          before: beforeValue,
          after: afterValue,
        });
      }
    }
  }

  for (const [field, expectedValue] of Object.entries(expectedSet)) {
    const actualValue = (afterRow[field] ?? null) as JsonValue;
    if (!jsonValuesEqual(expectedValue, actualValue)) {
      issues.push({
        table,
        key,
        field,
        reason: "expected_value_mismatch",
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }

  return {
    passed: issues.length === 0,
    changedFields: Array.from(changedFields).sort(),
    issues,
  };
}

export async function previewCorrectionWorkflow(
  workflow: CorrectionWorkflowDefinition,
  options?: WorkflowRunOptions,
): Promise<WorkflowPreviewArtifacts> {
  assertWorkflowDefinitionValid(workflow);
  const ctx = await openWorkflowExecutionContext(workflow, options);

  try {
    const discoveredCandidates = await workflow.discoverCandidates(ctx);
    discoveredCandidates.forEach((candidate, index) => assertWorkflowCandidateValid(candidate, index));
    const candidates = await canonicalizeCandidatesForManifest(ctx.connection, discoveredCandidates);

    const manifest: WorkflowManifest = {
      formatVersion: MANIFEST_FORMAT_VERSION,
      workflowId: workflow.id,
      workflowTitle: workflow.title,
      allowedRuntimeModes: [...workflow.allowedRuntimeModes],
      runtimeMode: ctx.runtimeMode,
      target: ctx.target,
      createdAt: ctx.startedAt,
      runId: ctx.runId,
      summary: buildWorkflowSummary(candidates),
      candidates,
    };

    const manifestJson = stableStringifyJson(manifest as unknown as JsonValue);
    const manifestHash = sha256Utf8(manifestJson);
    const baseName = buildArtifactBaseName(workflow.id, ctx.runId, ctx.startedAt);
    const manifestPath = path.join(ctx.outputDir, `${baseName}_manifest.json`);
    const previewReportPath = path.join(ctx.outputDir, `${baseName}_preview.md`);

    await ensureOutputDir(ctx.outputDir);
    await fs.writeFile(manifestPath, manifestJson, "utf8");
    await fs.writeFile(previewReportPath, renderPreviewMarkdown(workflow, manifest, manifestHash), "utf8");

    return {
      manifest,
      manifestHash,
      paths: {
        manifestPath,
        previewReportPath,
      },
    };
  } finally {
    await ctx.connection.end();
  }
}

export async function applyCorrectionWorkflow(
  workflow: CorrectionWorkflowDefinition,
  manifestPath: string,
  options?: WorkflowRunOptions,
): Promise<WorkflowApplyResult> {
  assertWorkflowDefinitionValid(workflow);
  const rawManifest = await fs.readFile(manifestPath, "utf8");
  const manifestHash = sha256Utf8(rawManifest);
  const manifest = parseManifest(rawManifest);

  if (manifest.workflowId !== workflow.id) {
    throw new Error(`Manifest workflowId '${manifest.workflowId}' does not match requested workflow '${workflow.id}'.`);
  }

  const ctx = await openWorkflowExecutionContext(workflow, {
    ...options,
    outputDir: options?.outputDir ?? path.dirname(path.resolve(manifestPath)),
  });

  if (manifest.runtimeMode !== ctx.runtimeMode) {
    await ctx.connection.end();
    throw new Error(`Manifest runtime '${manifest.runtimeMode}' does not match current runtime '${ctx.runtimeMode}'.`);
  }
  if (manifest.target.dbName !== ctx.target.dbName || manifest.target.host !== ctx.target.host || manifest.target.port !== ctx.target.port) {
    await ctx.connection.end();
    throw new Error("Manifest target does not match the current database target.");
  }

  const candidateResults: WorkflowCandidateApplyResult[] = [];
  let applied = 0;
  let skippedNonActionable = 0;
  let skippedDueToDrift = 0;
  let failedVerification = 0;
  let failed = 0;

  try {
    for (const candidate of manifest.candidates) {
      if (candidate.status !== "actionable") {
        skippedNonActionable += 1;
        candidateResults.push({
          candidateId: candidate.candidateId,
          label: candidate.label,
          status: "skipped_non_actionable",
          detail: candidate.message ?? `Status '${candidate.status}' wird nicht angewendet.`,
        });
        continue;
      }

      await ctx.connection.beginTransaction();
      try {
        const driftIssues: WorkflowDriftIssue[] = [];
        const lockedRows = new Map<string, Record<string, JsonValue>>();

        for (const snapshotRow of candidate.snapshotRows ?? []) {
          const currentRow = await selectRowByKey(ctx.connection, snapshotRow.table, snapshotRow.key, { forUpdate: true });
          const rowIssues = detectSnapshotDrift(snapshotRow, currentRow);
          driftIssues.push(...rowIssues);
          if (currentRow) {
            lockedRows.set(buildRowReference(snapshotRow.table, snapshotRow.key), currentRow);
          }
        }

        if (driftIssues.length > 0) {
          await ctx.connection.rollback();
          skippedDueToDrift += 1;
          candidateResults.push({
            candidateId: candidate.candidateId,
            label: candidate.label,
            status: "skipped_due_to_drift",
            detail: "Datenbasis hat sich seit dem Preview geaendert.",
            driftIssues,
          });
          continue;
        }

        const verificationIssues: WorkflowVerificationIssue[] = [];
        const changedFields = new Set<string>();

        for (const mutationPlan of candidate.mutationPlans ?? []) {
          const rowReference = buildRowReference(mutationPlan.table, mutationPlan.key);
          let beforeRow = lockedRows.get(rowReference) ?? null;

          if (!beforeRow) {
            beforeRow = await selectRowByKey(ctx.connection, mutationPlan.table, mutationPlan.key, { forUpdate: true });
            if (beforeRow) {
              lockedRows.set(rowReference, beforeRow);
            }
          }

          if (!beforeRow) {
            verificationIssues.push({
              table: mutationPlan.table,
              key: mutationPlan.key,
              field: "__row__",
              reason: "row_missing_after_update",
            });
            continue;
          }

          const affectedRows = await updateRowByKey(ctx.connection, mutationPlan.table, mutationPlan.key, mutationPlan.set);
          if (affectedRows !== 1) {
            throw new Error(`Expected exactly one updated row for ${rowReference}, received ${affectedRows}.`);
          }

          const afterRow = await selectRowByKey(ctx.connection, mutationPlan.table, mutationPlan.key, { forUpdate: true });
          const verification = verifyMutationChangeSet(
            mutationPlan.table,
            mutationPlan.key,
            beforeRow,
            afterRow,
            mutationPlan.set,
            mutationPlan.allowedChangedFields,
          );
          verification.issues.forEach((issue) => verificationIssues.push(issue));
          verification.changedFields.forEach((field) => changedFields.add(field));
        }

        if (verificationIssues.length > 0) {
          await ctx.connection.rollback();
          failedVerification += 1;
          candidateResults.push({
            candidateId: candidate.candidateId,
            label: candidate.label,
            status: "failed_verification",
            detail: "Verifikation der erlaubten Feld-Diffs ist fehlgeschlagen.",
            verification: {
              passed: false,
              changedFields: Array.from(changedFields).sort(),
              issues: verificationIssues,
            },
          });
          continue;
        }

        await ctx.connection.commit();
        applied += 1;
        candidateResults.push({
          candidateId: candidate.candidateId,
          label: candidate.label,
          status: "applied",
          detail: "Mutation erfolgreich angewendet und verifiziert.",
          verification: {
            passed: true,
            changedFields: Array.from(changedFields).sort(),
            issues: [],
          },
        });
      } catch (error) {
        await ctx.connection.rollback();
        failed += 1;
        candidateResults.push({
          candidateId: candidate.candidateId,
          label: candidate.label,
          status: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const applyResult: WorkflowApplyResult = {
      formatVersion: MANIFEST_FORMAT_VERSION,
      workflowId: workflow.id,
      workflowTitle: workflow.title,
      runtimeMode: ctx.runtimeMode,
      target: ctx.target,
      createdAt: new Date().toISOString(),
      runId: ctx.runId,
      manifestPath: path.resolve(manifestPath),
      manifestHash,
      summary: {
        actionableCandidates: manifest.summary.actionable,
        applied,
        skippedNonActionable,
        skippedDueToDrift,
        failedVerification,
        failed,
      },
      verificationPassed: failedVerification === 0 && failed === 0,
      candidateResults,
    };

    const baseName = buildArtifactBaseName(workflow.id, ctx.runId, applyResult.createdAt);
    const applyResultPath = path.join(ctx.outputDir, `${baseName}_apply-result.json`);
    const applyReportPath = path.join(ctx.outputDir, `${baseName}_apply-report.md`);

    await ensureOutputDir(ctx.outputDir);
    await fs.writeFile(applyResultPath, stableStringifyJson(applyResult as unknown as JsonValue), "utf8");
    await fs.writeFile(applyReportPath, renderApplyMarkdown(applyResult), "utf8");

    return applyResult;
  } finally {
    await ctx.connection.end();
  }
}
