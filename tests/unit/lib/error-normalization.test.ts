import { describe, expect, it } from "vitest";

import {
  SERVER_ERROR_CODES,
  extractServerErrorCode,
  getServerErrorText,
  normalizeServerError,
  type ServerErrorCode,
} from "../../../client/src/lib/error-normalization";

describe("error-normalization", () => {
  const expectedTitles: Record<ServerErrorCode, string> = {
    VERSION_CONFLICT: "Änderungskonflikt",
    EMPLOYEE_OVERLAP_CONFLICT: "Mitarbeiter ist bereits verplant",
    PAST_APPOINTMENT_READONLY: "Historischer Termin ist gesperrt",
    PAST_WEEK_READONLY: "Historische Kalenderwoche ist gesperrt",
    BUSINESS_CONFLICT: "Aktion ist fachlich nicht möglich",
    FORBIDDEN: "Keine Berechtigung",
    VALIDATION_ERROR: "Eingaben prüfen",
    NOT_FOUND: "Eintrag nicht gefunden",
    LOCK_VIOLATION: "Aktion ist gesperrt",
    ABSENCE_APPOINTMENT_READONLY: "Abwesenheitstermin ist gesperrt",
  };

  it("maps all known server codes to German user-facing text", () => {
    for (const code of SERVER_ERROR_CODES) {
      const normalized = normalizeServerError({ code, status: 409 });

      expect(normalized.code).toBe(code);
      expect(normalized.isKnownCode).toBe(true);
      expect(normalized.title).toBe(expectedTitles[code]);
      expect(normalized.description).not.toContain(code);
      expect(normalized.title).not.toContain("_");
      expect(normalized.description).not.toContain("_");
    }
  });

  it("extracts codes from current query-client error strings", () => {
    const error = new Error(
      '409: {"code":"VERSION_CONFLICT","message":"VERSION_CONFLICT"}',
    );

    expect(extractServerErrorCode(error)).toBe("VERSION_CONFLICT");
    expect(normalizeServerError(error)).toMatchObject({
      code: "VERSION_CONFLICT",
      title: "Änderungskonflikt",
      status: 409,
    });
  });

  it("parses nested response payloads from mutation libraries", () => {
    const normalized = normalizeServerError({
      response: { status: 422 },
      data: { code: "VALIDATION_ERROR", message: "missing field" },
    });

    expect(normalized).toMatchObject({
      code: "VALIDATION_ERROR",
      title: "Eingaben prüfen",
      status: 422,
    });
  });

  it("uses status defaults when the backend sent no structured code", () => {
    expect(normalizeServerError("403: Forbidden")).toMatchObject({
      code: "FORBIDDEN",
      title: "Keine Berechtigung",
      status: 403,
    });
  });

  it("does not leak raw JSON or unknown codes into fallback messages", () => {
    const text = getServerErrorText(
      '500: {"code":"SOME_RAW_BACKEND_CODE","message":"stack"}',
    );

    expect(text).toContain("Aktion fehlgeschlagen");
    expect(text).not.toContain("SOME_RAW_BACKEND_CODE");
    expect(text).not.toContain("{");
  });
});
