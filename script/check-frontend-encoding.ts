import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const targetDir = path.join(rootDir, "client");
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".css"]);
const ignoredDirs = new Set([".git", "node_modules", "dist", "attached_assets", "logs"]);

const suspiciousPatterns: Array<{ label: string; regex: RegExp }> = [
  { label: "replacement-char", regex: /�/g },
  { label: "mojibake-utf8-latin1", regex: /Ã/g },
  { label: "mojibake-leading-byte", regex: /Â/g },
];

type Finding = {
  filePath: string;
  lineNumber: number;
  label: string;
  lineText: string;
};

function shouldScanFile(filePath: string) {
  return allowedExtensions.has(path.extname(filePath).toLowerCase());
}

function walkDirectory(dirPath: string, files: string[]) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, files);
      continue;
    }
    if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const pattern of suspiciousPatterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(lineText)) {
        findings.push({
          filePath: path.relative(rootDir, filePath),
          lineNumber: index + 1,
          label: pattern.label,
          lineText: lineText.trim(),
        });
      }
    }
  });

  return findings;
}

const files: string[] = [];
walkDirectory(targetDir, files);

const allFindings = files.flatMap((filePath) => scanFile(filePath));

if (allFindings.length > 0) {
  console.error("Frontend encoding check failed: suspicious mojibake patterns found.");
  for (const finding of allFindings) {
    console.error(
      `- ${finding.filePath}:${finding.lineNumber} [${finding.label}] ${finding.lineText}`,
    );
  }
  process.exit(1);
}

console.log(`Frontend encoding check passed (${files.length} files scanned).`);
