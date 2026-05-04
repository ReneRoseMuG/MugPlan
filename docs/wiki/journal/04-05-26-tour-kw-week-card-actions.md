# 04.05.26 | Änderung | FT-04: Tour-KW-Kartenaktionen im Wochenkalender

## Zusammenfassung

Die Tour-KW-Aktionen im Wochenkalender wurden von der Tour-Header-Bar an die Tour-KW-Kacheln der KW-Plan-Spalte verschoben. Die Kachel enthält jetzt das Drei-Punkt-Menü für `Notiz hinzufügen`, `Wochenplanung blockieren` und `Wochenplanung freigeben`. Zusätzlich zeigt sie einen Footer-Counter für Tour-KW-Notizen, der per Hover die vorhandenen Notizen zugänglich macht.

Parallel wurde die Rollenregel für laufende Tour-KWs erweitert: Dispatcher dürfen die aktuelle Tour-KW-Planung jetzt ebenfalls ändern. Vergangene Tour-KWs bleiben unverändert schreibgeschützt, Reader bleiben ohne Mutationsrechte.

## Art der Änderung

- Frontend-Verhalten im Wochenkalender geändert.
- Bestehenden Tour-KW-Notizflow an die KW-Plan-Kachel angebunden.
- Tour-Header-Bar um entfernte Tour-KW-Aktionen bereinigt.
- Server- und UI-Sperrlogik für Dispatcher in der laufenden KW angepasst.
- Integration-, Unit- und Browsertests für Rollen, Menüplatzierung, Notiz-Footer und Blockierflow ergänzt.

## Betroffene Features

- [FT-03: Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- [FT-04: Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)

Notion-Featureseiten wurden in dieser Session nicht herangezogen, weil die konkrete Fachregel vom Nutzer vorgegeben wurde und die lokale Feature- und Architekturdokumentation für die Einordnung ausreichte.

## Konkrete Änderungen

- Die Tour-KW-Kachel in der Wochenkalender-KW-Plan-Spalte rendert das Drei-Punkt-Menü.
- Der vorhandene Tour-KW-Notizdialog wird über `Notiz hinzufügen` aus dieser Kachel geöffnet.
- Die Kachel zeigt einen Notiz-Counter mit Hover-Vorschau für Tour-KW-Notizen.
- Blockieren und Freigeben der Wochenplanung sind in die Kachel gewandert.
- Die Tour-Header-Bar zeigt keine Tour-KW-Menü- und Notizaktionen mehr.
- `ADMIN` und `DISPONENT` dürfen laufende und zukünftige Tour-KWs ändern.
- Vergangene Tour-KWs bleiben serverseitig gesperrt.

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm exec tsc`
- `git diff --check`
- `npm run test:unit -- tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx tests/unit/ui/calendarWeekView.compactHeader.test.ts tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx --reporter=verbose`
- Safety-Gate für `.env.test`, `NODE_ENV=test`, `MUGPLAN_MODE=test`, Test-Datenbank-Allowlist und Test-Host-Allowlist
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`

## Offene Punkte

- Kein vollständiger Browser-Gesamtlauf über alle E2E-Dateien.
- Bestehende React-SSR-Warnungen zu `useLayoutEffect` im Hover-Preview-Umfeld bleiben in den Unit-Testausgaben sichtbar.
