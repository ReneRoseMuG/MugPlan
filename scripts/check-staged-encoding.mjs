import { execFileSync } from "node:child_process";
import path from "node:path";
import { TextDecoder } from "node:util";

const rootDir = process.cwd();

const textDecoder = new TextDecoder("utf-8", { fatal: true });

const allowedExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const allowedRootFiles = new Set([
  ".editorconfig",
  ".gitattributes",
  "agents.md",
  "AGENTS.md",
  "CLAUDE.md",
  "package.json",
]);

const targetPathPrefixes = [
  "client/",
  "server/",
  "shared/",
  "tests/",
  "docs/",
  "logs/",
  "script/",
  "scripts/",
  ".githooks/",
];

const ignoredPathPrefixes = [
  "node_modules/",
  "dist/",
  "coverage/",
  "test-results/",
  "attached_assets/",
  "uploads/",
];

const mojibakePatterns = [
  { label: "replacement-char", regex: /\uFFFD/g },
  { label: "mojibake-utf8-latin1", regex: /Ã[\u0080-\u00BF]/g },
  { label: "mojibake-leading-byte", regex: /Â[\u0080-\u00BF]/g },
  { label: "mojibake-smart-quotes", regex: /â[\u0080-\u00BF]{1,2}/g },
  { label: "mojibake-visible-smart-quote", regex: /â[€™œ”“”„…–—]/g },
];

const asciiUmlautAllowlist = new Set([
  "Aue",
  "aue",
  "aktuelle",
  "aktuellen",
  "Bauer",
  "blue",
  "clue",
  "continue",
  "doesn",
  "due",
  "enue",
  "glue",
  "issue",
  "aktuell",
  "aktueller",
  "manuell",
  "manuelle",
  "manuelles",
  "Mauer",
  "Mueller",
  "neuem",
  "Neue",
  "neue",
  "Neuen",
  "neuen",
  "Neuer",
  "neuer",
  "Neues",
  "neues",
  "query",
  "Quelle",
  "Query",
  "queue",
  "request",
  "Request",
  "rescue",
  "revenue",
  "Steuer",
  "steuert",
  "steuern",
  "steuernden",
  "technique",
  "Touren",
  "touren",
  "true",
  "unique",
  "umzubauen",
  "value",
  "visuell",
  "visuelles",
  "wochengenaue",
  "wochengenauen",
  "zuerst",
]);

const asciiUmlautPattern = /\b[A-Za-zÄÖÜäöüß]*(?:ae|oe|ue)[A-Za-zÄÖÜäöüß]*\b/g;
const codeTextSegmentPattern =
  /\/\*[\s\S]*?\*\/|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gm;

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function getStagedFiles() {
  const output = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  if (output.length === 0) {
    return [];
  }

  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((filePath) => filePath.replace(/\\/g, "/"));
}

function shouldScanFile(filePath) {
  if (ignoredPathPrefixes.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }

  if (filePath.startsWith(".githooks/")) {
    return true;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.has(extension) && !allowedRootFiles.has(filePath)) {
    return false;
  }

  return allowedRootFiles.has(filePath) || targetPathPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function getStagedContent(filePath) {
  return runGit(["show", `:${filePath}`]);
}

function getAddedLines(filePath) {
  const diff = runGit(["diff", "--cached", "--unified=0", "--no-color", "--", filePath]).toString("utf8");
  const addedLines = [];
  let nextNewLineNumber = 0;

  for (const line of diff.split(/\r?\n/)) {
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunkMatch) {
      nextNewLineNumber = Number.parseInt(hunkMatch[1], 10);
      continue;
    }

    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("+")) {
      addedLines.push({
        lineNumber: nextNewLineNumber,
        lineText: line.slice(1),
      });
      nextNewLineNumber += 1;
      continue;
    }

    if (line.startsWith("-")) {
      continue;
    }

    if (nextNewLineNumber > 0) {
      nextNewLineNumber += 1;
    }
  }

  return addedLines;
}

function decodeUtf8(raw, filePath) {
  try {
    return {
      content: textDecoder.decode(raw),
      findings: [],
    };
  } catch {
    return {
      content: "",
      findings: [
        {
          filePath,
          lineNumber: 1,
          label: "invalid-utf8",
          matchText: "Datei ist kein gültiges UTF-8.",
          lineText: "",
        },
      ],
    };
  }
}

function scanMojibake(lineText, filePath, lineNumber) {
  const findings = [];

  for (const pattern of mojibakePatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of lineText.matchAll(pattern.regex)) {
      findings.push({
        filePath,
        lineNumber,
        label: pattern.label,
        matchText: match[0],
        lineText: lineText.trim(),
      });
    }
  }

  return findings;
}

