# Auftragslog: Projektfilter-Layout

## Zweck

In der View `Projekte` wurde die Reihenfolge der Filterleiste angepasst.

- Der Filter `Nachname Kunde` steht ganz links.
- Der Filter `Projektname` steht rechts neben `Kunde Nr.`.
- Der Filter `Tags` grenzt räumlich an die Schaltfläche `Projekte ohne Termin` an.

## Scope

Umgesetzt wurde eine reine UI-Layout-Anpassung im bestehenden Projektfilter-Panel.

Nicht Bestandteil:

- Änderung der Filterlogik
- Änderung von API-Contracts
- Änderung von Datenmodell, Persistenz oder Rollenlogik
- Redesign oder Austausch bestehender UI-Komponenten

## Technische Entscheidungen

1. Die vorhandenen Filter-Komponenten wurden weiterverwendet.
2. Die Reihenfolge wurde direkt in `ProjectFilterPanel` angepasst, weil dort die sichtbare Filterreihe zusammengesetzt wird.
3. Die streckende Breitenklasse am Projektscope-Bereich wurde entfernt, damit der Tagfilter nicht mehr weit nach rechts gedrückt wird.
4. Der bestehende Layout-Wiring-Test wurde auf die neue Reihenfolge angepasst.

## Betroffene Dateien

### Produktivcode

- `client/src/components/ui/filter-panels/project-filter-panel.tsx`

### Tests

- `tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`

## Hinweise zum Testen

Ausgeführt:

- `npm run test:run -- tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`

Ergebnis:

- Erfolgreich, 3 Tests bestanden.

Hinweis:

- Ein vorheriger Einzeltest-Aufruf mit `--runInBand` wurde nicht ausgeführt, weil Vitest diese Option in diesem Projekt nicht kennt.

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Die Änderung wurde nicht zusätzlich per Browser-Screenshot verifiziert.
