import { ensureOllamaAvailable } from "../lib/ollamaRuntime";

export type ExtractionScope = "project_form" | "appointment_form" | "customer_form";

export type AiExtractionResult = {
  customer: {
    customerNumber: string;
    firstName: string;
    lastName: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  };
  orderNumber?: string | null;
  saunaModel: string;
  articleItems: Array<{
    quantity: string;
    description: string;
    category: string;
  }>;
  warnings?: string[];
};

export interface ExtractionProvider {
  extractStructuredData(params: {
    scope: ExtractionScope;
    text: string;
  }): Promise<AiExtractionResult>;
}

const DEFAULT_EXTRACTION_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_PROMPT_CHARS = 14_000;
const RELEVANT_TEXT_MARKERS = [
  "modell",
  "sauna",
  "artikel",
  "position",
  "menge",
  "beschreibung",
  "kundennummer",
  "kunde",
  "ofen",
];

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function buildRelevantPromptText(rawText: string, maxChars: number): string {
  const normalized = rawText.replace(/\r/g, "\n");
  if (normalized.length <= maxChars) return normalized;

  const lines = normalized.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const prioritized: string[] = [];
  const secondary: string[] = [];
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    if (RELEVANT_TEXT_MARKERS.some((marker) => normalizedLine.includes(marker))) {
      prioritized.push(line);
    } else {
      secondary.push(line);
    }
  }

  const selected: string[] = [];
  let length = 0;
  for (const line of [...prioritized, ...secondary]) {
    const nextLength = length + line.length + 1;
    if (nextLength > maxChars) break;
    selected.push(line);
    length = nextLength;
  }

  if (selected.length === 0) {
    return normalized.slice(0, maxChars);
  }
  return selected.join("\n");
}

class OllamaExtractionProvider implements ExtractionProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxPromptChars: number;

  constructor() {
    this.baseUrl = process.env.DOC_EXTRACT_OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
    this.model = process.env.DOC_EXTRACT_OLLAMA_MODEL?.trim() || "llama3.1:8b";
    this.timeoutMs = parsePositiveInt(process.env.DOC_EXTRACT_TIMEOUT_MS, DEFAULT_EXTRACTION_TIMEOUT_MS);
    this.maxPromptChars = parsePositiveInt(process.env.DOC_EXTRACT_MAX_PROMPT_CHARS, DEFAULT_MAX_PROMPT_CHARS);
  }

  async extractStructuredData(params: { scope: ExtractionScope; text: string }): Promise<AiExtractionResult> {
    await ensureOllamaAvailable({
      baseUrl: this.baseUrl,
      model: this.model,
      allowStart: true,
    });

    const promptText = buildRelevantPromptText(params.text, this.maxPromptChars);
    const prompt = [
      "Extrahiere Daten aus einem deutschsprachigen Auftragsdokument.",
      "Antworte strikt als JSON-Objekt ohne Markdown oder Zusatztext.",
      "Schema:",
      '{ "customer": { "customerNumber": string, "firstName": string, "lastName": string, "company": string|null, "email": string|null, "phone": string|null, "addressLine1": string|null, "addressLine2": string|null, "postalCode": string|null, "city": string|null, "country": string|null }, "orderNumber": string|null, "saunaModel": string, "articleItems": [ { "quantity": string, "description": string, "category": string } ], "warnings": string[] }',
      "Regeln:",
      "- Keine Preise extrahieren.",
      "- Artikelpositionen vollständig und unverändert im Inhalt lassen.",
      "- Kategorien nur semantisch vergeben.",
      "- Kundennummer exakt aus dem Dokument übernehmen.",
      `- Kontext: ${params.scope}`,
      "",
      "Dokumenttext:",
      promptText,
    ].join("\n");

    let response: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: "json",
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof Error && error.name === "AbortError";
      if (isTimeout) {
        throw new Error(`KI-Provider Timeout nach ${this.timeoutMs}ms`);
      }
      throw new Error(`KI-Provider nicht erreichbar (${this.baseUrl}): ${message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`KI-Provider antwortet nicht erfolgreich (HTTP ${response.status})`);
    }

    const payload = (await response.json()) as { response?: unknown };
    if (typeof payload.response !== "string" || payload.response.trim().length === 0) {
      throw new Error("KI-Provider lieferte keine verwertbare Antwort");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.response);
    } catch {
      throw new Error("KI-Provider lieferte kein valides JSON");
    }
    return parsed as AiExtractionResult;
  }
}

export function createExtractionProvider(): ExtractionProvider {
  const provider = process.env.DOC_EXTRACT_PROVIDER?.trim().toLowerCase() || "ollama";
  if (provider === "ollama") {
    return new OllamaExtractionProvider();
  }
  throw new Error(`Unbekannter Dokument-Extraktionsprovider: ${provider}`);
}
