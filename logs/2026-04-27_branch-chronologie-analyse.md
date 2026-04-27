# Branch-Chronologie und Analyse seit 2026-04-25

## Zweck

Diese Datei dokumentiert die Commit- und Branch-Chronologie seit Freitag, 25.04.2026, sowie die daraus abgeleitete Analyse zur tatsächlichen Basis des aktuellen Arbeitsbranchs und zum Risiko einer weiteren Arbeit auf `work`.

## Gelesene Grundlagen

Für diese Analyse wurden gezielt nur Git-Historie, Reflog und die direkt passenden Logs herangezogen. Weitere Repo-Dokumentation war nicht nötig, weil es sich um eine reine Branch- und Verlaufsauswertung handelt.

Relevant waren insbesondere:

- `logs/2026-04-20_branch-hygiene.md`
- `logs/2026-04-25_doc-extract-fixture-suite.md`
- `logs/2026-04-27_tour-journal-week-journal.md`

## Chronologische Liste seit 2026-04-25

1. `2026-04-25 09:30:50 +0200`
   - Commit `2c21398`
   - Branch-Kontext: späterer Verlauf von `feature/leser-ui-readonly-release`
   - Inhalt: `Add reader and dispatcher form coverage`

2. `2026-04-25 13:06:10 +0200`
   - Commit `43d8df6`
   - Branch: `origin/feature/leser-ui-readonly-release`
   - Inhalt: `Fix encoding and small audit issues`

3. `2026-04-25 13:38:36 +0200`
   - Commit `83fe3cb`
   - Branch: `origin/work`
   - Inhalt: `Add doc extract fixture suite coverage`
   - Bedeutung: letzter belegter Remote-Stand von `work`, auf dem sowohl `temp_work_ft32_leser_release_check` als auch `ft-tour-journal-week-journal` historisch aufsetzen

4. `2026-04-25 14:45:46 +0200`
   - Commit `7ea39af`
   - Branch: `origin/feature/ft32-change-notification-stage1`
   - Inhalt: `Implement FT-32 change notification stage 1`

5. `2026-04-25 14:47:33 +0200`
   - Commit `c5fc0c1`
   - Branch: `temp_work_ft32_leser_release_check`
   - Inhalt: Merge von `feature/leser-ui-readonly-release` in `temp_work_ft32_leser_release_check`

6. `2026-04-25 14:48:12 +0200`
   - Commit `f7147ce`
   - Branch: `temp_work_ft32_leser_release_check`
   - Inhalt: Merge von `feature/ft32-change-notification-stage1` in `temp_work_ft32_leser_release_check`

7. `2026-04-25 15:16:30 +0200`
   - Commit `d7d378d`
   - Branch: `temp_work_ft32_leser_release_check`
   - Inhalt: `Fix merged temp branch lint regression`

8. `2026-04-26 10:42:41 +0200`
   - Commit `af98705`
   - Branch: `temp_work_ft32_leser_release_check`
   - Inhalt: `Align month calendar filter controls`

9. `2026-04-26 11:06:57 +0200`
   - Commit `91b16b3`
   - Branch: `temp_work_ft32_leser_release_check`
   - Inhalt: `Fix FT-32 initial SSE replay behavior`

10. `2026-04-26 11:07:56 +0200`
    - Commit `69e8f80`
    - Branch: `temp_work_ft32_leser_release_check`
    - Inhalt: `Add FT-32 SSE replay fix log`

11. `2026-04-26 11:52:50 +0200`
    - Commit `cc196d5`
    - Branch: `origin/feature/appointment-list-nearest-date-focus`
    - Inhalt: `Add appointment list date focus coverage`

12. `2026-04-26 11:53:02 +0200`
    - Commit `0ccbba3`
    - Branch: `temp_work_ft32_leser_release_check`
    - Inhalt: Merge von `feature/appointment-list-nearest-date-focus` in `temp_work_ft32_leser_release_check`

13. `2026-04-26 16:23:30 +0200`
    - Commit `4a7553b`
    - Branch: `temp_work_ft32_leser_release_check`
    - Inhalt: `Remove monitoring list row coloring`

