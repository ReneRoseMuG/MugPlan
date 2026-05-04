# 04.05.26 | Bugfix | Wochenkalender: Touren zuklappen mit KW-Spalte

## Zusammenfassung

Der Wochenkalender-Toggle `Touren -> Zugeklappt` wirkt wieder sichtbar, wenn die Tour-KW-Planungsspalte links vom Montag eingeblendet ist.

## Art der Änderung

Lokaler UI-Bugfix in der bestehenden Wochenkalender-Struktur mit ergänzender Unit- und Browser-Regression.

## Betroffene Features

- FT (04): Tourenplanung
- Wochenkalender
- Tour-KW-Planungsspalte

## Konkrete Änderungen

- Die linke Tour-KW-Spalte berücksichtigt nun denselben Lane-Collapse-Zustand wie der rechte Terminbereich.
- Kollabierte Tour-KW-Spalten-Bodies halten keine Lane-Höhe mehr offen.
- Der aktive Tour-Lane-Body bleibt geöffnet und kann weiterhin über die bestehenden Lane-Trigger gewechselt werden.
- Die Sperrfläche aus `Wochenplanung blockieren` wurde geprüft und blieb unverändert, da sie nur visuell wirkt und keine Pointer-Events blockiert.
- Rollen, Sperrlogik, Notizfunktionen und Mutationen wurden nicht verändert.

## Tests / Verifikation

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts --grep "KW-Plan-Toggle"`
- `git diff --check`

## Offene Punkte

- Ein vollständiger Browser-Gesamtlauf wurde für diesen lokalen Fix nicht ausgeführt.
