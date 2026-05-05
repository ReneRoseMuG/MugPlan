# Wochenkalender Tour-KW-Breite

## Datum

05.05.26

## Zweck

Die expandierte Tour-KW-Planungsspalte im Wochenkalender war zu schmal. Lange Mitarbeiternamen konnten umbrechen und der Entfernen-Button konnte in eine zweite Zeile rutschen.

## Scope

- Lokaler Frontend-Fix in der bestehenden Wochenkalender-Komponente.
- Keine Änderung an Backend, Contracts, Datenmodell, Persistenz oder Rollenlogik.
- Keine Änderung an der separaten Tourenverwaltungs-Wochenplanung.

## Technische Entscheidungen

- Die bestehende Messlogik `week-personnel-badge-measurement` in `CalendarWeekView` bleibt der Einstiegspunkt.
- Die gemessene Badge-Breite wird getrennt von der Spaltenbreite gespeichert.
- Die Spaltenbreite rechnet zusätzlich festen Spalten-Innenabstand ein.
- Sichtbare Mitarbeiter-Badges werden im expandierten Zustand auf die gemessene Wochenbreite gestreckt und ohne Umbruch gerendert.
- Der Fallback für die expandierte Spalte wurde von einer sehr schmalen Breite auf eine nutzbare Mindestbreite angehoben.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`

## Rollen und Berechtigungen

Keine Rollenänderung.

- `ADMIN` und `DISPONENT` behalten die bestehenden mutierenden Tour-KW-Aktionen, sofern Woche, Tour und Sperrstatus dies erlauben.
- `LESER` bzw. Readonly-Ansichten erhalten weiterhin keine mutierenden Tour-KW-Aktionen.
- Die Änderung betrifft ausschließlich Breite, Darstellung und Umbruchverhalten.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `npm run typecheck`
- `npx eslint client/src/components/calendar/CalendarWeekView.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`

## Bekannte Einschränkungen

- Kein Browser-Screenshot wurde in diesem Auftrag nachgezogen.
- Der Arbeitsbaum enthielt bereits weitere, nicht zu diesem Auftrag gehörende Änderungen unter `docs/wiki/decisions/`.