14. `2026-04-26 16:25:56 +0200`
    - Commit `07c30d3`
    - Branch: `temp_work_ft32_leser_release_check`
    - Inhalt: `Fix employee form close button label`

15. `2026-04-26 16:52:25 +0200`
    - Commit `0d6249c`
    - Branch: `temp_work_ft32_leser_release_check`
    - Inhalt: `Add staged system seed preview and selection`

16. `2026-04-27 00:25:13 +0200`
    - Commit `d4d8cc8`
    - Branch: `origin/temp_work_ft32_leser_release_check`
    - Inhalt: `Strengthen test evidence and readonly browser coverage`

17. `2026-04-27 06:54:11 +0200`
    - Commit `3378477`
    - Branch: `ft-tour-journal-week-journal`
    - Inhalt: `Add tour and week journal tracking`
    - Bedeutung: erster Fach-Commit des aktuellen Arbeitsbranchs

18. `2026-04-27 06:55:55 +0200`
    - Commit `da1f75d`
    - Branch: `ft-tour-journal-week-journal`
    - Inhalt: `Add generated db schema diagram`

19. `2026-04-27 07:47:52 +0200`
    - Commit `2d346dc`
    - Branch: `ft-tour-journal-week-journal`
    - Inhalt: `Add audit and test report log`

20. `2026-04-27 08:43:54 +0200`
    - Reflog-Ereignis
    - Wechsel: Checkout von `feature/leser-ui-readonly-release` nach `ft-tour-journal-week-journal`
    - Bedeutung: erklärt den lokalen Wechselkontext, ist aber nicht die technische Commit-Basis des Branchs

21. `2026-04-27 09:55:19 +0200`
    - Commit `10b9390`
    - Branch: `ft-tour-journal-week-journal`
    - Inhalt: `Fix calendar cache audit followups`

22. `2026-04-27 12:24:39 +0200`
    - Commit `5a56816`
    - Branch: `ft-tour-journal-week-journal`
    - Inhalt: `Stabilize browser test follow-ups`

## Analyse

### 1. Zusammensetzung von `temp_work_ft32_leser_release_check`

Die Annahme zur Grundstruktur des Temp-Branchs ist durch die Historie bestätigt:

- Basis war der damalige Stand von `work`, konkret `83fe3cb` auf `origin/work`
- eingemergt wurden
  - `feature/ft32-change-notification-stage1`
  - `feature/leser-ui-readonly-release`

Zusätzlich wurde danach noch mindestens ein weiterer Branch hineingemergt:

- `feature/appointment-list-nearest-date-focus` über Merge-Commit `0ccbba3`

Außerdem erhielt der Temp-Branch mehrere direkte Folge-Commits, unter anderem:

- `d7d378d`
- `af98705`
- `91b16b3`
- `69e8f80`
- `4a7553b`
- `07c30d3`
- `0d6249c`
- `d4d8cc8`

Damit ist `temp_work_ft32_leser_release_check` kein reiner Test-Merge mehr, sondern ein eigenständig weiterentwickelter Integrationsstand.

### 2. Zustand von lokalem `work` und `origin/work`

Es ist wichtig, zwischen lokalem `work` und `origin/work` zu unterscheiden:

- lokales `work` steht auf `e0e3058`
- `origin/work` steht auf `83fe3cb`

Das lokale `work` ist damit veraltet. Eine neue Arbeit direkt auf dem lokalen `work` wäre riskant, weil bereits mindestens der Commit `83fe3cb` fehlt.

### 3. Tatsächliche Basis von `ft-tour-journal-week-journal`

Der kritische Punkt dieser Analyse ist die Frage, ob der aktuelle Branch `ft-tour-journal-week-journal` vom veralteten lokalen `work` oder von `origin/work` abgezweigt wurde.

Die Git-Historie spricht für folgende technische Basis:

- erster inhaltlicher Commit auf `ft-tour-journal-week-journal` ist `3378477`
- Parent von `3378477` ist `83fe3cb`

