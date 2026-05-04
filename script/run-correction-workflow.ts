import { applyCorrectionWorkflow, previewCorrectionWorkflow } from "./correction-workflows/engine";
import { getCorrectionWorkflow, listCorrectionWorkflows } from "./correction-workflows/registry";
import "./correction-workflows/workflows";

type ParsedArgs = {
  mode: "preview" | "apply";
  workflowId: string;
  manifestPath?: string;
  outputDir?: string;
};

function readOption(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return argv[index + 1];
}

function parseArgs(argv: string[]): ParsedArgs {
  const mode = argv[0];
  if (mode !== "preview" && mode !== "apply") {
    throw new Error(`Unknown mode '${mode ?? ""}'. Use 'preview' or 'apply'.`);
  }

  const workflowId = readOption(argv, "--workflow");
  if (!workflowId) {
    throw new Error("Missing required option '--workflow <id>'.");
  }

  const outputDir = readOption(argv, "--output-dir");
  const manifestPath = mode === "apply" ? readOption(argv, "--manifest") : undefined;
  if (mode === "apply" && !manifestPath) {
    throw new Error("Mode 'apply' requires '--manifest <path>'.");
  }

  return {
    mode,
    workflowId,
    manifestPath,
    outputDir,
  };
}

function printAvailableWorkflows(): void {
  const workflows = listCorrectionWorkflows();
  if (workflows.length === 0) {
    console.log("[correction-workflow] no workflows registered yet");
    return;
  }
  console.log("[correction-workflow] available workflows:");
  for (const workflow of workflows) {
    console.log(`- ${workflow.id}: ${workflow.title}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workflow = getCorrectionWorkflow(args.workflowId);

  if (args.mode === "preview") {
    const preview = await previewCorrectionWorkflow(workflow, {
      outputDir: args.outputDir,
    });
    console.log("[correction-workflow] preview complete", {
      workflowId: workflow.id,
      runId: preview.manifest.runId,
      manifestPath: preview.paths.manifestPath,
      previewReportPath: preview.paths.previewReportPath,
      manifestHash: preview.manifestHash,
      summary: preview.manifest.summary,
    });
    return;
  }

  const applyResult = await applyCorrectionWorkflow(workflow, args.manifestPath!, {
    outputDir: args.outputDir,
  });
  console.log("[correction-workflow] apply complete", {
    workflowId: workflow.id,
    runId: applyResult.runId,
    manifestPath: applyResult.manifestPath,
    manifestHash: applyResult.manifestHash,
    summary: applyResult.summary,
    verificationPassed: applyResult.verificationPassed,
  });
}

main().catch((error) => {
  console.error("[correction-workflow] failed", error instanceof Error ? error.message : String(error));
  printAvailableWorkflows();
  process.exit(1);
});
