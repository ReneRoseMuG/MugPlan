import { ensureOllamaAvailable } from "../lib/ollamaRuntime";

export type ExtractionScope = "project_form" | "appointment_form";

export type AiExtractionResult = {
  customer: {
    customerNumber: string;
    firstName: string;
    lastName: string;
    company?: string | null;
    email?: string | null;
    phone: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
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

class OllamaExtractionProvider implements ExtractionProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.DOC_EXTRACT_OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
    this.model = process.env.DOC_EXTRACT_OLLAMA_MODEL?.trim() || "llama3.1:8b";
  }

  async extractStructuredData(params: { scope: ExtractionScope; text: string }): Promise<AiExtractionResult> {
    await ensureOllamaAvailable({
      baseUrl: this.baseUrl,
      model: this.model,
      allowStart: true,
    });

    const prompt = [
      "Extrahiere Daten aus einem deutschsprachigen Auftragsdokument.",
      "Antworte strikt als JSON-Objekt ohne Markdown oder Zusatztext.",
      "Schema:",
      '{ "customer": { "customerNumber": string, "firstName": string, "lastName": string, "company": string|null, "email": string|null, "phone": string, "addressLine1": string|null, "addressLine2": string|null, "postalCode": string|null, "city": string|null }, "saunaModel": string, "articleItems": [ { "quantity": string, "description": string, "category": string } ], "warnings": string[] }',
      "Regeln:",
      "- Keine Preise extrahieren.",
      "- Artikelpositionen vollständig und unverändert im Inhalt lassen.",
      "- Kategorien nur semantisch vergeben.",
      "- Kundennummer exakt aus dem Dokument übernehmen.",
      `- Kontext: ${params.scope}`,
      "",
      "Dokumenttext:",
      params.text,
    ].join("\n");

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: "json",
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`KI-Provider nicht erreichbar (${this.baseUrl}): ${message}`);
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