Damit hängt der aktuelle Branch historisch direkt an `origin/work` und nicht an dem älteren lokalen `work`-Commit `e0e3058`.

Der zusätzliche Reflog-Eintrag

- `2026-04-27 08:43:54 checkout: moving from feature/leser-ui-readonly-release to ft-tour-journal-week-journal`

bedeutet nur, dass lokal von diesem Branch aus auf den neuen Branch gewechselt wurde. Er beweist nicht, dass die Commit-Basis von dort stammt.

### 4. Verhältnis zwischen Temp-Branch und aktuellem Branch

Sowohl `temp_work_ft32_leser_release_check` als auch `ft-tour-journal-week-journal` setzen historisch auf `83fe3cb` auf, laufen danach aber unabhängig voneinander weiter.

Das bedeutet:

- `ft-tour-journal-week-journal` wurde nicht aus dem Temp-Branch fortgeführt
- `temp_work_ft32_leser_release_check` ist nicht in `ft-tour-journal-week-journal` enthalten
- beide Branches enthalten unterschiedliche Folgestände ab derselben Basis

### 5. Risiko bei Verwendung von `work`

Die Sorge vor Problemen mit `work` ist berechtigt, wenn damit das lokale `work` gemeint ist. Dieses ist nicht aktuell.

Das eigentliche Integrationsrisiko liegt aber noch eine Ebene höher:

- `work` lokal ist veraltet
- `origin/work` enthält weder den vollständigen Temp-Branch noch den aktuellen Journal-Branch
- `temp_work_ft32_leser_release_check` und `ft-tour-journal-week-journal` sind parallele Entwicklungslinien

Wenn nur einer dieser Branches nach `work` übernommen wird, fehlt jeweils ein erheblicher Teil des anderen Astes.

## Schlussfolgerung

Stand dieser Analyse:

- `temp_work_ft32_leser_release_check` war ein Merge-Branch auf Basis von `origin/work`
- darin wurden mindestens `feature/ft32-change-notification-stage1` und `feature/leser-ui-readonly-release` gemergt, später zusätzlich `feature/appointment-list-nearest-date-focus`
- der aktuelle Branch `ft-tour-journal-week-journal` basiert technisch auf `83fe3cb` und damit auf `origin/work`, nicht auf dem veralteten lokalen `work`
- lokales `work` ist dennoch veraltet und sollte nicht blind als Integrationsbasis verwendet werden

Für einen sauberen Weg zurück nach `work` reicht es sehr wahrscheinlich nicht, nur einen der beiden Branches zu übernehmen. Wahrscheinlich wird ein kontrollierter Integrationsbranch benötigt, der sowohl den Temp-Branch als auch den aktuellen Journal-Branch zusammenführt und erst danach geprüft nach `work` gemergt wird.

## Rettungsmatrix für `ft-tour-journal-week-journal`

Ziel dieser Matrix ist nicht, den gesamten Branch pauschal zu übernehmen, sondern die Commits nach fachlicher Relevanz und Integrationsrisiko zu trennen.

### 1. Commit `3378477` — `Add tour and week journal tracking`

- Bewertung: muss fachlich gerettet werden
- Einordnung: eigentlicher Fach-Commit des Branchs
- Betroffene Kernbereiche:
  - `client/src/components/TourEditForm.tsx`
  - `client/src/components/TourWeekForm.tsx`
  - `server/controllers/calendarWeekNotesController.ts`
  - `server/controllers/tourWeekEmployeesController.ts`
  - `server/controllers/tourWeeksController.ts`
  - `server/controllers/toursController.ts`
  - `server/lib/journalMessages.ts`
  - `server/repositories/journalRepository.ts`
  - `server/services/journalService.ts`
  - `server/services/toursService.ts`
- Begründung:
  - Dieser Commit enthält die eigentliche Journal-Erweiterung für Touren und Tour-Wochen.
  - Er ist der erste inhaltliche Commit des Branchs und hängt direkt an `83fe3cb`.
  - Wenn die fachliche Erweiterung erhalten bleiben soll, ist dies der zentrale Rettungskandidat.
