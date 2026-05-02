# Reklamation-Tests und Projekt-Event-Korrektur

## Datum

02.05.26

## Anlass

Das Handling von Reklamationen wurde fachlich umgestellt:

- **Reklamation** ist ein geschütztes System-Tag.
- Nutzer setzen oder entfernen dieses Tag nicht mehr über generische Tag-Picker.
- Reklamationen werden über fachliche Funktionen am Termin oder Projekt gemeldet bzw. aufgehoben.
- Diese Funktionen können einen optionalen Notizfluss starten.

Zusätzlich war im Projekt-Reklamationspfad ein Contract-Fehler vorhanden: Projekt-Mutation-Events verwendeten intern `appointmentId`, obwohl das Ereignis ein Projekt betrifft.

## Umsetzung

### Projekt-Reklamations-Event korrigiert

Geändert in:

- `shared/appointmentMutationEvents.ts`
- `shared/routes.ts`
- `server/services/projectsService.ts`

Für Projekt-Reklamationen gibt es jetzt einen eigenen Projekt-Mutation-Event-Contract mit `projectId`. Termin-Mutation-Events behalten unverändert `appointmentId`.

Damit ist der Response-Contract fachlich eindeutig:

- Termin-Reklamation → `appointmentId`
- Projekt-Reklamation → `projectId`

### Integrationstests erweitert

Geändert in:

- `tests/integration/server/appointments.park.integration.test.ts`

Ergänzt wurden Tests für:

- Projekt-Reklamations-Events mit `projectId`
- Absicherung, dass Projekt-Reklamations-Events kein `appointmentId` mehr enthalten
- No-op beim erneuten Setzen einer bereits vorhandenen Reklamation
- No-op beim Entfernen einer nicht vorhandenen Reklamation
- Reader-Blockade für Setzen und Entfernen
- Dispatcher-Zugriff auf Termin- und Projekt-Reklamation
- Version-Conflict bei veralteter Projektversion

### Browser-E2E-Tests erweitert

Geändert in:

- `tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`

Ergänzt wurden echte Browserpfade mit realen Testdaten für:

- Disponent meldet Termin-Reklamation und überspringt den Notizvorschlag
- Reklamation über eine Wochenkalender-Spanning-Tile
- Projekt-Reklamation mit übersprungenem Notizvorschlag
- Projekt-Reklamation ohne weiteren Vorschlagsdialog, wenn bereits eine passende Reklamationsnotiz existiert

Die bestehenden Browserpfade für Terminformular, Wochenkarte, Projektformular, Notizerstellung, Notizbehalten und Notizlöschen bleiben erhalten.

## Rollen und Sicherheit

Rollenbezug wurde ausdrücklich geprüft:

- Administratoren dürfen Reklamationen setzen und aufheben.
- Disponenten dürfen Reklamationen setzen und aufheben.
- Leser dürfen Reklamationen nicht setzen oder aufheben.
- Die serverseitige Durchsetzung bleibt maßgeblich; UI-Sichtbarkeit ist nur ergänzend.
- Generische Tag-Zuweisungen bleiben für geschützte System-Tags blockiert.

Die neue Testabdeckung prüft Reader-Blockaden und Dispatcher-Zugriff serverseitig. Browserseitig wurde zusätzlich ein Disponentenpfad mit echtem Notizvorschlagsfluss ergänzt.

## Verifikation

Erfolgreich ausgeführt:

- `npm run test:integration -- tests/integration/server/appointments.park.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`
- `npm run check`

Ergebnisse:

- Integration: 1 Datei, 22 Tests bestanden
- Browser-E2E: 1 Datei, 17 Tests bestanden
- `npm run check`: grün

## Nicht abgeschlossen

Folgende mögliche Ergänzungen bleiben für spätere Tests offen:

- fehlendes System-Tag **Reklamation**
- fehlende Notizvorlage **Reklamation**
- Journal-Einträge beim Setzen und Aufheben
- explizite Reader-UI-Unsichtbarkeit der Reklamationsaktionen

## Ergebnis

Die Reklamations-Testlandschaft deckt jetzt weitere zentrale Aufrufpfade ab. Der Projekt-Reklamations-Contract ist fachlich korrigiert und durch Integrationstests abgesichert.
