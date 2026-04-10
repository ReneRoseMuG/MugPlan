# Auftragslog: KW-Testabdeckung für Tour- und Terminplanung

## Zweck

Erweiterung der bestehenden Testlandschaft für die KW-bezogene Tour- und Mitarbeiterplanung im größeren Kontext der Terminplanung.

Ausgangspunkt war die fachliche Einordnung über Notion, aktuelle Logs, den heutigen Testbestand und `docs/TEST_MATRIX.md`. Die lokalen Dateien `docs/architecture.md` und `docs/implementation.md` wurden dabei bewusst nicht als fachliche Wahrheitsquelle verwendet, sondern höchstens als grobe Architekturhilfe.

## Scope

Umgesetzt wurden gezielte Ergänzungen in Service-, Integrations- und Browser-Tests, um die priorisierten Dispositionspfade belastbar abzudecken:

- Termin auf Tour setzen, obwohl für die KW keine Wochenplanung existiert
- Wochenplan-Mutation mit versionsrelevantem Folgeeffekt für parallele Terminbearbeitung
- FT04-zu-FT31-Durchstich: Unterbesetzung nach Wochenplan-Entfernung im Monitoring sichtbar
- Datumswechsel eines bestehenden Tour-Termins in eine andere ISO-KW mit neuer Wochenplanbewertung
- manuelles Hinzufügen eines Mitarbeiters in einem bestehenden Termin über den echten Formular-Speicherpfad

Nicht umgesetzt wurde ein zusätzlicher neuer Browser-Test für einen vollständigen manuellen Remove-Add-Swap in einem einzigen Formularlauf. Der direkte Remove-Pfad ist bereits separat browserseitig abgedeckt; der neue AppointmentForm-Test ergänzt den manuellen Add-Pfad.

## Technische Entscheidungen

### Versionierung bei Wochenplan-Mutationen

`server/services/tourWeekEmployeesService.ts` bumpt nach erfolgreichem Add/Remove auf selektierten Terminen jetzt explizit die `appointment.version`.

Damit wird verhindert, dass eine parallel geöffnete Terminbearbeitung die durch Wochenplanung geänderte Mitarbeiterlage still überschreibt.

Bei einer Versionsabweichung wird der Vorgang kontrolliert als Konflikt abgebrochen.

### FT04-/FT31-Verkettung

Die Monitoring-Integration prüft jetzt nicht mehr nur direkte Terminmutationen, sondern auch den fachlich wichtigen Folgefall:

- Mitarbeiter wird über FT04 aus einer Wochenplanung entfernt
- Termin wird dadurch unterbesetzt
- FT31 zeigt diesen Termin danach als Treffer an

### Browser-Abdeckung

Im AppointmentForm wurden drei zusätzliche sichtbare Kernpfade abgesichert:

- Tour setzen ohne Wochenplanung
- KW-Wechsel bei bestehender Tour
- manuelles Hinzufügen eines Mitarbeiters über den echten Save-Pfad

Für den manuellen Add-Fall wird der Picker im Test über den Nachnamen gezielt auf den gewünschten Mitarbeiter eingeschränkt, damit der Browser-Test nur den beabsichtigten Nutzerpfad prüft.

## Betroffene Dateien

- `server/services/tourWeekEmployeesService.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Ausgeführte Verifikation

Erfolgreich und seriell ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/monitoring.ft31.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

Alle drei gezielten Läufe waren grün.

## Bekannte Einschränkungen

- Ein voller Audit und voller Testlauf über die Gesamtsuite wurde in diesem Auftrag nicht ausgeführt.
- Die ältere Architektur-/Implementierungsdoku bleibt weiterhin fachlich veraltet und wurde hier bewusst nicht synchronisiert.
- Ein separater neuer Browser-Kompletttest für manuellen Remove-und-Add-Swap im Terminformular existiert weiterhin nicht als eigener Einzeltest.

## Ergebnis in der App

Die Testlandschaft deckt die KW-bezogenen Dispositionsvorgänge im Bereich Touren und Terminplanung jetzt deutlich vollständiger ab.

Besonders sichtbar verbessert ist die Absicherung dort, wo Wochenplanung, Terminbearbeitung und Monitoring ineinandergreifen:

- Tour ohne Wochenplanung verändert keine bestehenden Termin-Mitarbeiter
- KW-Wechsel bewertet dieselbe Tour gegen die neue Wochenplanung
- Wochenplan-Entfernung erzeugt Monitoring-relevante Unterbesetzung
- parallele stale Termin-Saves werden nach Wochenplan-Mutationen blockiert
