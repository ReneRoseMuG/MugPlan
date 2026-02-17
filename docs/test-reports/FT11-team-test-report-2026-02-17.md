# FT11 Team Test Report - 2026-02-17

architecture.md und rules.md gelesen und verstanden

## 1. Testuebersicht
- Anzahl Unit Tests (FT11): 14
- Anzahl Integrationstests (FT11): 10
- Gesamtanzahl (FT11): 24

Ergaenzung Volltestlauf (`npm run test -- --run`):
- Test Files: 81
- Tests gesamt: 294

## 2. Ergebnisuebersicht
- Anzahl bestanden (Volltestlauf): 291
- Anzahl fehlgeschlagen (Volltestlauf): 3
- Anzahl uebersprungen (Volltestlauf): 0

Ergaenzung FT11-neue Tests:
- Bestanden: 24
- Fehlgeschlagen: 0
- Uebersprungen: 0

## 3. Fehlgeschlagene Tests

### 3.1 `tests/integration/server/ft04.role.integration.test.ts` - `enforces READER create/update/delete restrictions with server-side 403`
- Erwartetes Verhalten:
  - READER darf Touren nicht anlegen/bearbeiten/loeschen (HTTP 403).
- Tatsaechliches Verhalten:
  - `POST /api/tours` liefert `201 Created` statt `403`.
- Vermutete Ursache (Analyse, kein Fix):
  - Fuer FT04-Tour-Endpunkte ist aktuell keine serverseitige Rollenpruefung fuer READER aktiv.

### 3.2 `tests/unit/ft04/TourTests.test.ts` - `fills naming gaps when lower numbers are missing`
- Erwartetes Verhalten:
  - Namensgenerator fuellt Luecke (`Tour 2`).
- Tatsaechliches Verhalten:
  - Service erzeugt `Tour 4`.
- Vermutete Ursache (Analyse, kein Fix):
  - Aktuelle Implementierung basiert auf `existing.length + 1` und prueft nur Kollisionen, sie fuellt keine numerischen Luecken.

### 3.3 `tests/unit/ft04/TourTests.test.ts` - `documents that update contract rejects name changes`
- Erwartetes Verhalten:
  - Update-Input mit `name` wird vom Contract abgelehnt.
- Tatsaechliches Verhalten:
  - Parse ist erfolgreich (`safeParse.success === true`).
- Vermutete Ursache (Analyse, kein Fix):
  - Update-Schema ist nicht als strict definiert; unbekannte Felder werden verworfen statt abgelehnt.

## 4. Auffaelligkeiten
- Soll/Ist-Differenz FT11 API-Schnitt: Team-Mitarbeiterverwaltung erfolgt getrennt ueber `/api/teams/:teamId/employees`, nicht direkt ueber Member-Felder in `POST/PATCH /api/teams`.
- Validierungsstatus im IST: Team-Validierungsfehler liefern `422` (nicht `400`).
- Rollenpruefung FT11: Im IST sind fuer Team-Endpunkte keine serverseitigen 403-Guards sichtbar; READER/DISPATCHER/ADMIN konnten im FT11-Rollentest Mutationen ausfuehren.
- Inaktive Mitarbeiter in Teams: Zuweisung inaktiver Mitarbeiter ist im IST moeglich.
- Duplicate-Assign im selben Batch: wird im IST ueber `VERSION_CONFLICT` sichtbar.

## 5. Fachliche Bewertung
Teilweise stabil.

Begruendung:
- FT11-Kernpfade (Create/Update/Delete, Member-Assign/Remove, Join-Cleanup) sind reproduzierbar und in neuen Tests stabil.
- Gegenueber der FT11-Sollbeschreibung bestehen relevante Luecken bei Rollenabsicherung und bei der fachlich erwarteten aktiven-Mitarbeiter-Validierung.