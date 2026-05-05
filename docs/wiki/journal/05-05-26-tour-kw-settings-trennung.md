# 05.05.26 | UI-Nacharbeit | FT-04: Tour-KW-Settings getrennt

## Zusammenfassung

Die Tour-KW-Planung speichert ihren Einklappzustand jetzt unabhängig vom Wochenkalender. Beide Views können damit getrennt konfiguriert werden.

## Art der Änderung

Kleiner lokaler Fix in bestehender Settings- und UI-Struktur. Es wurden keine Backend-Contracts, Datenmodelle, Rollenregeln oder Mutationspfade geändert.

## Betroffene Features

- FT (04): Tourenplanung
- Tour-KW-View / Wochenplanung
- Wochenkalender-Lane-Konfiguration

## Konkrete Änderungen

- Der Wochenkalender verwendet weiter `calendar.weekLanes.isCollapsed` und `calendar.weekLanes.expandedLaneId`.
- Die Tour-KW-Planung verwendet neu `tourWeekPlanning.weekLanes.isCollapsed` und `tourWeekPlanning.weekLanes.expandedLaneId`.
- Die neuen Settings sind als benutzerspezifische Settings registriert.
- Frontend-Hook und Tour-KW-View wurden auf die getrennten Keys umgestellt.
- Tests sichern ab, dass die Tour-KW-Settings unabhängig von den Kalender-Lane-Settings aufgelöst werden.

## Rollen

Keine Änderung an Rollen oder Berechtigungen. Es wurde nur die benutzerspezifische UI-Konfiguration getrennt.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `npm run check`

## Offene Punkte

- Kein Commit und kein Push in diesem Auftrag.
- Weitere offene FT33-Dateien im Arbeitsbaum gehören nicht zu diesem Journaleintrag.
