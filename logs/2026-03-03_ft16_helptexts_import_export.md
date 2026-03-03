# FT16 UC16-09/10 Import/Export Hilfetexte - Umsetzungslog

**Datum:** 2026-03-03  
**Auftrag:** Umsetzung YAML-Import/Export fuer Hilfetexte inkl. Konfliktentscheidungen, Hash-Schutz, Admin-Guard und Integrationsabsicherung  
**Instanz:** `Releases/version01`

## 1. Ziel und Scope

Umgesetzt wurden UC 16/09 (Import aus Datei) und UC 16/10 (Export in Datei) fuer die HelpText-Verwaltung mit folgenden verbindlichen Regeln:

- Export als YAML-Download.
- Import als 2-Phasen-Ablauf (`Vorschau laden` -> `Import anwenden`).
- Export-Dateiname ohne Datum: `helptexts.yaml`.
- Leerdefinition Body: `null`, `""` oder nur Whitespaces.
- YAML-Verarbeitung ueber etablierte Library (kein eigener Parser).
- Beim `Import anwenden` wird die Datei serverseitig erneut geparst und validiert.
- Server vertraut nicht auf clientseitig normalisierte Vorschau-Daten.
- Nur Admin darf Import/Export ausfuehren.
- Keine Schema-Aenderungen, keine Protokollierung.

## 2. Technische Entscheidungen

### 2.1 YAML-Verarbeitung

- Dependency hinzugefuegt: `yaml` (npm package).
- Parsing/Serialisierung erfolgt im neuen Service `server/services/helpTextsYamlService.ts`.

### 2.2 Import-Sicherheitsmodell

Der Apply-Endpoint akzeptiert multipart mit:

- `file` (erneuter Upload)
- `fileHash` (aus Preview)
- `decisions` (JSON mit `{ helpKey, decision }`)

Serverseitig beim Apply:

1. Datei erneut lesen/parsen.
2. Vollvalidierung erneut ausfuehren.
3. SHA-256 Hash vergleichen (`FILE_HASH_MISMATCH` bei Abweichung).
4. Konfliktmenge neu bestimmen.
5. Entscheidungen strikt gegen Konfliktmenge pruefen.
6. Persistenz atomar in DB-Transaktion.

### 2.3 Leerheitsregel

`isBodyEmpty` behandelt als leer:

- `null`
- `undefined`
- `""`
- String mit nur Whitespaces (`trim().length === 0`)

Diese Regel steuert:

- `OVERWRITE_SILENT` wenn bestehender Body leer ist.
- `CONFLICT_DECISION_REQUIRED` wenn bestehender Body nicht leer ist.

### 2.4 Route-Reihenfolge

Spezifische GET-Routen wurden vor `/:helpKey` angeordnet, damit statische Pfade (`/export-yaml`, `/by-id/:id`) nicht vom Parameter-Endpoint abgefangen werden.

## 3. Geaenderte Dateien

### Backend

- `shared/routes.ts`
  - Neue Contracts:
    - `GET /api/help-texts/export-yaml`
    - `POST /api/help-texts/import-yaml/preview`
    - `POST /api/help-texts/import-yaml/apply`

- `server/lib/multipart.ts`
  - Erweiterung um `parseMultipartForm` fuer Datei + Textfelder im selben multipart-Request.
  - `parseMultipartFile` verwendet intern `parseMultipartForm`.

- `server/services/helpTextsYamlService.ts` (neu)
  - YAML parse/stringify
  - Import-Validierung
  - Konfliktklassifikation
  - Preview-Ergebnis
  - Apply-Logik mit Hash-Pruefung und Entscheidungsvalidierung

- `server/repositories/helpTextsRepository.ts`
  - `getHelpTextsByKeys(keys)`
  - `applyHelpTextImportInstructions(...)` mit DB-Transaktion

- `server/controllers/helpTextsController.ts`
  - `exportHelpTextsYaml`
  - `previewHelpTextsYamlImport`
  - `applyHelpTextsYamlImport`
  - Admin-Guard fuer neue Endpunkte

- `server/routes/helpTextsRoutes.ts`
  - Neue Endpunkte verdrahtet
  - Reihenfolge angepasst (statische Pfade vor `/:helpKey`)

### Frontend

