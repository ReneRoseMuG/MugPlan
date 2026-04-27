# Rettungsstand und Merge-Plan am 2026-04-27

## Ziel dieses Logs

Dieses Log dokumentiert den Stand nach der Branch-Hygiene- und Rettungsarbeit am 27.04.2026. Es soll in einem frischen Chat als belastbare Übergabe dienen, damit die Arbeit ohne erneute Rekonstruktion des Verlaufs fortgesetzt werden kann.

Im Mittelpunkt stehen:

- welcher Branch als inhaltliche Basis gilt,
- welche fachlichen Änderungen aus `ft-tour-journal-week-journal` gesichert wurden,
- welche späteren Büro-Fixes bereits lokal nachgezogen wurden,
- was noch offen ist,
- und in welcher Reihenfolge der Projektstand am Ende sauber nach `work` gebracht werden soll.

## Rekonstruierter Branch-Verlauf

Die belastbare Rekonstruktion lautet:

- `temp_work_ft32_leser_release_check` ist der vollständigere Integrationsstand.
- Dieser Temp-Branch entstand ursprünglich aus `work` bzw. `origin/work` und diente zuerst als Merge-Test für:
  - `feature/ft32-change-notification-stage1`
  - `feature/leser-ui-readonly-release`
- Auf `temp_work_ft32_leser_release_check` wurden danach weitere Aufgaben erledigt. Der Branch ist daher kein reiner Test-Merge mehr, sondern ein echter Arbeitsstand.
- `ft-tour-journal-week-journal` wurde später nicht von `temp_work_ft32_leser_release_check`, sondern direkt auf Basis von `origin/work` bei Commit `83fe3cb` begonnen.
- Der erste fachliche Commit auf diesem Branch ist `3378477` mit Parent `83fe3cb`.
- Der lokale Checkout im Büro gegen `08:43` war nur die Übernahme des bereits vorher zu Hause angelegten und gepushten Remote-Branchs `origin/ft-tour-journal-week-journal`.

Die zentrale Schlussfolgerung daraus:

- `temp_work_ft32_leser_release_check` ist die bessere fachliche und technische Basis.
- Die Journal-Erweiterung aus `ft-tour-journal-week-journal` musste deshalb gezielt gerettet werden, statt diesen Branch insgesamt als Wahrheitsquelle zu behandeln.

## Was aus `ft-tour-journal-week-journal` fachlich gerettet werden musste

Als fachlich zwingend relevant wurde Commit `3378477` identifiziert:

- `3378477` — `Add tour and week journal tracking`

Die übrigen Commits auf `ft-tour-journal-week-journal` wurden getrennt bewertet:

- `da1f75d` — Schema-Grafik, nicht fachkritisch
- `2d346dc` — Audit-/Test-Report-Log, nicht fachkritisch
- `10b9390` — echter Büro-Fix, aber kein Kernbestandteil der Journal-Funktion
- `5a56816` — reine Browser-Test-Stabilisierung

Die Rettungsentscheidung lautete daher:

- Fach-Commit `3378477` muss erhalten bleiben.
- Spätere Folge-Commits werden nicht blind mitübernommen, sondern nur in begründeten Teilmengen.

## Bisher technisch erreicht

### 1. Rettungsbranch angelegt

Es wurde ein eigener Rettungsbranch auf Basis von `origin/temp_work_ft32_leser_release_check` angelegt:

- `rescue/tour-journal-from-temp`

Dieser Branch ist die aktuelle Arbeitsbasis für die Übernahme der fachlichen Journal-Erweiterung auf dem vollständigeren Temp-Stand.

### 2. Fach-Commit `3378477` erfolgreich transplantiert

Der Commit `3378477` wurde isoliert auf den Rettungsbranch übernommen.

Dabei gab es Konflikte in:

- `client/src/components/TourWeekForm.tsx`
- `tests/unit/ui/tourWeekForm.smoke.test.tsx`

Diese Konflikte wurden so aufgelöst, dass:

- die Readonly-/Temp-Branch-Logik erhalten bleibt,
- und die Journal-Funktion zusätzlich sauber eingebaut wird.

Der daraus entstandene Rettungscommit ist:

- `4bb868d` — `Add tour and week journal tracking`

Wichtig:

- `4bb868d` ist aktuell lokal vorhanden,
- aber noch **nicht nach `origin/rescue/tour-journal-from-temp` gepusht**.

### 3. Direkter Journal-Testkranz nach der Rettung war grün

