# PKG-04 Testliste

## Ziel von PKG-04
PKG-04 sichert P0-Anforderungen fuer Validierung und DTO-Verhalten:

1. Ungueltige Payloads werden als Validation Error behandelt.
2. Dokument-Extraktion speichert keine Daten implizit.
3. Fehlerhafte Provider-Antworten (invalides JSON) fuehren nicht zu Persistierung.

Alle Tests sind Unit-Tests mit Mocks.

## Abdeckungsuebersicht
- Datei `tests/unit/validation/dtoValidators.test.ts`: 4 Tests

## Datei `tests/unit/validation/dtoValidators.test.ts`

### 1) `maps invalid payload errors to 400 validation response`
- Service/Funktion: `handleZodError` in `server/controllers/validation.ts`
- Given:
  - Eine ungueltige Zod-Payload (`version = 0` bei `min(1)`).
  - Ein gemocktes `res` mit `status` und `json`.
- When:
  - `handleZodError(zodError, res)` wird aufgerufen.
- Then:
  - Rueckgabe ist `true`.
  - HTTP-Status wird auf `400` gesetzt.
  - Response enthaelt mindestens `message` und `field = "version"`.
- Kontext:
  - Dieser Test sichert das zentrale API-Fehlerformat fuer DTO-Validierungsfehler.

### 2) `returns false for non-zod errors`
- Service/Funktion: `handleZodError`
- Given:
  - Ein normaler `Error` (kein `ZodError`).
- When:
  - `handleZodError(error, res)` wird aufgerufen.
- Then:
  - Rueckgabe ist `false`.
  - Keine Manipulation von `res.status`/`res.json`.
- Kontext:
  - Damit bleibt die Fehlerweitergabe fuer nicht-validierungsbezogene Fehler intakt.

### 3) `extractFromPdf returns normalized extraction and never persists customer data`
- Service/Funktion: `documentProcessingService.extractFromPdf`
- Given:
  - Mocks fuer Text-Extraktion, KI-Provider und Normalisierung liefern einen gueltigen Flow.
  - `customersService.createCustomer` ist als Persistenz-Spy gemockt.
- When:
  - `extractFromPdf(...)` wird ausgefuehrt.
- Then:
  - Normalisierte Extraktion wird zurueckgegeben.
  - Pipeline-Schritte (`extractText -> provider -> validate`) werden aufgerufen.
  - `createCustomer` wird nicht aufgerufen.
- Kontext:
  - Der Extraktions-Endpoint darf ohne explizite Bestaetigung keine Kundendaten persistieren.

### 4) `does not persist when provider returns invalid JSON error`
- Service/Funktion: `documentProcessingService.extractFromPdf`
- Given:
  - Provider-Mock wirft `KI-Provider lieferte kein valides JSON`.
  - Persistenz-Spy auf `customersService.createCustomer`.
- When:
  - `extractFromPdf(...)` wird aufgerufen.
- Then:
  - Der Fehler wird propagiert.
  - Normalisierung wird nicht aufgerufen.
  - `createCustomer` wird nicht aufgerufen.
- Kontext:
  - Fehlerhafte KI-Antworten duerfen niemals zu impliziten Seiteneffekten fuehren.

## Warum diese Tests wichtig sind
- Sie sichern das API-Verhalten bei ungültigen DTOs.
- Sie verhindern ungewollte Persistenz im Dokument-Extraktionsprozess.
- Sie bilden die Sicherheitsgrundlage fuer nachgelagerte Freigabe-/Persistenzfluesse.
