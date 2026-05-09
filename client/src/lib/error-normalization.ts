export const SERVER_ERROR_CODES = [
  "VERSION_CONFLICT",
  "EMPLOYEE_OVERLAP_CONFLICT",
  "PAST_APPOINTMENT_READONLY",
  "PAST_WEEK_READONLY",
  "BUSINESS_CONFLICT",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "LOCK_VIOLATION",
  "ABSENCE_APPOINTMENT_READONLY",
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];

export type NormalizedServerErrorSeverity = "info" | "warning" | "error";

export interface NormalizedServerError {
  code: ServerErrorCode | "UNKNOWN";
  description: string;
  isKnownCode: boolean;
  severity: NormalizedServerErrorSeverity;
  status?: number;
  title: string;
}

export interface ErrorNormalizationFallback {
  description?: string;
  status?: number;
  title?: string;
}

interface ParsedServerError {
  code?: string;
  message?: string;
  status?: number;
}

const SERVER_ERROR_CODE_SET = new Set<string>(SERVER_ERROR_CODES);

const ERROR_TEXTS: Record<
  ServerErrorCode,
  Pick<NormalizedServerError, "description" | "severity" | "title">
> = {
  VERSION_CONFLICT: {
    title: "Änderungskonflikt",
    description:
      "Die Daten wurden zwischenzeitlich geändert. Laden Sie die Ansicht neu und führen Sie die Aktion erneut aus.",
    severity: "warning",
  },
  EMPLOYEE_OVERLAP_CONFLICT: {
    title: "Mitarbeiter ist bereits verplant",
    description:
      "Mindestens ein ausgewählter Mitarbeiter hat im Zeitraum bereits einen anderen Termin. Prüfen Sie die Auswahl und die Konflikte.",
    severity: "warning",
  },
  PAST_APPOINTMENT_READONLY: {
    title: "Historischer Termin ist gesperrt",
    description:
      "Vergangene Termine sind schreibgeschützt und können nicht mehr geändert werden.",
    severity: "warning",
  },
  PAST_WEEK_READONLY: {
    title: "Historische Kalenderwoche ist gesperrt",
    description:
      "Vergangene Kalenderwochen sind schreibgeschützt und können nicht mehr geändert werden.",
    severity: "warning",
  },
  BUSINESS_CONFLICT: {
    title: "Aktion ist fachlich nicht möglich",
    description:
      "Die Aktion passt nicht zum aktuellen Zustand der Daten. Prüfen Sie die Auswahl und versuchen Sie es erneut.",
    severity: "warning",
  },
  FORBIDDEN: {
    title: "Keine Berechtigung",
    description:
      "Ihre Rolle darf diese Aktion nicht ausführen. Die Änderung wurde nicht übernommen.",
    severity: "error",
  },
  VALIDATION_ERROR: {
    title: "Eingaben prüfen",
    description:
      "Mindestens eine Eingabe ist ungültig oder unvollständig. Prüfen Sie die markierten Angaben.",
    severity: "warning",
  },
  NOT_FOUND: {
    title: "Eintrag nicht gefunden",
    description:
      "Der angeforderte Eintrag ist nicht mehr verfügbar. Laden Sie die Ansicht neu.",
    severity: "warning",
  },
  LOCK_VIOLATION: {
    title: "Aktion ist gesperrt",
    description:
      "Der aktuelle Zustand erlaubt diese Aktion nicht. Prüfen Sie den Datensatz und versuchen Sie es erneut.",
    severity: "warning",
  },
  ABSENCE_APPOINTMENT_READONLY: {
    title: "Abwesenheitstermin ist gesperrt",
    description:
      "Abwesenheitstermine sind in diesem Dialog schreibgeschützt und können hier nicht geändert werden.",
    severity: "warning",
  },
};

const STATUS_CODE_DEFAULTS: Partial<Record<number, ServerErrorCode>> = {
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  422: "VALIDATION_ERROR",
};

export function isServerErrorCode(value: unknown): value is ServerErrorCode {
  return typeof value === "string" && SERVER_ERROR_CODE_SET.has(value);
}

