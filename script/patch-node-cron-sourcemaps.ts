import { readFile, writeFile } from "fs/promises";
import path from "path";

const sourceMappingSuffix = "\n//# sourceMappingURL=node-cron.js.map";

async function stripSourceMapComment(filePath: string) {
  const content = await readFile(filePath, "utf8");
  if (!content.endsWith(sourceMappingSuffix)) {
    return false;
  }

  await writeFile(filePath, content.slice(0, -sourceMappingSuffix.length), "utf8");
  return true;
}

async function main() {
  const targets = [
    path.resolve("node_modules", "node-cron", "dist", "esm", "node-cron.js"),
    path.resolve("node_modules", "node-cron", "dist", "cjs", "node-cron.js"),
  ];

  let patchedFiles = 0;

  for (const target of targets) {
    try {
      if (await stripSourceMapComment(target)) {
        patchedFiles += 1;
      }
    } catch {
      // Ignore missing package files so npm install remains resilient.
    }
  }

  if (patchedFiles > 0) {
    console.log(`Patched node-cron sourcemap comments in ${patchedFiles} file(s).`);
  }
}

void main();