function stripCodeSegmentDelimiters(text) {
  if (text.startsWith("//")) {
    return text.slice(2);
  }

  if (text.startsWith("/*")) {
    return text.slice(2, -2);
  }

  const quote = text[0];
  if (quote === "\"" || quote === "'" || quote === "`") {
    return text.slice(1, -1);
  }

  return text;
}

function isLikelyTechnicalText(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (/^[A-Za-z0-9_.:/@#?=&%${}[\]()<>,|\\-]+$/.test(trimmed)) {
    return true;
  }

  if (/https?:\/\//i.test(trimmed)) {
    return true;
  }

  if (/(data-testid|aria-|className|import\s|from\s|export\s|require\(|=>)/.test(trimmed)) {
    return true;
  }

  return false;
}

function isRelevantCodeSegment(segmentText, kind) {
  if (kind === "comment") {
    return true;
  }

  const stripped = stripCodeSegmentDelimiters(segmentText);
  if (isLikelyTechnicalText(stripped)) {
    return false;
  }

  return /\s/.test(stripped) || /^[A-ZÄÖÜ]/.test(stripped);
}

function extractCodeSegments(content) {
  const segments = [];

  for (const match of content.matchAll(codeTextSegmentPattern)) {
    const text = match[0];
    const kind = text.startsWith("//") || text.startsWith("/*") ? "comment" : "string";
    segments.push({ text, kind });
  }

  return segments;
}

function scanAsciiUmlautsInText(text, filePath, lineNumber) {
  const findings = [];
  asciiUmlautPattern.lastIndex = 0;

  for (const match of text.matchAll(asciiUmlautPattern)) {
    const matchText = match[0];
    if (asciiUmlautAllowlist.has(matchText)) {
      continue;
    }

    findings.push({
      filePath,
      lineNumber,
      label: "ascii-umlaut",
      matchText,
      lineText: text.trim(),
    });
  }

  return findings;
}

function scanMarkdownAsciiUmlauts(lineText, filePath, lineNumber) {
  const findings = [];
  const trimmed = lineText.trim();
  if (
    trimmed.length === 0 ||
    trimmed.startsWith("```") ||
    trimmed.startsWith("|") ||
    /^\s*[-*]\s*\[[ x]\]/i.test(lineText) ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return findings;
  }

  const humanText = lineText
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  findings.push(...scanAsciiUmlautsInText(humanText, filePath, lineNumber));

  return findings;
}

function scanCodeAsciiUmlauts(lineText, filePath, lineNumber) {
  const findings = [];

  for (const segment of extractCodeSegments(lineText)) {
    if (!isRelevantCodeSegment(segment.text, segment.kind)) {
      continue;
    }

    const stripped = stripCodeSegmentDelimiters(segment.text);
    findings.push(...scanAsciiUmlautsInText(stripped, filePath, lineNumber));
  }

  return findings;
}

function scanAsciiUmlauts(lineText, filePath, lineNumber) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".md" || extension === ".txt" || allowedRootFiles.has(filePath)) {
    return scanMarkdownAsciiUmlauts(lineText, filePath, lineNumber);
  }

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
    return scanCodeAsciiUmlauts(lineText, filePath, lineNumber);
  }

  return [];
}

function scanFile(filePath) {
  const raw = getStagedContent(filePath);

  if (raw.length >= 2 && ((raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff))) {
    return [
      {
        filePath,
        lineNumber: 1,
        label: "utf16-bom",
        matchText: "Datei ist UTF-16 statt UTF-8.",
        lineText: "",
      },
    ];
  }

  const decoded = decodeUtf8(raw, filePath);
  if (decoded.findings.length > 0) {
    return decoded.findings;
  }

  return getAddedLines(filePath).flatMap((line) => [
    ...scanMojibake(line.lineText, filePath, line.lineNumber),
    ...scanAsciiUmlauts(line.lineText, filePath, line.lineNumber),
  ]);
}

const files = getStagedFiles().filter(shouldScanFile);
const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  console.error("Staged encoding check failed: Encoding-/Mojibake-Fälle gefunden.");
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.lineNumber} [${finding.label}] ${finding.matchText}`);
    if (finding.lineText) {
      console.error(`  ${finding.lineText}`);
    }
  }
  console.error("");
  console.error("Commit wurde gestoppt. Bitte Treffer korrigieren, erneut stage'n und den Commit wiederholen.");
  process.exit(1);
}

console.log(`Staged encoding check passed (${files.length} files scanned).`);
