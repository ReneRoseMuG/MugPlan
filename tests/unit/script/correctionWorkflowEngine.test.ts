import { describe, expect, it } from "vitest";
import { stableStringifyJson } from "../../../script/correction-workflows/json";
import { detectSnapshotDrift, verifyMutationChangeSet } from "../../../script/correction-workflows/engine";
import { assertWorkflowDefinitionValid } from "../../../script/correction-workflows/validation";
import type { CorrectionWorkflowDefinition, WorkflowSnapshotRow } from "../../../script/correction-workflows/types";

describe("correction workflow engine unit", () => {
  it("rejects incomplete workflow definitions", () => {
    const invalidWorkflow = {
      id: "invalid-workflow",
      title: "",
      allowedRuntimeModes: ["development"],
      discoverCandidates: async () => [],
    } as unknown as CorrectionWorkflowDefinition;

    expect(() => assertWorkflowDefinitionValid(invalidWorkflow)).toThrow("workflow.title must be a non-empty string.");
  });

  it("serializes manifest-like payloads in stable key order", () => {
    const left = {
      zeta: 1,
      alpha: {
        second: true,
        first: "x",
      },
    };
    const right = {
      alpha: {
        first: "x",
        second: true,
      },
      zeta: 1,
    };

    expect(stableStringifyJson(left)).toBe(stableStringifyJson(right));
  });

  it("detects drift when a frozen snapshot field changes", () => {
    const snapshot: WorkflowSnapshotRow = {
      table: "project",
      key: { id: 42 },
      data: {
        name: "Alt",
        version: 1,
      },
    };

    const issues = detectSnapshotDrift(snapshot, {
      id: 42,
      name: "Neu",
      version: 1,
    });

    expect(issues).toEqual([
      expect.objectContaining({
        table: "project",
        field: "name",
        reason: "field_mismatch",
      }),
    ]);
  });

  it("reports unexpected changed fields outside the allowlist", () => {
    const verification = verifyMutationChangeSet(
      "project",
      { id: 5 },
      {
        id: 5,
        name: "Alt",
        updated_at: "2026-04-30T10:00:00.000Z",
      },
      {
        id: 5,
        name: "Neu",
        updated_at: "2026-04-30T10:00:01.000Z",
      },
      { name: "Neu" },
      ["name"],
    );

    expect(verification.passed).toBe(false);
    expect(verification.issues).toEqual([
      expect.objectContaining({
        field: "updated_at",
        reason: "unexpected_field_change",
      }),
    ]);
  });
});

