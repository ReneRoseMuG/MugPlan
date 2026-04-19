export type IsolationMode = "legacy-reset" | "candidate-baseline";
export type FingerprintStatus = "passed" | "failed" | "unknown";

export type IsolationRunSummary = {
  suitePath: string;
  mode: IsolationMode;
  success: boolean;
  durationMs: number;
  fingerprintStatus: FingerprintStatus;
  canaryProfile?: string | null;
  failureSignatures?: string[];
  flaky?: boolean;
};

export type IsolationComparisonIssueKind =
  | "candidate_only_green"
  | "candidate_only_flaky"
  | "fingerprint_mismatch"
  | "different_failure_shape";

export type IsolationComparisonIssue = {
  kind: IsolationComparisonIssueKind;
  message: string;
};

export type IsolationComparisonResult = {
  suitePath: string;
  equivalent: boolean;
  issues: IsolationComparisonIssue[];
};

function normalizeSignatures(value: string[] | undefined): string[] {
  return [...new Set((value ?? []).map((entry) => entry.trim()).filter((entry) => entry.length > 0))].sort();
}

export function compareIsolationRuns(
  legacy: IsolationRunSummary,
  candidate: IsolationRunSummary,
): IsolationComparisonResult {
  const issues: IsolationComparisonIssue[] = [];

  if (legacy.suitePath !== candidate.suitePath) {
    throw new Error(`Isolation runs must reference the same suite. Got ${legacy.suitePath} and ${candidate.suitePath}.`);
  }

  if (legacy.fingerprintStatus !== "passed" || candidate.fingerprintStatus !== "passed") {
    issues.push({
      kind: "fingerprint_mismatch",
      message: `expected both fingerprints passed, got legacy=${legacy.fingerprintStatus}, candidate=${candidate.fingerprintStatus}`,
    });
  }

  if (!legacy.success && candidate.success) {
    issues.push({
      kind: "candidate_only_green",
      message: "candidate run passed while legacy run failed",
    });
  }

  if (!legacy.flaky && candidate.flaky) {
    issues.push({
      kind: "candidate_only_flaky",
      message: "candidate run is flaky while legacy run is stable",
    });
  }

  const legacyFailures = normalizeSignatures(legacy.failureSignatures);
  const candidateFailures = normalizeSignatures(candidate.failureSignatures);
  if (JSON.stringify(legacyFailures) !== JSON.stringify(candidateFailures)) {
    issues.push({
      kind: "different_failure_shape",
      message: `failure signatures differ: legacy=[${legacyFailures.join(", ")}], candidate=[${candidateFailures.join(", ")}]`,
    });
  }

  return {
    suitePath: legacy.suitePath,
    equivalent: issues.length === 0,
    issues,
  };
}
