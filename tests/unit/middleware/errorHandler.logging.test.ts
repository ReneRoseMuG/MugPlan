/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte errorHandler-Funktion mit isoliertem Logger-Mock.
 *
 * Mock-Entscheidung:
 * - logError wird gemockt, damit keine echten Laufzeitlogs geschrieben werden.
 *
 * Isolation:
 * - Kein Dateisystem- oder Datenbankzugriff.
 *
 * Abgedeckte Regeln:
 * - internal_server_error enthält User-Kontext, wenn req.userContext gesetzt ist.
 * - Öffentliche/anonyme Requests loggen keine User-Felder.
 *
 * Fehlerfälle:
 * - Error-Handler bleibt ohne req.userContext null-safe.
 *
 * Ziel:
 * Absicherung der User-Kontext-Metadaten im zentralen Error-Logging.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("../../../server/lib/logger")>("../../../server/lib/logger");
  return {
    ...actual,
    logError: vi.fn(),
  };
});

import { logError } from "../../../server/lib/logger";
import { errorHandler } from "../../../server/middleware/errorHandler";

function createResponse(overrides?: { headersSent?: boolean }) {
  return {
    headersSent: overrides?.headersSent ?? false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe("errorHandler logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs user context for authenticated errors", () => {
    const error = new Error("kaputt");
    const req = {
      userContext: {
        userId: 42,
        roleCode: "ADMIN",
        roleKey: "ADMIN",
        displayName: "Admin A",
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    errorHandler(error, req, res as any, next);

    expect(logError).toHaveBeenCalledWith("internal_server_error", {
      status: 500,
      message: "kaputt",
      error,
      userId: 42,
      userName: "Admin A",
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "kaputt" });
    expect(next).not.toHaveBeenCalled();
  });

  it("omits user context for anonymous errors", () => {
    const error = { status: 503, message: "Service unavailable" };
    const req = {} as any;
    const res = createResponse();
    const next = vi.fn();

    errorHandler(error, req, res as any, next);

    expect(logError).toHaveBeenCalledWith("internal_server_error", {
      status: 503,
      message: "Service unavailable",
      error,
    });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: "Service unavailable" });
    expect(next).not.toHaveBeenCalled();
  });
});
