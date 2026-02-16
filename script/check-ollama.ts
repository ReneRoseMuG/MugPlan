import { ensureOllamaAvailable } from "../server/lib/ollamaRuntime";

const OLLAMA_BASE_URL = (process.env.DOC_EXTRACT_OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim();
const OLLAMA_MODEL = (process.env.DOC_EXTRACT_OLLAMA_MODEL || "llama3.1:8b").trim();

async function main() {
  await ensureOllamaAvailable({
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    allowStart: true,
  });

  console.log(`Ollama ready at ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Ollama preflight failed: ${message}`);
  process.exit(1);
});
