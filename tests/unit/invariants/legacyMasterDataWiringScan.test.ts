/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktiver Code unter `client/`, `server/` und `shared/` referenziert keine entfernten Legacy-Stammdatenpfade mehr.
 * - Historische Migrationen sowie manuelle SQL-Rebuilds werden fuer diesen statischen Scan bewusst ausgenommen.
 *
 * Fehlerfaelle:
 * - Entfernte Verträge, Tabellen oder Legacy-Felder bleiben in produktiven Codepfaden verdrahtet.
 *
 * Ziel:
 * Produktive Restverdrahtung auf entfernte FT27-Altstrukturen frueh und dateischarf sichtbar machen.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCAN_ROOTS = ["client", "server", "shared"] as const;
const FILE_SUFFIXES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const FORBIDDEN_PATTERNS = [
  "component-products",
  "componentSpecifications",
  "component_specifications",
  "productComponent",
  "product_component",
  "specificationId",
  "specification_id",
] as const;

function walkFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    if (FILE_SUFFIXES.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("Release B invariant: no productive legacy master-data wiring remains", () => {
  it("contains no removed FT27 legacy tokens in client/server/shared source files", () => {
    const findings: string[] = [];

    for (const scanRoot of SCAN_ROOTS) {
      const absoluteRoot = path.resolve(ROOT, scanRoot);
      for (const filePath of walkFiles(absoluteRoot)) {
        const content = fs.readFileSync(filePath, "utf8");
        for (const token of FORBIDDEN_PATTERNS) {
          if (content.includes(token)) {
            findings.push(`${path.relative(ROOT, filePath)} -> ${token}`);
          }
        }
      }
    }

    expect(findings).toEqual([]);
  });
});
