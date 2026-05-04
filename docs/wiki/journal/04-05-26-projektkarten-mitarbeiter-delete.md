# 04.05.26 | Änderung | FT-02/FT-05: Projektkarten-Terminzeile und Mitarbeiter-Löschung

## Zusammenfassung

Die Projekt-Boardkarten zeigen die nächste Termininformation jetzt direkt im Kartenbody. Für Projekte mit mehreren Terminen wird der nächste Termin ab heute angezeigt. Die Terminzeile nutzt die Tourfarbe als abgeschwächten Hintergrund und bleibt dadurch erkennbar, ohne die Karte optisch zu dominieren.

Zusätzlich wurde die fachliche Rollenregel für das Löschen von Mitarbeitern geklärt und in den Integrationstests abgebildet: Admins dürfen Mitarbeiter löschen, Dispatcher und Reader werden serverseitig blockiert.

## Art der Änderung

- Frontend-UI in den Projekt-Entity-Cards angepasst.
- Projektlisten-Payload und Tests zur nächsten Terminanzeige nachgezogen.
- Integrationstest für Mitarbeiter-Löschung an die bestätigte Admin-Regel angepasst.
- Zusätzlicher Dispatcher-Test für die serverseitige Blockade ergänzt.
- Audit ohne Coverage und vollständige Testläufe ausgewertet.

## Betroffene Features

- [FT-02: Projekte](../features/ft-02-projekte/ft-02-projekte.md)
- [FT-05: Mitarbeiterverwaltung](../features/ft-05-mitarbeiterverwaltung/ft-05-mitarbeiterverwaltung.md)
- [FT-20: Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung](../features/ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung/ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md)

Notion-Featureseiten wurden für diese Nacharbeit nicht herangezogen. Die Änderungen ergaben sich direkt aus dem getesteten App-Verhalten, der bestätigten Rollenregel und den vorhandenen lokalen Code- und Testpfaden.

## Konkrete Änderungen

- Das Termin-Icon wurde aus dem Footer der Projektkarten entfernt.
- Die Projektkarte rendert im Body eine eigene Terminzeile mit Datum, optionaler Uhrzeit und Tour.
- Bei mehreren Terminen wird der von heute aus nächste Termin verwendet.
- Die Tourfarbe wird für die Terminzeile abgeschwächt als `rgba`-Tint genutzt.
- Die Projektlisten- und Entity-Card-Tests prüfen die neue Terminzeile und den abgeschwächten Farbstil.
- Der FT05-Integrationstest erwartet für Admin-Delete jetzt `204` und prüft anschließend, dass der Mitarbeiter nicht mehr abrufbar ist.
- Ein zusätzlicher Dispatcher-Test erwartet `403 FORBIDDEN` und prüft, dass der Mitarbeiter erhalten bleibt.
- Reader-Blockade bleibt ebenfalls getestet.

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx --reporter=verbose`
- `npm run typecheck`
- `npm run test:integration -- tests/integration/server/ft05.full-uc-coverage.integration.test.ts --reporter=verbose`
- `npm run test:integration -- --reporter=verbose`

Im Audit- und Testlauf der Session wurden außerdem ausgeführt:

- `npm run lint`
- `npm run audit`
- `npm run secrets`
- `npm run analyze:arch`
- `npm run analyze:boundaries`
- `npm run analyze:knip`
- `npm run test:unit -- --reporter=verbose`
- `npm run test:e2e -- --reporter=verbose`
- `npm run test:e2e:browser`

## Offene Punkte

- `npm run check` war im Audit wegen einer Encoding-Lint-Meldung in `TourEmployeeCascadeDialog.tsx` noch rot.
- `analyze:arch` meldete weiterhin Dependency-Warnungen.
- `analyze:knip` meldete weiterhin ungenutzte Dateien, Exporte und Abhängigkeiten; das Skript läuft dabei bewusst ohne roten Exit-Code.