- Empfehlung:
  - gezielt und isoliert auf Basis von `temp_work_ft32_leser_release_check` prüfen und übernehmen
  - nicht gemeinsam mit den späteren Follow-up-Commits pauschal mitziehen

### 2. Commit `da1f75d` — `Add generated db schema diagram`

- Bewertung: nicht fachlich notwendig
- Einordnung: Dokument-/Asset-Commit
- Betroffene Datei:
  - `docs/db-schema.svg`
- Begründung:
  - Keine erkennbare fachliche oder technische Produktivlogik.
  - Für die Rettung der Journal-Funktion nicht erforderlich.
- Empfehlung:
  - nur übernehmen, wenn das Diagramm ausdrücklich benötigt wird
  - sonst weglassen

### 3. Commit `2d346dc` — `Add audit and test report log`

- Bewertung: optional, rein dokumentarisch
- Einordnung: Log-Commit ohne Produktiv- oder Testcode
- Betroffene Datei:
  - `logs/2026-04-27_audit-test-report.md`
- Begründung:
  - Enthält nur Report-Dokumentation.
  - Für die fachliche Journal-Erweiterung und für die technische Integration nicht erforderlich.
- Empfehlung:
  - nicht Teil der fachlichen Rettung
  - nur bei Bedarf separat dokumentarisch übernehmen

### 4. Commit `10b9390` — `Fix calendar cache audit followups`

- Bewertung: separat prüfen, nicht automatisch mitretten
- Einordnung: echter Folge-Commit mit Produktiv-, Audit- und Testanteilen, aber nicht Kern der Journal-Erweiterung
- Betroffene Bereiche:
  - `client/src/lib/calendar-appointments.ts`
  - `server/repositories/reportsRepository.ts`
  - `package.json`
  - `package-lock.json`
  - Browser- und Unit-Tests im Kalender-/Appointments-Umfeld
  - zugehörige Logs
- Begründung:
  - Der Commit ist real und nicht bloß ein Artefakt aus `work`.
  - Inhaltlich gehört er aber eher zu Cache-, Audit- und Test-Follow-ups als zur Tour-/KW-Journalisierung.
  - Da `temp_work_ft32_leser_release_check` bereits eigene umfangreiche Test- und Stabilitätsarbeit enthält, darf dieser Commit nicht blind als notwendiger Bestandteil der Fachrettung behandelt werden.
- Empfehlung:
  - nur übernehmen, wenn die darin enthaltenen Fixes auf dem Temp-Branch tatsächlich noch fehlen
  - fachliche Rettung der Journal-Erweiterung nicht an diesen Commit koppeln

### 5. Commit `5a56816` — `Stabilize browser test follow-ups`

- Bewertung: nicht fachlich notwendig, nur testseitig optional
- Einordnung: reiner Teststabilisierungs-Commit
- Betroffene Dateien:
  - `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
  - `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
  - zugehöriges Log
- Begründung:
  - Keine Produktivänderung.
  - Kein erkennbarer direkter Zusammenhang zur Journal-Funktion.
- Empfehlung:
  - nicht Teil der fachlichen Rettung
  - nur übernehmen, falls genau diese Teststabilisierungen im Zielstand fehlen und weiterhin benötigt werden

## Zusammengefasste Übernahmeempfehlung

### Muss rüber

- `3378477`

### Optional separat prüfen

- `10b9390`
- `2d346dc`

### Eher nicht übernehmen

- `da1f75d`
- `5a56816`

## Arbeitsannahme für den weiteren Integrationsweg

Die aktuell plausibelste und risikoärmste Arbeitsannahme lautet:

- `temp_work_ft32_leser_release_check` ist der vollständigere Integrationsstand
- die eigentliche fachliche Rettung aus `ft-tour-journal-week-journal` konzentriert sich zunächst auf `3378477`
- alle späteren Commits dieses Branchs sind getrennt zu bewerten und nicht automatisch Teil der Rettung

Damit wird die Fachlogik des Journal-Features gesichert, ohne unnötig branchspezifische Folgearbeiten, Teststabilisierungen oder Dokumentationsreste mitzuschleppen.
