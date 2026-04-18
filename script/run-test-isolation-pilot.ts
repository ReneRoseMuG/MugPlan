import { randomUUID } from "crypto";
import { spawn } from "child_process";

import { compareIsolationRuns, type FingerprintStatus, type IsolationRunSummary } from "../tests/helpers/testIsolationDiagnostics";

type CliOptions = {
  project: "integration" | "e2e" | "browser";
  suite: string;
  baseline: "core" | "seeded";
  storageProfile: "none" | "uploads" | "backups" | "both";
  canaryProfile: string | null;
  resetScope: "per-test" | "per-suite";
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const legacyRun = await runSuite(options, "legacy-reset");
  const candidateRun = await runSuite(options, "candidate-baseline");
  const candidateRepeatRun = await runSuite(options, "candidate-baseline");
  const comparison = compareIsolationRuns(legacyRun, candidateRun);

  printRunSummary(legacyRun);
  printRunSummary(candidateRun);
  printRunSummary(candidateRepeatRun);
  printComparisonSummary(comparison);

  if (!legacyRun.success || !candidateRun.success || !candidateRepeatRun.success || comparison.issues.length > 0) {
    process.exitCode = 1;
  }

  if (options.canaryProfile) {
    const canaryRun = await runSuite(options, "candidate-baseline", options.canaryProfile);
    printRunSummary(canaryRun);
    if (!canaryRun.success) {
      process.exitCode = 1;
    }
  }
}

function parseCliOptions(args: string[]): CliOptions {
  const getValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };

  const project = getValue("--project");
  const suite = getValue("--suite");
  const baseline = getValue("--baseline") ?? "core";
  const storageProfile = getValue("--storage") ?? "none";
  const canaryProfile = getValue("--canary");
  const resetScope = getValue("--reset-scope") ?? "per-suite";

  if ((project !== "integration" && project !== "e2e" && project !== "browser") || !suite) {
    throw new Error(
      "Usage: tsx script/run-test-isolation-pilot.ts --project integration|e2e|browser --suite <path> [--baseline core|seeded] [--storage none|uploads|backups|both] [--canary profile] [--reset-scope per-suite|per-test]",
    );
  }

  if (baseline !== "core" && baseline !== "seeded") {
    throw new Error(`Unsupported baseline: ${baseline}`);
  }

  if (storageProfile !== "none" && storageProfile !== "uploads" && storageProfile !== "backups" && storageProfile !== "both") {
    throw new Error(`Unsupported storage profile: ${storageProfile}`);
  }

  if (resetScope !== "per-suite" && resetScope !== "per-test") {
    throw new Error(`Unsupported reset scope: ${resetScope}`);
  }

  return {
    project,
    suite,
    baseline,
    storageProfile,
    canaryProfile,
    resetScope,
  };
}

async function runSuite(
  options: CliOptions,
  mode: "legacy-reset" | "candidate-baseline",
  canaryProfile: string | null = null,
): Promise<IsolationRunSummary> {
  const startedAt = Date.now();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const env = {
    ...sanitizeEnv(process.env),
    TEST_ISOLATION_MODE: mode,
    TEST_ISOLATION_TARGET_SUITE: options.suite,
    TEST_ISOLATION_BASELINE: options.baseline,
    TEST_ISOLATION_STORAGE_PROFILE: options.storageProfile,
    TEST_ISOLATION_CANARY_PROFILE: canaryProfile ?? "",
    TEST_ISOLATION_RESET_SCOPE: options.resetScope,
    TEST_ISOLATION_RUN_TOKEN: randomUUID(),
    TEST_ISOLATION_VERBOSE: "1",
  };
  const args = [
    "run",
    options.project === "browser" ? "test:e2e:browser" : `test:${options.project}`,
    "--",
    options.suite,
    ...(options.project === "browser" ? ["--reporter=line"] : ["--reporter=verbose"]),
  ];

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(getShellCommand(), getShellArgs(args), {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutChunks.push(text);
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrChunks.push(text);
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  const combinedOutput = `${stdoutChunks.join("")}\n${stderrChunks.join("")}`;

  return {
    suitePath: options.suite,
    mode,
    success: exitCode === 0,
    flaky: false,
    durationMs: Date.now() - startedAt,
    fingerprintStatus: extractFingerprintStatus(combinedOutput),
    failures: extractFailureSignatures(combinedOutput),
  };
}

function extractFingerprintStatus(output: string): FingerprintStatus {
  if (output.includes("[test-isolation] fingerprint:failed")) {
    return "failed";
  }

  if (output.includes("[test-isolation] fingerprint:passed")) {
    return "passed";
  }

  return "unknown";
}

function extractFailureSignatures(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("×") || line.startsWith("x") || line.includes(" FAIL "))
    .map((line) => line.replace(/^[×x]\s+/, ""));
}

function printRunSummary(run: IsolationRunSummary) {
  const status = run.success ? "PASS" : "FAIL";
  console.log(
    `[pilot] ${status} ${run.mode} suite=${run.suitePath} duration=${run.durationMs}ms fingerprint=${run.fingerprintStatus} failures=${run.failures.length}`,
  );
}

function printComparisonSummary(result: ReturnType<typeof compareIsolationRuns>) {
  if (result.issues.length === 0) {
    console.log("[pilot] comparison ok legacy-reset vs candidate-baseline");
    return;
  }

  console.log("[pilot] comparison issues:");
  for (const issue of result.issues) {
    console.log(`[pilot] - ${issue.kind}: ${issue.details}`);
  }
}

function sanitizeEnv(source: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function getShellCommand() {
  return process.platform === "win32" ? "cmd.exe" : "sh";
}

function getShellArgs(args: string[]) {
  const command = `npm ${args.map(quoteShellArg).join(" ")}`;

  if (process.platform === "win32") {
    return ["/d", "/s", "/c", command];
  }

  return ["-lc", command];
}

function quoteShellArg(value: string) {
  if (process.platform === "win32") {
    if (!/[ \t"]/u.test(value)) {
      return value;
    }

    return `"${value.replaceAll("\"", "\\\"")}"`;
  }

  if (!/[^\w./:-]/u.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
