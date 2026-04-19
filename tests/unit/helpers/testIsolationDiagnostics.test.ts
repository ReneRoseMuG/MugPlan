/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Vergleich von Legacy- und Kandidatenlauf erkennt Candidate-only-Green.
 * - Candidate-only-Flakiness wird als eigener Befund markiert.
 * - Fingerprint-Fehler und unterschiedliche Fehlersignaturen werden sichtbar.
 *
 * Fehlerfaelle:
 * - Ein Kandidatenlauf weicht fachlich ab, ohne dass der Vergleich dies meldet.
 * - Unterschiedliche Fingerprint- oder Failure-Profile bleiben unbemerkt.
 *
 * Ziel:
 * Die Diagnose-Utility fuer Alt-vs-Neu-Vergleiche des Test-Isolationsumbaus isoliert absichern.
 */
import { describe, expect, it } from "vitest";

import { compareIsolationRuns, type IsolationRunSummary } from "../../helpers/testIsolationDiagnostics";

function buildRun(overrides?: Partial<IsolationRunSummary>): IsolationRunSummary {
  return {
    suitePath: "tests/integration/server/example.integration.test.ts",
    mode: "legacy-reset",
    success: true,
    durationMs: 100,
    fingerprintStatus: "passed",
    canaryProfile: null,
    failureSignatures: [],
    flaky: false,
    ...overrides,
  };
}

describe("test isolation diagnostics helper", () => {
  it("reports candidate-only-green when legacy fails but candidate passes", () => {
    const result = compareIsolationRuns(
      buildRun({ success: false, failureSignatures: ["ASSERTION_A"] }),
      buildRun({ mode: "candidate-baseline", success: true }),
    );

    expect(result.equivalent).toBe(false);
    expect(result.issues.some((issue) => issue.kind === "candidate_only_green")).toBe(true);
  });

  it("reports candidate-only-flaky when only the candidate run flakes", () => {
    const result = compareIsolationRuns(
      buildRun(),
      buildRun({ mode: "candidate-baseline", flaky: true }),
    );

    expect(result.equivalent).toBe(false);
    expect(result.issues.some((issue) => issue.kind === "candidate_only_flaky")).toBe(true);
  });

  it("reports fingerprint and failure-shape mismatches", () => {
    const result = compareIsolationRuns(
      buildRun({ success: false, failureSignatures: ["ASSERTION_A"] }),
      buildRun({
        mode: "candidate-baseline",
        success: false,
        fingerprintStatus: "failed",
        failureSignatures: ["ASSERTION_B"],
      }),
    );

    expect(result.equivalent).toBe(false);
    expect(result.issues.some((issue) => issue.kind === "fingerprint_mismatch")).toBe(true);
    expect(result.issues.some((issue) => issue.kind === "different_failure_shape")).toBe(true);
  });

  it("returns equivalent for matching stable runs", () => {
    const result = compareIsolationRuns(
      buildRun(),
      buildRun({ mode: "candidate-baseline" }),
    );

    expect(result).toEqual({
      suitePath: "tests/integration/server/example.integration.test.ts",
      equivalent: true,
      issues: [],
    });
  });
});