- `client/src/components/HelpTextsImportExportDialog.tsx` (neu)
  - Export-Button
  - Import-Upload
  - Vorschau laden
  - Konfliktentscheidungen pro Item (`Ueberschreiben`/`Ueberspringen`)
  - `Import anwenden`
  - Ergebnis-Report und bestaetigendes Schliessen

- `client/src/components/HelpTextsPage.tsx`
  - Neuer Button `Import/Export`
  - Dialog-Integration
  - Nach erfolgreichem Import: Invalidierung `[/api/help-texts]`

### Tests / Doku

- `tests/integration/server/helpTexts.import-export.uc16.integration.test.ts` (neu)
- `docs/TEST_MATRIX.md`
  - Neuer Eintrag fuer obige Integrationssuite

### Dependency

- `package.json`
- `package-lock.json`
  - `yaml` hinzugefuegt

## 4. API-Verhalten (Ist nach Umsetzung)

### Export

`GET /api/help-texts/export-yaml`

- Admin-only (`403 FORBIDDEN` fuer Nicht-Admin)
- `Content-Type: text/yaml; charset=utf-8`
- `Content-Disposition: attachment; filename="helptexts.yaml"`
- YAML-Liste mit genau `help_key`, `title`, `body`

### Import Vorschau

`POST /api/help-texts/import-yaml/preview` (multipart)

- Admin-only
- Keine Persistenz
- Liefert `fileHash`, Summary, Konfliktliste
- Fehlercodes:
  - `INVALID_IMPORT_FILE`
  - `INVALID_IMPORT_FORMAT`
  - `VALIDATION_ERROR`
  - `PAYLOAD_TOO_LARGE`
  - `FORBIDDEN`

### Import anwenden

`POST /api/help-texts/import-yaml/apply` (multipart)

- Admin-only
- Re-Parse/Re-Validate/Re-Classify serverseitig
- Hash-Mismatch -> `409 FILE_HASH_MISMATCH`
- Erfolgsreport:
  - `createdCount`
  - `silentOverwrittenCount`
  - `decisionOverwrittenCount`
  - `skippedCount`

## 5. Durchgefuehrte Verifikation

Es wurden nur notwendige Verifikationsschritte ausgefuehrt (kein unnoetiger Gesamtlauf):

1. `npm run typecheck`  
   Ergebnis: **gruen**

2. Gezielte Integrationssuite (nur FT16-Datei):
   `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run -c vitest.integration.config.ts tests/integration/server/helpTexts.import-export.uc16.integration.test.ts`
   Ergebnis: **gruen (4/4 Tests)**

Abgedeckte Testfaelle:

- Export YAML-Struktur inkl. mehrzeiligem Body.
- Import: neu anlegen, stilles Ueberschreiben bei leerem Bestand-Body.
- Konfliktpfad mit `OVERWRITE` und `SKIP`.
- Ungueltige Datei und doppelte `help_key` -> keine Persistenz.
- Hash-Mismatch blockiert Apply.
- Admin-only Guard.

## 6. Aufgetretene Blocker und Loesung

### Blocker 1
- Symptom: Export lieferte JSON statt YAML.
- Ursache: Route `GET /api/help-texts/:helpKey` hat `/export-yaml` abgefangen.
- Loesung: Route-Reihenfolge korrigiert, statische GET-Routen vor `/:helpKey`.

### Blocker 2
- Symptom: Nicht-Admin bekam 200 auf Export.
- Ursache: gleicher Route-Matching-Fehler wie oben.
- Loesung: ebenfalls durch Route-Reihenfolge behoben.

## 7. Nebenbedingungen / Nicht umgesetzt

Bewusst nicht umgesetzt (außerhalb Scope):

- Zusätzliche Audit-/Protokollfunktionen.
- Datenbankschema-Änderungen.
- Erweiterung des Austauschformats über Root-Liste hinaus.

## 8. Ergebnis

UC 16/09 und UC 16/10 sind gemäß finaler Spezifikation implementiert:

- Admin-UI enthält `Import/Export`-Dialog.
- Export funktioniert als YAML-Datei `helptexts.yaml`.
- Import enthält Vorschau, Konfliktentscheidungen und manipulationssichere Anwendung.
- Nach erfolgreichem Import wird die Hilfetext-Ansicht aktualisiert.
- Gezielte Integrationsabsicherung ist grün.
