import fs from "fs";
import path from "path";

export type DuplicateHelpKey = {
  key: string;
  occurrences: number;
};

export type HelpTextFrontendKeyScanResult = {
  scannedKeys: string[];
  duplicateKeys: DuplicateHelpKey[];
  warnings: string[];
};

const HELP_KEY_LITERAL_PATTERN = /helpKey\s*[:=]\s*["']([^"'`]+)["']/g;

function collectSourceFiles(dirPath: string, files: string[]): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(nextPath, files);
      continue;
    }
    if (entry.isFile() && (nextPath.endsWith(".ts") || nextPath.endsWith(".tsx"))) {
      files.push(nextPath);
    }
  }
}

function scanHelpKeysFromContent(source: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null = HELP_KEY_LITERAL_PATTERN.exec(source);
  while (match) {
    keys.push(match[1]);
    match = HELP_KEY_LITERAL_PATTERN.exec(source);
  }
  HELP_KEY_LITERAL_PATTERN.lastIndex = 0;
  return keys;
}

export function scanFrontendHelpKeys(frontendRoot = path.resolve(process.cwd(), "client", "src")): HelpTextFrontendKeyScanResult {
  const warnings: string[] = [];
  if (!fs.existsSync(frontendRoot)) {
    warnings.push(`Frontend root not found: ${frontendRoot}`);
    return {
      scannedKeys: [],
      duplicateKeys: [],
      warnings,
    };
  }

  const sourceFiles: string[] = [];
  collectSourceFiles(frontendRoot, sourceFiles);

  const occurrences = new Map<string, number>();
  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    const keys = scanHelpKeysFromContent(source);
    for (const key of keys) {
      occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    }
  }

  const scannedKeys = Array.from(occurrences.keys()).sort((left, right) => left.localeCompare(right, "de"));
  const duplicateKeys = scannedKeys
    .map((key) => ({ key, occurrences: occurrences.get(key) ?? 0 }))
    .filter((entry) => entry.occurrences > 1);

  if (duplicateKeys.length > 0) {
    warnings.push(`Duplicate helpKey usages detected: ${duplicateKeys.map((entry) => `${entry.key} (${entry.occurrences})`).join(", ")}`);
  }

  return {
    scannedKeys,
    duplicateKeys,
    warnings,
  };
}
