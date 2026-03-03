# FT21 Doc-Extract Duplikatabbruch und stiller Kundenmerge - Umsetzungslog

**Datum:** 2026-03-03  
**Auftrag:** Endlosschleife im Doc-Extract verhindern; frueher Abbruch bei bereits importierter Auftragsnummer; stille Behandlung bestehender Kunden inkl. Fuellen leerer Felder  
**Instanz:** `releases/work`

## 1. Zweck

Der FT21-Extraktionsfluss wurde so angepasst, dass:

- eine bereits importierte Auftragsnummer den Vorgang frueh mit klarer Fehlermeldung stoppt,
- kein Dialog-Loop durch wiederholte Confirmations entsteht,
- bestehende Kunden bei gleicher Kundennummer still uebernommen werden,
- beim bestehenden Kunden nur leere Felder aus dem Extract ergaenzt werden.

## 2. Scope

Umgesetzt innerhalb des vereinbarten Scopes:

- Aktiv fuer `project_form` und `appointment_form`.
- `customer_form` unveraendert.
- Contract-First beibehalten (`shared/routes.ts` angepasst).
- Architekturpfad beibehalten (Route -> Controller -> Service -> Repository).
- Keine UI-Neugestaltung/CSS-Aenderung.

## 3. Technische Entscheidungen

### 3.1 Frueher Auftragsnummer-Konflikt

- Neuer fachlicher Fehler `DocumentExtractionOrderConflictError` mit Code `ORDER_NUMBER_ALREADY_IMPORTED`.
- Pruefung in `extractFromPdf(...)` nur fuer `project_form` und `appointment_form`.
- Exakte DB-Pruefung auf `trim(order_number)` (nicht-null, nicht-leer).
- Controller-Mapping auf `409` mit Message `"Auftrag schon importiert"`.
- Wichtig: Konfliktfehler wird im Service-Catch explizit durchgereicht und nicht in `422` umgemappt.

### 3.2 Stille Kundenduplikatbehandlung

- Bei `resolution === "single"` wird der vorhandene Kunde ohne Benutzer-Confirmation uebernommen.
- `multiple` bleibt harter Abbruch (Dateninkonsistenz).

### 3.3 Best-Effort-Ergaenzung bestehender Kunden

- Beim uebernommenen Bestandskunden werden nur leere Felder mit Extract-Werten gefuellt:
  - `firstName`, `lastName`, `company`, `email`, `phone`, `addressLine1`, `addressLine2`, `postalCode`, `city`
- Bestehende Werte werden nicht ueberschrieben.
- Bei `VERSION_CONFLICT` wird einmal mit frisch geladenem Datensatz erneut versucht.
- Schlaegt der Patch weiterhin fehl, blockiert das nicht den Uebernahmefluss.

## 4. Betroffene Dateien

### Backend / Contracts

- `shared/routes.ts`
- `server/controllers/documentExtractionController.ts`
- `server/services/documentProcessingService.ts`
- `server/services/projectsService.ts`
- `server/repositories/projectsRepository.ts`

### Frontend

- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`

### Tests / Doku

- `tests/integration/server/documentExtraction.routes.test.ts`
- `tests/unit/validation/dtoValidators.test.ts`
- `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
- `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
- `docs/TEST_MATRIX.md`

## 5. Hinweise zum Testen

Empfohlene zielgerichtete Pruefungen:

1. Integration: `tests/integration/server/documentExtraction.routes.test.ts`
   - verifiziert u. a. `409 ORDER_NUMBER_ALREADY_IMPORTED`.
2. Integration: `tests/integration/server/documentExtraction.projectConflictFlow.integration.test.ts`
   - verifiziert reale Resolve/Create-Konfliktpfade.
3. Unit: `tests/unit/validation/dtoValidators.test.ts`
   - verifiziert deterministischen Conflict-Abbruch im Service.
4. Unit-Wiring:
   - `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
   - `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`

## 6. Bekannte Einschraenkungen

- Fuer den konkreten FT21-Flow existiert derzeit keine dedizierte Browser-E2E-Suite (`tests/e2e-browser`) mit realer Dialoginteraktion ueber den kompletten UI-Weg.
- Echte E2E-Tests im Repo decken primär andere Features ab; FT21 ist derzeit schwerpunktmaessig Unit+Integration abgesichert.
- Best-Effort-Kundenpatch ist absichtlich tolerant: er blockiert den Hauptfluss nicht, wenn ein Update nicht persistiert werden kann.
