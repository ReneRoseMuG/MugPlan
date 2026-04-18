import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(".tmp-analysis");

fs.mkdirSync(outputDir, { recursive: true });
