# 05.05.26 | UI-Fix | FT-04: Wochenkalender Tour-KW-Breite

## Zusammenfassung

Die expandierte Tour-KW-Planungsspalte im Wochenkalender wurde verbreitert und an die gemessene Breite der Mitarbeiter-Badges gekoppelt. Mitarbeiter-Badges sollen dadurch inklusive Entfernen-Button nicht mehr umbrechen.

## Art der Änderung

Kleiner lokaler UI-Fix in der bestehenden Wochenkalender-Struktur. Es wurden keine Backend-Contracts, Datenmodelle, API-Endpunkte, Persistenzpfade oder Rollenregeln geändert.

## Betroffene Features

- FT-04: Tourenplanung / Tour-KW-Planung
- Wochenkalender: Tour-KW-Personalspalte

Ein belastbarer Notion-Link wurde im Auftrag nicht verwendet.

## Konkrete Änderungen

- Die vorhandene Messlogik der Wochenkalender-Personalspalte unterscheidet jetzt zwischen gemessener Badge-Breite und daraus abgeleiteter Spaltenbreite.
- Die Spaltenbreite enthält zusätzlichen Innenabstand, damit Badge und Aktion nicht an der Kartengrenze gedrückt werden.
- Sichtbare Mitarbeiter-Badges werden im expandierten Zustand auf die gemessene Wochenbreite gestreckt.
- Badge-Messung und sichtbare Badge-Zeile verwenden `whitespace-nowrap`, damit Namen und Entfernen-Button nicht umbrechen.
- Der Fallback der expandierten Tour-KW-Personalspalte wurde verbreitert.

## Rollen

Keine Änderung an Rollen oder Berechtigungen.

- Mutierende Aktionen bleiben an die bestehenden Bedingungen für `ADMIN` und `DISPONENT`, Woche, Sperrstatus und Tour gebunden.
- Readonly- und Leser-Zustände bleiben unverändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `npm run typecheck`
- `npx eslint client/src/components/calendar/CalendarWeekView.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`

## Offene Punkte

- Kein Browser-Screenshot wurde nachgezogen.
- Weitere offene Dateien unter `docs/wiki/decisions/` gehören nicht zu diesem Journaleintrag.
