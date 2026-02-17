# 2026-FT21-deterministic-refactor

## Plan

Ziel: FT21-Extraktion fuer Dokumentkopf und Artikelliste deterministisch ohne KI im kritischen Pfad umstellen.

Geplante Kernschritte:

1. KI-Abhaengigkeit aus `documentProcessingService.extractFromPdf` entfernen.
2. Deterministische Parser fuer Header und Artikelbereich ergaenzen.
3. Bestehendes API-/UI-/Domain-Shape unveraendert halten.
4. Tests auf deterministic Flow umstellen und erweitern.
5. Architektur-/Implementierungsdoku aktualisieren.

## Umsetzung

### Ersetzte Funktionen (Alt -> Neu)

1. `documentProcessingService.extractFromPdf`
- Alt: `documentTextExtractor` -> `aiExtractionService` -> `extractionValidator` (+Fallback)
- Neu: `documentTextExtractor` -> `documentHeaderDeterministicParser` + `documentArticleDeterministicParser` -> `extractionValidator`

2. Fehlerpfad in FT21-Extract-Flow
- Alt: KI-/Fallback-orientierte Fehlerbilder
- Neu: `DocumentExtractionDeterministicError` mit 422-Mapping im Controller

### Neue Services

1. `server/services/documentHeaderDeterministicParser.ts`
- Label-basierte Extraktion fuer `Auftrag-Nr.`, `Kunden-Nr.`, `Kunden - Mobil`
- Label-/Werte-Blockmapping
- Positionsbasierte Adressblock-Extraktion (Name, Strasse, PLZ/Ort)
- Kundennummer-Guards (fehlend/mehrfach -> Fehler)

2. `server/services/documentArticleDeterministicParser.ts`
- Markerbereich `Menge Art.Nr.` bis `Gesamtbetrag`
- Mengenzeilen starten Positionen
- Mehrzeilige Beschreibung je Position
- Preis-/Steuerzeilen werden verworfen
- Leere Positionen werden verworfen

### Angepasste bestehende Dateien

- `server/services/documentProcessingService.ts`
- `server/controllers/documentExtractionController.ts`
- `tests/unit/validation/dtoValidators.test.ts`
- `tests/unit/services/documentProcessing.customerResolution.test.ts`
- `tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts`
- `tests/integration/server/documentExtraction.routes.liveAi.test.ts`
- `package.json` (`test:extraction:live` ohne Ollama-Check)
- `docs/TEST_MATRIX.md`
- `.ai/architecture.md`
- `.ai/implementation.md`

### Neue Testdateien

- `tests/unit/services/documentHeaderDeterministicParser.test.ts`
- `tests/unit/services/documentArticleDeterministicParser.test.ts`

## Probleme

1. Labelfeld-Position in Fixture-PDF
- Problem: `Kunden-Nr.` steht im extrahierten Text nicht vor dem ersten Artikelmarker.
- Entscheidung: Label-Suche global im Dokument, Adressblock weiterhin im Kopfbereich vor Startmarker.

2. Preiszeilen innerhalb mengenbasierter Positionen
- Problem: Zeilen wie `19 % ... EUR ...` wurden anfangs als Position erkannt.
- Entscheidung: Mengenparser und Preisfilter-Reihenfolge angepasst, Preis-/Steuerinhalte auf Positions- und Folgezeilen entfernt.

3. `package.json` Encoding
- Problem: Zwischendurch ungueltiges Parsing durch Encoding-Artefakt.
- Entscheidung: Datei auf UTF-8 ohne BOM normalisiert.

## Entscheidungen

1. Keine Aenderungen an `shared/schema.ts` oder `shared/routes.ts`.
2. Keine UI-/Layout-Aenderungen.
3. Provider-Interface bleibt im Codebestand, wird im FT21-Header-/Artikel-Flow nicht verwendet.
4. `Land` wird nicht geparst.

## Testergebnisse

Ausgefuehrter Lauf:

```bash
npx vitest run tests/unit/services/documentHeaderDeterministicParser.test.ts tests/unit/services/documentArticleDeterministicParser.test.ts tests/unit/validation/dtoValidators.test.ts tests/unit/services/documentProcessing.customerResolution.test.ts tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts tests/integration/server/documentExtraction.routes.liveAi.test.ts tests/integration/server/documentExtraction.routes.test.ts
```

Ergebnis:

- Testdateien: 7/7 gruen
- Tests: 28/28 gruen

Hinweis:

- Ein erwarteter 500-Pfad in `documentExtraction.routes.test.ts` loggt im Testlauf weiterhin bewusst `Internal Server Error: unexpected`; der Test selbst ist gruen.

## Performance-Messung

Gemessen mit Fixture `tests/fixtures/Gotthardt Anke 163214 AB.pdf`, 10 direkte `extractFromPdf`-Laeufe (`scope=project_form`):

- Median: `16.20 ms`
- P95: `17.06 ms`
- Mittelwert: `29.22 ms`

Interpretation:

- Der FT21-Kernpfad arbeitet lokal deterministisch ohne Netzwerk-/Provider-Roundtrip.
- Damit entfaellt die bisherige Laufzeit-/Verfuegbarkeitsabhaengigkeit vom KI-Provider im kritischen Header-/Artikel-Flow.