Nach der Übernahme von `3378477` wurden gezielte Verifikationen durchgeführt. Diese waren grün:

- `tests/unit/services/journalService.test.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/tourWeekForm.smoke.test.tsx`
- `tests/integration/server/tourJournal.integration.test.ts`
- `tests/integration/server/journal.contexts.integration.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/integration/server/ft04.tour-management.integration.test.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

### 4. Voller Audit- und Testlauf auf dem Rettungsbranch

Danach wurde ein voller Report-Lauf durchgeführt.

Ergebnis:

- `audit:local` fast komplett grün, aber mit bekanntem Audit-Restpunkt um `exceljs`
- `test:unit` grün
- `test:integration -- --reporter=verbose` grün
- `test:e2e` grün
- `test:e2e:browser` zunächst nicht vollständig grün

Die zunächst offenen Browser-Fails waren:

- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`

## Bereits lokal nachgezogene Büro-Fixes

Die beiden branchspezifischen Browser-Probleme wurden danach gezielt analysiert.

Ergebnis:

- der `appointments-list.filter-scope`-Fail passte zu `5a56816`
- der `tour-week-form`-Fail passte zu `10b9390`

Es wurde bewusst **keine** Vollübernahme dieser Commits gemacht, sondern nur eine minimale Teilübernahme.

### Lokal übernommene Teilmengen

Folgende Dateien wurden lokal angepasst:

- `client/src/lib/calendar-appointments.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/unit/ui/calendarAppointments.queryOptions.test.ts`

Inhaltlich bedeutet das:

- Cache-Fix für Kalender-/Blocked-Week-Abfragen aus `10b9390`
- robusterer Browser-Testpfad für die Monatsübersicht
- Stabilisierung des Filter-Scope-Browser-Tests aus `5a56816`
- neuer Unit-Test für die Query-Optionen

Diese Teilübernahme wurde bereits gezielt verifiziert. Grün waren:

- `tests/unit/ui/calendarAppointments.queryOptions.test.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`

Wichtig:

- Diese Änderungen liegen **derzeit nur lokal als uncommittete Arbeitskopie** vor.
- Sie sind noch nicht in einem Commit gesichert.

## Offener Restpunkt: `notes.ft13.browser.e2e.spec.ts`

Nach der Teilübernahme blieb genau ein relevanter offener Browser-Punkt:

- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`

### Bisherige Analyse dazu

Die bisherige Analyse spricht klar dafür, dass dies **kein neuer Produktfehler** aus der Journal-Rettung ist, sondern ein instabiler Browser-Test.

Wichtige Befunde:

- Zwischen `ft-tour-journal-week-journal` und dem Rettungsbranch gibt es für diese Spec keinen relevanten Unterschied.
- Der kumulative FT13-Test war isoliert grün.
- Die Datei als Gesamtlauf war rot.
- Der erste rote Test im Dateilauf war schon:
  - `creates, counts and edits an appointment note with cardColor and print flag`
- Das deutet auf einen Reihenfolge-/Timing-Effekt im Notizdialog hin, nicht auf einen eindeutigen Fachfehler der FT13-Funktion.

### Bisheriger Reparaturversuch

Es wurde begonnen, den Helfer in `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts` zu stabilisieren:

- Dialog enger greifen
- Kartenfarbe dialoggebunden setzen
- nach dem Speichern nur den konkreten Dialog behandeln

Der nächste Schärfungsschritt war:

- nach dem Speichern notfalls genau den offenen Notizdialog mit seinem eigenen `button-cancel-note` schließen
- nicht mehr global mit allen `button-cancel-note`-Instanzen auf der Seite arbeiten

Dieser letzte Versuch ist **noch nicht verifiziert**.

Der zugehörige Testlauf wurde nach ungefähr einer Minute manuell abgebrochen, weil der Test hing.

Daraus folgt:

- Der FT13-Helfer-Fix ist aktuell **Work in Progress**.
- Er darf nicht als verifiziert oder fertig behandelt werden.

## Aktueller Git-Stand beim Abbruch

Branch:

- `rescue/tour-journal-from-temp`

Branch-Status:

- lokal `1` Commit vor `origin/rescue/tour-journal-from-temp`
- dieser eine Commit ist `4bb868d`

Aktuell lokale, noch nicht committete Änderungen:

- `client/src/lib/calendar-appointments.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/unit/ui/calendarAppointments.queryOptions.test.ts` (neu, untracked)
- `logs/2026-04-27_branch-chronologie-analyse.md` (neu, untracked)

Wichtige Einordnung:

- `4bb868d` ist der gesicherte fachliche Rettungscommit.
- Die Teilübernahmen aus `10b9390` und `5a56816` sind lokal vorhanden, aber noch nicht gespeichert.
- Der aktuelle FT13-Helfer-Fix in `notes.ft13.browser.e2e.spec.ts` ist ebenfalls nur lokal und noch unbestätigt.

## Was im frischen Chat als Erstes zu tun ist

Der neue Chat sollte **nicht** bei `work` beginnen, sondern bei diesem Rettungsbranch.

Empfohlener Start:

1. `git status` prüfen und den lokalen Arbeitsstand bestätigen.
2. Entscheiden, ob der aktuelle FT13-Helfer-Versuch behalten, überarbeitet oder verworfen werden soll.
3. Den FT13-Punkt gezielt fertig analysieren bzw. stabilisieren.
4. Danach die lokal bereits bewährten Teilübernahmen aus `10b9390` und `5a56816` zusammen mit dem finalen FT13-Stand sauber committen.
5. Erst danach den Rettungsbranch pushen.

## Sicherer Merge-Weg nach `work`

Die zentrale Sicherheitsregel lautet:

- **Nicht** `ft-tour-journal-week-journal` nach `work` mergen.
- **Stattdessen** den finalisierten Rettungsbranch `rescue/tour-journal-from-temp` nach `work` bringen.

Der Grund:

- `rescue/tour-journal-from-temp` basiert bereits auf `origin/temp_work_ft32_leser_release_check`
- und enthält zusätzlich die gerettete Journal-Funktion aus `3378477`

Damit ist dieser Rettungsbranch die saubere Konsolidierungslinie.

### Empfohlene Merge-Reihenfolge

1. Auf `rescue/tour-journal-from-temp` den offenen FT13-Punkt abschließen oder bewusst ausklammern.
2. Die lokal bewährten Teilübernahmen aus `10b9390` und `5a56816` sauber committen.
3. Den gesamten Rettungsbranch vollständig verifizieren:
   - gezielte Retests
   - danach wieder voller Audit-/Test-Report
4. `rescue/tour-journal-from-temp` nach `origin` pushen.
5. Erst dann auf `work` wechseln.
6. Lokales `work` sauber mit `origin/work` synchronisieren.
7. `rescue/tour-journal-from-temp` in `work` mergen.
8. Das Merge-Ergebnis auf `work` erneut prüfen.
9. Erst danach `work` pushen.

### Wichtige technische Einordnung dazu

Ein separater Merge erst von `temp_work_ft32_leser_release_check` und danach von `rescue/tour-journal-from-temp` ist technisch nicht nötig, wenn der Rettungsbranch final der gewünschte Gesamtstand ist.

Der Grund:

- `rescue/tour-journal-from-temp` ist direkt auf `origin/temp_work_ft32_leser_release_check` aufgebaut
- und enthält dessen Verlauf bereits vollständig

Wenn der Rettungsbranch also final sauber ist, reicht der Merge:

- `rescue/tour-journal-from-temp` -> `work`

### Was vor einem Merge nach `work` ausdrücklich **nicht** passieren sollte

- kein Merge von `ft-tour-journal-week-journal` direkt nach `work`
- kein Arbeiten auf dem veralteten lokalen `work`
- kein verfrühter Merge mit uncommitteten Änderungen
- kein Push von `work`, bevor der Rettungsbranch als Gesamtstand verifiziert ist

## Zusammenfassung für den nächsten Chat

Der belastbare Projektstand liegt derzeit auf:

- `rescue/tour-journal-from-temp`

Gesichert ist bereits:

- die fachliche Rettung von `3378477` als Commit `4bb868d`

Lokal zusätzlich vorhanden, aber noch ungesichert:

- Cache-/Browser-Fixes aus Teilmengen von `10b9390` und `5a56816`
- ein angefangener, aber noch nicht verifizierter FT13-Helfer-Fix
- die Analyse-Datei `logs/2026-04-27_branch-chronologie-analyse.md`

Die strategische Leitlinie für die Fortsetzung lautet:

- Rettungsbranch fertigstellen
- Rettungsbranch verifizieren
- Rettungsbranch pushen
- **dann** `rescue/tour-journal-from-temp` nach `work` mergen

Damit bleibt der vollständige Temp-Stand erhalten und die Journal-Erweiterung wird kontrolliert, statt über den problematischen Parallelbranch `ft-tour-journal-week-journal` nachgezogen zu werden.
