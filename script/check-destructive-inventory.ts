import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const inventoryPath = path.resolve(repoRoot, "docs", "TEST_DB_SAFETY_INVENTORY.md");
const scanRoots = ["server", "tests", "script"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sql"]);

const destructivePatterns: Array<{ name: string; regex: RegExp }> = [
  { name: "TRUNCATE TABLE", regex: /\bTRUNCATE\s+TABLE\b/i },
  { name: "DROP TABLE", regex: /\bDROP\s+TABLE\b/i },
  { name: "DROP DATABASE", regex: /\bDROP\s+DATABASE\b/i },
  { name: "DELETE FROM backup_log", regex: /\bDELETE\s+FROM\s+backup_log\b/i },
  { name: "export purgeSeedRun", regex: /\bexport\s+async\s+function\s+purgeSeedRun\s*\(/ },
  { name: "export resetDatabase", regex: /\bexport\s+async\s+function\s+resetDatabase\s*\(/ },
];

function normalizeRel(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function shouldIgnore(relPath: string): boolean {
  return (
    relPath.startsWith("node_modules/") ||
    relPath.startsWith("dist/") ||
    relPath.startsWith("attached_assets/") ||
    relPath.startsWith("tests/coverage/") ||
    relPath.startsWith("docs/") ||
    relPath === "script/check-destructive-inventory.ts"
  );
}

function collectFiles(rootAbs: string, out: string[]): void {
  if (!fs.existsSync(rootAbs)) return;
  for (const entry of fs.readdirSync(rootAbs, { withFileTypes: true })) {
    const abs = path.join(rootAbs, entry.name);
    const rel = normalizeRel(path.relative(repoRoot, abs));
    if (shouldIgnore(rel)) continue;
    if (entry.isDirectory()) {
      collectFiles(abs, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    out.push(abs);
  }
}

function parseInventoryPaths(markdown: string): Set<string> {
  const result = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!match) continue;
    result.add(match[1].trim());
  }
  return result;
}

function main(): void {
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`Missing inventory file: ${normalizeRel(path.relative(repoRoot, inventoryPath))}`);
  }
  const inventoryText = fs.readFileSync(inventoryPath, "utf8");
  const inventoryPaths = parseInventoryPaths(inventoryText);

  const files: string[] = [];
  for (const root of scanRoots) {
    collectFiles(path.resolve(repoRoot, root), files);
  }

  const missing: Array<{ path: string; matches: string[] }> = [];

  for (const fileAbs of files) {
    const rel = normalizeRel(path.relative(repoRoot, fileAbs));
    const content = fs.readFileSync(fileAbs, "utf8");
    const matches = destructivePatterns
      .filter((pattern) => pattern.regex.test(content))
      .map((pattern) => pattern.name);
    if (matches.length === 0) continue;
    if (!inventoryPaths.has(rel)) {
      missing.push({ path: rel, matches });
    }
  }

  if (missing.length > 0) {
    console.error("Destructive path inventory check failed.");
    console.error("The following files match destructive patterns but are not listed in docs/TEST_DB_SAFETY_INVENTORY.md:");
    for (const item of missing) {
      console.error(`- ${item.path} (patterns: ${item.matches.join(", ")})`);
    }
    process.exit(1);
  }

  console.log("Destructive path inventory check passed.");
}

main();
