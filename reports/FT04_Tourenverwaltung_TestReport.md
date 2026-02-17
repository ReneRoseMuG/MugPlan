# FT04 Tourenverwaltung - Test Report

architecture.md und rules.md gelesen und verstanden

## Gesamtuebersicht
- Ausfuehrung: `npm run test:run -- --reporter=default --reporter=json --outputFile=reports/ft04_full_test_results.json`
- Laufdatum: 2026-02-17
- Anzahl Tests gesamt: 270
- Erfolgreich: 267
- Fehlgeschlagen: 3
- Skipped: 0

## Detaillierte Ergebnisse je Testklasse

### TourTests
- Gesamt: 18
- Erfolgreich: 16
- Fehlgeschlagen: 2
- Skipped: 0
- Dateien:
  - `tests/integration/server/ft04.tour-management.integration.test.ts`
  - `tests/unit/ft04/TourTests.test.ts`

### EmployeeTourRelationshipTests
- Gesamt: 5
- Erfolgreich: 5
- Fehlgeschlagen: 0
- Skipped: 0
- Datei:
  - `tests/integration/server/ft04.employee-tour-relationship.integration.test.ts`

### MultiUserTests
- Gesamt: 4
- Erfolgreich: 4
- Fehlgeschlagen: 0
- Skipped: 0
- Datei:
  - `tests/integration/server/ft04.multi-user.integration.test.ts`

### RoleTests
- Gesamt: 3
- Erfolgreich: 2
- Fehlgeschlagen: 1
- Skipped: 0
- Datei:
  - `tests/integration/server/ft04.role.integration.test.ts`

## Fehlgeschlagene Tests

### 1) RoleTests - READER darf keine Tour anlegen/bearbeiten/loeschen
- Test: `FT04 integration: RoleTests enforces READER create/update/delete restrictions with server-side 403`
- Datei: `tests/integration/server/ft04.role.integration.test.ts`
- Erwartetes Verhalten:
  - READER-Operationen auf Tour-CRUD liefern serverseitig `403 FORBIDDEN`.
- Tatsaechliches Verhalten:
  - `POST /api/tours` liefert `201 Created` statt `403`.
- Technische Fehlermeldung:
  - `Error: expected 403 "Forbidden", got 201 "Created"`

### 2) TourTests - Name-Duplikat/Nummerierungslogik (Lueckenfall)
- Test: `FT04 Unit: TourTests fills naming gaps when lower numbers are missing`
- Datei: `tests/unit/ft04/TourTests.test.ts`
- Erwartetes Verhalten:
  - Bei vorhandenen Namen `Tour 1` und `Tour 3` wird naechster Name als `Tour 2` vergeben.
- Tatsaechliches Verhalten:
  - Es wird `Tour 4` vergeben.
- Technische Fehlermeldung:
  - `AssertionError: expected "vi.fn()" to be called with arguments: [ 'Tour 2', '#abcdef' ]`
  - `Received: [ 'Tour 4', '#abcdef' ]`

### 3) TourTests - Namefeld im Update-Contract
- Test: `FT04 Unit: TourTests documents that update contract rejects name changes`
- Datei: `tests/unit/ft04/TourTests.test.ts`
- Erwartetes Verhalten:
  - Update-Payload mit zusaetzlichem Feld `name` wird vom Contract abgelehnt.
- Tatsaechliches Verhalten:
  - Payload wird akzeptiert (`safeParse.success === true`), unbekanntes Feld wird nicht als Fehler gewertet.
- Technische Fehlermeldung:
  - `AssertionError: expected true to be false // Object.is equality`

## Zusammenfassung
- Bereiche mit hoher Fehlerquote:
  - `RoleTests`: 1/3 fehlgeschlagen (33.3%)
  - `TourTests`: 2/18 fehlgeschlagen (11.1%)
- Auffaellige Inkonsistenzen:
  - Rollen-Sollregel fuer READER (kein Tour-CRUD) ist im gemessenen API-Verhalten nicht durchgesetzt.
  - Namebezogene Sollannahmen kollidieren mit aktueller Implementierung:
    - Naechster Tourname orientiert sich an Anzahl vorhandener Touren, nicht an kleinster freier Nummer.
    - Update-Contract behandelt zusaetzliche Felder nicht als Validierungsfehler.
- Hinweise auf moegliche Architekturprobleme:
  - Fehlende explizite Autorisierungsschicht auf Tour-/TourEmployee-Endpunkten im Vergleich zu anderen Domainen mit klaren Rollen-Guards.
  - Contract-Strictness fuer Tour-Update ist inkonsistent zu erwarteter FT04-Regelintention bei Namensbearbeitung/Validierung.