export function extractServerErrorCode(error: unknown): ServerErrorCode | null {
  const parsed = parseServerError(error);

  if (isServerErrorCode(parsed.code)) {
    return parsed.code;
  }

  const inferredCode = inferServerErrorCode(parsed.message);
  if (inferredCode) {
    return inferredCode;
  }

  if (parsed.status) {
    return STATUS_CODE_DEFAULTS[parsed.status] ?? null;
  }

  return null;
}

export function normalizeServerError(
  error: unknown,
  fallback: ErrorNormalizationFallback = {},
): NormalizedServerError {
  const parsed = parseServerError(error);
  const status = parsed.status ?? fallback.status;
  const code =
    (isServerErrorCode(parsed.code) ? parsed.code : null) ??
    inferServerErrorCode(parsed.message) ??
    (status ? STATUS_CODE_DEFAULTS[status] ?? null : null);

  if (code) {
    return {
      ...ERROR_TEXTS[code],
      code,
      isKnownCode: true,
      status,
    };
  }

  return {
    code: "UNKNOWN",
    title: fallback.title ?? "Aktion fehlgeschlagen",
    description:
      fallback.description ??
      "Die Aktion konnte nicht abgeschlossen werden. Versuchen Sie es erneut oder laden Sie die Ansicht neu.",
    isKnownCode: false,
    severity: "error",
    status,
  };
}

export function getServerErrorText(error: unknown): string {
  const normalized = normalizeServerError(error);
  return `${normalized.title}: ${normalized.description}`;
}

function parseServerError(error: unknown): ParsedServerError {
  if (error instanceof Error) {
    const parsedMessage = parseErrorText(error.message);
    const cause =
      "cause" in error ? parseServerError((error as { cause?: unknown }).cause) : {};

    return mergeParsedErrors(parsedMessage, cause, { message: error.message });
  }

  if (typeof error === "string") {
    return parseErrorText(error);
  }

  if (!isRecord(error)) {
    return {};
  }

  const direct: ParsedServerError = {
    code: readString(error.code),
    message: readString(error.message),
    status: readNumber(error.status),
  };

  const response = isRecord(error.response)
    ? {
        status: readNumber(error.response.status),
      }
    : {};

  const body = parseKnownPayload(error.body);
  const data = parseKnownPayload(error.data);
  const payload = parseKnownPayload(error.payload);

  return mergeParsedErrors(direct, response, body, data, payload);
}

function parseErrorText(text: string): ParsedServerError {
  const status = parseStatusPrefix(text);
  const jsonPayload = parseJsonPayload(text);

  if (jsonPayload) {
    return mergeParsedErrors({ status }, parseKnownPayload(jsonPayload), {
      message: text,
    });
  }

  return {
    code: isServerErrorCode(text.trim()) ? text.trim() : undefined,
    message: text,
    status,
  };
}

function parseKnownPayload(payload: unknown): ParsedServerError {
  if (typeof payload === "string") {
    return parseErrorText(payload);
  }

  if (!isRecord(payload)) {
    return {};
  }

  return {
    code: readString(payload.code),
    message: readString(payload.message),
    status: readNumber(payload.status),
  };
}

function inferServerErrorCode(message: string | undefined): ServerErrorCode | null {
  if (!message) {
    return null;
  }

  const matches = message.match(/\b[A-Z][A-Z0-9_]+\b/g) ?? [];
  for (const match of matches) {
    if (isServerErrorCode(match)) {
      return match;
    }
  }

  return null;
}

function parseStatusPrefix(text: string): number | undefined {
  const match = text.match(/^\s*(\d{3})\s*:/);
  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[1], 10);
}

function parseJsonPayload(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function mergeParsedErrors(
  ...items: Array<ParsedServerError>
): ParsedServerError {
  return items.reduce<ParsedServerError>(
    (result, item) => ({
      code: result.code ?? item.code,
      message: result.message ?? item.message,
      status: result.status ?? item.status,
    }),
    {},
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
