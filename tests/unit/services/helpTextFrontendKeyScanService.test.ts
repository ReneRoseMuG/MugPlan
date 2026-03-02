/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: UC Frontend-HelpKey-Scan fuer Seed
 *
 * Abgedeckte Regeln:
 * - Scanner extrahiert statische helpKey-Literale aus .ts/.tsx Dateien.
 * - Doppelte Verwendungen werden als duplicateKeys mit Vorkommenszahl gemeldet.
 * - Nicht-statische Verwendungen werden ignoriert.
 *
 * Fehlerfaelle:
 * - Frontend-Root fehlt und der Scanner bricht unkontrolliert ab.
 *
 * Ziel:
 * Verlaessliche Soll-Menge fuer den Hilfetext-Seed aus dem Frontend ableiten.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { scanFrontendHelpKeys } from "../../../server/services/helpTextFrontendKeyScanService";

const tempDirs: string[] = [];

function createTempFrontend(): string {
  const tempDir = fs.mkdtempSync(path.resolve(os.tmpdir(), "helpkey-scan-"));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(() => {
  for (const dirPath of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

describe("FT28 help text frontend key scan service", () => {
  it("collects static keys and reports duplicate usage counts", () => {
    const root = createTempFrontend();
    fs.mkdirSync(path.resolve(root, "components"), { recursive: true });
    fs.writeFileSync(
      path.resolve(root, "components", "A.tsx"),
      "<HelpIcon helpKey=\"alpha\" />\n<HelpIcon helpKey=\"duplicate\" />\n",
      "utf8",
    );
    fs.writeFileSync(
      path.resolve(root, "components", "B.ts"),
      "const config = { helpKey: \"duplicate\" };\nconst second = { helpKey: \"beta\" };",
      "utf8",
    );

    const result = scanFrontendHelpKeys(root);

    expect(result.scannedKeys).toEqual(["alpha", "beta", "duplicate"]);
    expect(result.duplicateKeys).toEqual([{ key: "duplicate", occurrences: 2 }]);
    expect(result.warnings.some((warning) => warning.includes("duplicate"))).toBe(true);
  });

  it("ignores dynamic key expressions", () => {
    const root = createTempFrontend();
    fs.writeFileSync(
      path.resolve(root, "dynamic.tsx"),
      "const key = \"x\";\n<HelpIcon helpKey={key} />\n<HelpIcon helpKey={`abc.${key}`} />",
      "utf8",
    );

    const result = scanFrontendHelpKeys(root);

    expect(result.scannedKeys).toEqual([]);
    expect(result.duplicateKeys).toEqual([]);
  });

  it("returns warning when frontend root does not exist", () => {
    const missingRoot = path.resolve(os.tmpdir(), "does-not-exist-helpkey-scan");
    const result = scanFrontendHelpKeys(missingRoot);

    expect(result.scannedKeys).toEqual([]);
    expect(result.duplicateKeys).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("not found"))).toBe(true);
  });
});
