import type {
  CorrectionWorkflowDefinition,
  WorkflowCandidate,
  WorkflowManifest,
  WorkflowMutationPlan,
  WorkflowRowKey,
  WorkflowSnapshotRow,
} from "./types";

const WORKFLOW_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${label} '${value}' contains unsupported characters.`);
  }
}

function assertRowKey(key: WorkflowRowKey, label: string): void {
  const entries = Object.entries(key);
  if (entries.length === 0) {
    throw new Error(`${label} must contain at least one key field.`);
  }
  for (const [field, value] of entries) {
    assertIdentifier(field, `${label} field`);
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(`${label}.${field} must be a JSON primitive.`);
    }
  }
}

function assertSnapshotRow(row: WorkflowSnapshotRow, label: string): void {
  assertIdentifier(row.table, `${label}.table`);
  assertRowKey(row.key, `${label}.key`);
  const fields = Object.keys(row.data);
  if (fields.length === 0) {
    throw new Error(`${label}.data must contain at least one drift field.`);
  }
  for (const field of fields) {
    assertIdentifier(field, `${label}.data field`);
  }
}

function assertMutationPlan(plan: WorkflowMutationPlan, label: string): void {
  assertIdentifier(plan.table, `${label}.table`);
  assertRowKey(plan.key, `${label}.key`);
  const setFields = Object.keys(plan.set);
  if (setFields.length === 0) {
    throw new Error(`${label}.set must contain at least one field.`);
  }
  if (!Array.isArray(plan.allowedChangedFields) || plan.allowedChangedFields.length === 0) {
    throw new Error(`${label}.allowedChangedFields must contain at least one field.`);
  }
  const allowedSet = new Set(plan.allowedChangedFields);
  for (const field of plan.allowedChangedFields) {
    assertIdentifier(field, `${label}.allowedChangedFields`);
  }
  for (const field of setFields) {
    assertIdentifier(field, `${label}.set field`);
    if (!allowedSet.has(field)) {
      throw new Error(`${label}.set field '${field}' must also be listed in allowedChangedFields.`);
    }
  }
}

export function assertWorkflowCandidateValid(candidate: WorkflowCandidate, index: number): void {
  assertNonEmptyString(candidate.candidateId, `candidate[${index}].candidateId`);
  assertNonEmptyString(candidate.label, `candidate[${index}].label`);
  if (!["actionable", "already_ok", "ambiguous", "blocked"].includes(candidate.status)) {
    throw new Error(`candidate[${index}].status '${candidate.status}' is invalid.`);
  }

  if (candidate.status === "actionable") {
    if (!Array.isArray(candidate.snapshotRows) || candidate.snapshotRows.length === 0) {
      throw new Error(`candidate[${index}] with status 'actionable' requires snapshotRows.`);
    }
    if (!Array.isArray(candidate.mutationPlans) || candidate.mutationPlans.length === 0) {
      throw new Error(`candidate[${index}] with status 'actionable' requires mutationPlans.`);
    }
    candidate.snapshotRows.forEach((row, rowIndex) => {
      assertSnapshotRow(row, `candidate[${index}].snapshotRows[${rowIndex}]`);
    });
    candidate.mutationPlans.forEach((plan, planIndex) => {
      assertMutationPlan(plan, `candidate[${index}].mutationPlans[${planIndex}]`);
    });
  } else if (candidate.mutationPlans && candidate.mutationPlans.length > 0) {
    throw new Error(`candidate[${index}] may only define mutationPlans when status is 'actionable'.`);
  }
}

export function assertWorkflowDefinitionValid(workflow: CorrectionWorkflowDefinition): void {
  assertNonEmptyString(workflow.id, "workflow.id");
  if (!WORKFLOW_ID_PATTERN.test(workflow.id)) {
    throw new Error(`workflow.id '${workflow.id}' must match ${WORKFLOW_ID_PATTERN}.`);
  }
  assertNonEmptyString(workflow.title, "workflow.title");
  if (!Array.isArray(workflow.allowedRuntimeModes) || workflow.allowedRuntimeModes.length === 0) {
    throw new Error("workflow.allowedRuntimeModes must contain at least one runtime mode.");
  }
  if (typeof workflow.discoverCandidates !== "function") {
    throw new Error("workflow.discoverCandidates must be a function.");
  }
}

export function assertWorkflowManifestValid(manifest: WorkflowManifest): void {
  if (manifest.formatVersion !== 1) {
    throw new Error(`Unsupported workflow manifest formatVersion '${manifest.formatVersion}'.`);
  }
  assertNonEmptyString(manifest.workflowId, "manifest.workflowId");
  assertNonEmptyString(manifest.workflowTitle, "manifest.workflowTitle");
  if (!Array.isArray(manifest.candidates)) {
    throw new Error("manifest.candidates must be an array.");
  }
  manifest.candidates.forEach((candidate, index) => {
    assertWorkflowCandidateValid(candidate, index);
  });
}

