import type { CorrectionWorkflowDefinition } from "./types";
import { assertWorkflowDefinitionValid } from "./validation";

const registry = new Map<string, CorrectionWorkflowDefinition>();

export function registerCorrectionWorkflow(workflow: CorrectionWorkflowDefinition): void {
  assertWorkflowDefinitionValid(workflow);
  if (registry.has(workflow.id)) {
    throw new Error(`Workflow '${workflow.id}' is already registered.`);
  }
  registry.set(workflow.id, workflow);
}

export function getCorrectionWorkflow(workflowId: string): CorrectionWorkflowDefinition {
  const workflow = registry.get(workflowId);
  if (!workflow) {
    const available = Array.from(registry.keys()).sort();
    throw new Error(
      `Unknown workflow '${workflowId}'.${available.length > 0 ? ` Available workflows: ${available.join(", ")}` : " No workflows are registered yet."}`,
    );
  }
  return workflow;
}

export function listCorrectionWorkflows(): CorrectionWorkflowDefinition[] {
  return Array.from(registry.values()).sort((left, right) => left.id.localeCompare(right.id));
}

