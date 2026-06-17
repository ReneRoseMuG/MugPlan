import { spawnSync } from "node:child_process";

const npmExecutable = process.execPath;
const npmCli = process.env.npm_execpath;

const steps = [
  { label: "check", args: ["run", "check"] },
  { label: "lint", args: ["run", "lint"] },
  { label: "audit", args: ["run", "audit"] },
  { label: "secrets", args: ["run", "secrets"] },
  { label: "analyze:arch", args: ["run", "analyze:arch"] },
  { label: "analyze:boundaries", args: ["run", "analyze:boundaries"] },
  { label: "analyze:knip", args: ["run", "analyze:knip"] },
];

function summarizeOutput(output) {
  const text = `${output ?? ""}`.trim();
  if (!text) {
    return "keine Zusatzdetails";
  }

  const relevantLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-4);

  return relevantLines.join(" | ");
}

function summarizeError(error) {
  if (!error) {
    return null;
  }

  return `${error.name}: ${error.message}`;
}

const results = [];

for (const step of steps) {
  const startedAt = Date.now();
  const result = spawnSync(npmExecutable, [npmCli, ...step.args], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
  const durationMs = Date.now() - startedAt;

  results.push({
    label: step.label,
    exitCode: result.status ?? 1,
    durationSeconds: (durationMs / 1000).toFixed(1),
    summary:
      summarizeError(result.error)
      ?? summarizeOutput(result.stdout || result.stderr),
  });
}

console.log("Lokaler Audit-Kurzreport");
console.log("========================");

for (const result of results) {
  const status = result.exitCode === 0 ? "OK" : "FAIL";
  console.log(`${status}  ${result.label}  (${result.durationSeconds}s)`);
  console.log(`  ${result.summary}`);
}

const failedCount = results.filter((result) => result.exitCode !== 0).length;

console.log("");
console.log(
  `Gesamt: ${results.length - failedCount} erfolgreich, ${failedCount} fehlgeschlagen, ${results.length} ausgeführt.`,
);

process.exit(failedCount === 0 ? 0 : 1);
