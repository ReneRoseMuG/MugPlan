import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const targetDirs = ["client/src", "server", "shared"]
  .map((relativePath) => path.join(rootDir, relativePath))
  .filter((dirPath) => fs.existsSync(dirPath));

const allowedExtensions = new Set([".ts", ".tsx"]);
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "test-results",
  "attached_assets",
  "uploads",
]);

const allowlist = new Set([
  "Touren",
  "touren",
  "Mueller",
  "Bauer",
  "Neuer",
  "Mauer",
  "Steuer",
  "query",
  "Query",
  "request",
  "Request",
  "doesn",
  "Aue",
  "aue",
  "true",
  "blue",
  "queue",
  "value",
  "issue",
  "enue",
  "revenue",
  "continue",
  "unique",
  "technique",
  "rescue",
  "due",
  "clue",
  "glue",
]);

const suspiciousWordPattern = /\b\w*(ae|oe|ue)\w*\b/g;
const textSegmentPattern = /\/\*[\s\S]*?\*\/|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gm;

/**
 * @typedef {{
 *   filePath: string;
 *   lineNumber: number;
 *   matchText: string;
 * }} Finding
 */

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function shouldScanFile(filePath) {
  return allowedExtensions.has(path.extname(filePath).toLowerCase());
}

/**
 * @param {string} dirPath
 * @param {string[]} files
 */
function walkDirectory(dirPath, files) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

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

/**
 * @param {string} lineText
 * @returns {string[]}
 */
function findSuspiciousMatches(lineText) {
  const matches = [];
  suspiciousWordPattern.lastIndex = 0;

  for (const match of lineText.matchAll(suspiciousWordPattern)) {
    const matchText = match[0];
    if (!allowlist.has(matchText)) {
      matches.push(matchText);
    }
  }

  return matches;
}

/**
 * @param {string} content
 * @returns {Array<{ text: string; lineNumber: number; kind: "comment" | "string" }>}
 */
function extractTextSegments(content) {
  const segments = [];

  for (const match of content.matchAll(textSegmentPattern)) {
    const matchedText = match[0];
    const startIndex = match.index ?? 0;
    const lineNumber = content.slice(0, startIndex).split(/\r?\n/).length;
    const kind = matchedText.startsWith("//") || matchedText.startsWith("/*") ? "comment" : "string";
    segments.push({
      text: matchedText,
      lineNumber,
      kind,
    });
  }

  return segments;
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripSegmentDelimiters(text) {
  if (text.startsWith("//")) {
    return text.slice(2);
  }

  if (text.startsWith("/*")) {
    return text.slice(2, -2);
  }

  const quote = text[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    return text.slice(1, -1);
  }

  return text;
}

/**
 * @param {{ text: string; kind: "comment" | "string" }} segment
 * @returns {boolean}
 */
function isRelevantSegment(segment) {
  if (segment.kind === "comment") {
    return true;
  }

  const rawText = stripSegmentDelimiters(segment.text).trim();
  if (rawText.length === 0) {
    return false;
  }

  if (/[\\/@._:]/.test(rawText)) {
    return false;
  }

  if (/^[a-z][A-Za-z0-9]*$/.test(rawText)) {
    return false;
  }

  return /\s/.test(rawText) || /^[A-ZÄÖÜ]/.test(rawText);
}

/**
 * @param {string} filePath
 * @returns {Finding[]}
 */
function scanFile(filePath) {
  const findings = [];
  const content = fs.readFileSync(filePath, "utf8");
  const segments = extractTextSegments(content);

  segments.forEach((segment) => {
    if (!isRelevantSegment(segment)) {
      return;
    }

    const normalizedText = stripSegmentDelimiters(segment.text);
    const matches = findSuspiciousMatches(normalizedText);
    for (const matchText of matches) {
      findings.push({
        filePath: path.relative(rootDir, filePath),
        lineNumber: segment.lineNumber,
        matchText,
      });
    }
  });

  return findings;
}

const files = [];
for (const dirPath of targetDirs) {
  walkDirectory(dirPath, files);
}

const findings = files.flatMap((filePath) => scanFile(filePath));

if (findings.length > 0) {
  console.error("Encoding lint failed: suspicious ASCII umlaut sequences found.");
  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.lineNumber} ${finding.matchText}`);
  }
  process.exit(1);
}

console.log(`Encoding lint passed (${files.length} files scanned).`);
