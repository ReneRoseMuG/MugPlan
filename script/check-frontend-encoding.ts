import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const targetDirs = [
  path.join(rootDir, "client"),
  path.join(rootDir, "server"),
  path.join(rootDir, "shared"),
  path.join(rootDir, "tests"),
  path.join(rootDir, "docs"),
  path.join(rootDir, "script"),
];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".json"]);
const ignoredDirs = new Set([".git", "node_modules", "dist", "attached_assets", "logs", "coverage", "tests/coverage"]);

const suspiciousPatterns: Array<{ label: string; regex: RegExp }> = [
  { label: "replacement-char", regex: /\uFFFD/g },
  { label: "mojibake-utf8-latin1", regex: /Ã[\u0080-\u00BF]/g },
  { label: "mojibake-leading-byte", regex: /Â[\u0080-\u00BF]/g },
  { label: "mojibake-smart-quotes", regex: /â[\u0080-\u00BF]{1,2}/g },
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
  const raw = fs.readFileSync(filePath);

  const hasUtf16LeBom = raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe;
  const hasUtf16BeBom = raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff;
  if (hasUtf16LeBom || hasUtf16BeBom) {
    findings.push({
      filePath: path.relative(rootDir, filePath),
      lineNumber: 1,
      label: "utf16-bom",
      lineText: "File must be UTF-8 encoded.",
    });
    return findings;
  }

  const content = raw.toString("utf8");
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
for (const dirPath of targetDirs) {
  if (fs.existsSync(dirPath)) {
    walkDirectory(dirPath, files);
  }
}

const allFindings = files.flatMap((filePath) => scanFile(filePath));

if (allFindings.length > 0) {
  console.error("Encoding check failed: suspicious mojibake patterns found.");
  for (const finding of allFindings) {
    console.error(`- ${finding.filePath}:${finding.lineNumber} [${finding.label}] ${finding.lineText}`);
  }
  process.exit(1);
}

console.log(`Encoding check passed (${files.length} files scanned).`);
