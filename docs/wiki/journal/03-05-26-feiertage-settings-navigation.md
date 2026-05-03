# 03.05.26 | Änderung | Kalender und Einstellungen: Feiertage und Settings-Navigation

## Zusammenfassung

Feiertage und Betriebsfeiertage verhalten sich im Wochenkalender jetzt bei der Spaltenbreite wie Wochenendtage: Sie sind standardmäßig schmal und verbreitern sich nur, wenn reguläre Termine auf dem Tag liegen. Zusätzlich wurde die Feiertagsverwaltung für Disponenten in den Einstellungen verfügbar gemacht und die Settings-Navigation optisch sowie sprachlich vereinheitlicht.

## Art der Änderung

- Kalender-Layoutlogik
- Rollenabgesicherte Settings-Navigation
- Kalendermarker-Pflege
- UI-Polish in der Settings-Subnavigation
- Test- und Dokumentationsnachzug

## Betroffene Features

- FT-03 Kalenderansichten
- Kalendermarker / Feiertage und Betriebsferien
- Einstellungen / Admin- und Disponenten-Konfiguration

## Konkrete Änderungen

- `public_holiday` und `company_holiday` nutzen im Wochenkalender die kompakte Tagesbreite wie Wochenendtage.
- Reguläre Termine verbreitern Feiertags- und Betriebsfeiertagsspalten weiterhin auf normale Wochentagsbreite.
- Reine Abwesenheiten verbreitern diese Spalten nicht.
- Disponenten erhalten in den Einstellungen einen Navigationspunkt `Feiertage`.
- Kalendermarker-Pflege und Marker-Visualisierung sind serverseitig für `ADMIN` und `DISPONENT` abgesichert.
- Der Settings-Bereich heißt rollenübergreifend `Einstellungen` statt teils `Meine Einstellungen`.
- Die Settings-Subnavigation hat Icons für Oberfläche, Feiertage, Kalender, Sicherheit und Backup & Dump.
- Architektur-, Implementierungs- und Testmatrix-Dokumentation wurden gezielt aktualisiert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/settingsPage.navigation.test.tsx`
- `npm run test:integration -- tests/integration/server/calendarMarkers.integration.test.ts --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/settingsPage.navigation.test.tsx tests/unit/ui/sidebar.behavior.test.tsx`
- `npm run typecheck`
- `git diff --check`

## Hinweise

Es wurden keine Datenbankmigrationen und keine neuen API-Contracts erstellt. Die Rollenänderung betrifft ausschließlich die bestehende Kalendermarker-Pflege und wurde serverseitig abgesichert.
