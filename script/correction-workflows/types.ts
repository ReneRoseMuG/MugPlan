import type { Connection } from "mysql2/promise";
import type { RuntimeConfig, RuntimeMode } from "../../server/config/runtimeEnv";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type WorkflowCandidateStatus = "actionable" | "already_ok" | "ambiguous" | "blocked";

export type WorkflowRowKey = Record<string, JsonPrimitive>;

export type WorkflowSnapshotRow = {
  table: string;
  key: WorkflowRowKey;
  data: Record<string, JsonValue>;
};

export type WorkflowMutationPlan = {
  table: string;
  key: WorkflowRowKey;
  set: Record<string, JsonValue>;
  allowedChangedFields: string[];
};

export type WorkflowCandidate = {
  candidateId: string;
  status: WorkflowCandidateStatus;
  label: string;
  message?: string | null;
  snapshotRows?: WorkflowSnapshotRow[];
  mutationPlans?: WorkflowMutationPlan[];
  metadata?: Record<string, JsonValue>;
};

export type WorkflowSummary = Record<WorkflowCandidateStatus, number>;

export type WorkflowTargetInfo = {
  dbName: string;
  host: string;
  port: number;
};

export type WorkflowExecutionContext = {
  connection: Connection;
  runtimeMode: RuntimeMode;
  runtimeConfig: RuntimeConfig;
  target: WorkflowTargetInfo;
  outputDir: string;
  runId: string;
  startedAt: string;
};

export type CorrectionWorkflowDefinition = {
  id: string;
  title: string;
  allowedRuntimeModes: RuntimeMode[];
  discoverCandidates: (ctx: WorkflowExecutionContext) => Promise<WorkflowCandidate[]>;
  renderCandidateMarkdown?: (candidate: WorkflowCandidate) => string;
};

export type WorkflowManifest = {
  formatVersion: 1;
  workflowId: string;
  workflowTitle: string;
  allowedRuntimeModes: RuntimeMode[];
  runtimeMode: RuntimeMode;
  target: WorkflowTargetInfo;
  createdAt: string;
  runId: string;
  summary: WorkflowSummary;
  candidates: WorkflowCandidate[];
};

export type WorkflowArtifactPaths = {
  manifestPath: string;
  previewReportPath: string;
  applyResultPath?: string;
  applyReportPath?: string;
};

export type WorkflowPreviewArtifacts = {
  manifest: WorkflowManifest;
  manifestHash: string;
  paths: WorkflowArtifactPaths;
};

export type WorkflowDriftIssue = {
  table: string;
  key: WorkflowRowKey;
  field: string;
  expected: JsonValue | null;
  actual: JsonValue | null;
  reason: "field_mismatch" | "row_missing";
};

export type WorkflowVerificationIssue = {
  table: string;
  key: WorkflowRowKey;
  field: string;
  reason: "unexpected_field_change" | "expected_value_mismatch" | "row_missing_after_update";
  expected?: JsonValue | null;
  actual?: JsonValue | null;
  before?: JsonValue | null;
  after?: JsonValue | null;
};

export type WorkflowVerificationResult = {
  passed: boolean;
  changedFields: string[];
  issues: WorkflowVerificationIssue[];
};

export type WorkflowCandidateApplyStatus =
  | "applied"
  | "skipped_non_actionable"
  | "skipped_due_to_drift"
  | "failed_verification"
  | "failed";

export type WorkflowCandidateApplyResult = {
  candidateId: string;
  label: string;
  status: WorkflowCandidateApplyStatus;
  detail?: string | null;
  driftIssues?: WorkflowDriftIssue[];
  verification?: WorkflowVerificationResult | null;
};

export type WorkflowApplySummary = {
  actionableCandidates: number;
  applied: number;
  skippedNonActionable: number;
  skippedDueToDrift: number;
  failedVerification: number;
  failed: number;
};

export type WorkflowApplyResult = {
  formatVersion: 1;
  workflowId: string;
  workflowTitle: string;
  runtimeMode: RuntimeMode;
  target: WorkflowTargetInfo;
  createdAt: string;
  runId: string;
  manifestPath: string;
  manifestHash: string;
  summary: WorkflowApplySummary;
  verificationPassed: boolean;
  candidateResults: WorkflowCandidateApplyResult[];
};

export type WorkflowRunOptions = {
  outputDir?: string;
  now?: Date;
  runId?: string;
};

