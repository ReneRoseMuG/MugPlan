# Work-Merge des Rettungsbranchs am 2026-04-27

## Zweck

Dieses Log dokumentiert den aktuellen Stand nach dem lokalen Hochziehen des Rettungsbranchs `rescue/tour-journal-from-temp` auf `work`. Es dient als Zwischenstand vor weiteren Branch-Schritten in Richtung `main`.

## Scope

- lokalen Stand von `work` auf `origin/work` aktualisiert
- Rettungsbranch `rescue/tour-journal-from-temp` lokal in `work` gemergt
- erreichbare Rettungs- und Ursprungslogs gezielt verglichen
- geprüft, welche späteren Follow-up-Punkte aus `ft-tour-journal-week-journal` vollständig, teilweise oder nur dokumentarisch in `work` angekommen sind

## Technische Entscheidungen

- `work` wurde zuerst per Fast-Forward auf `origin/work` gebracht, um keinen Merge in einen veralteten lokalen Stand vorzunehmen
- der Rettungsbranch wurde anschließend lokal per normalem Merge in `work` integriert
- die Vollständigkeitsprüfung erfolgte nicht nur per Commitnamen, sondern zusätzlich über:
  - branch-spezifische Logs
  - Dateivergleiche zu `10b9390`
  - Dateivergleiche zu `5a56816`
- fehlende Logdateien wurden bewusst als Dokumentationslücke getrennt von fachlich fehlendem Code bewertet

## Durchgeführte Merge-Schritte

1. Ausgangsbranch war `rescue/tour-journal-from-temp` mit sauberem Arbeitsbaum.
2. `git fetch origin`
3. Wechsel auf `work`
4. Fast-Forward von lokalem `work` auf `origin/work`
   - von `e0e3058` auf `83fe3cb`
5. lokaler Merge von `rescue/tour-journal-from-temp` in `work`
   - Ergebnis: Merge-Commit `93d10d5`

## Aktueller inhaltlicher Stand

- Der Journal-Rettungsinhalt ist in `work` enthalten.
- Der Rettungsbranch basiert auf dem volleren Temp-Stand und nicht nur auf altem `work`.
- Der Monatsübersicht-/Kalender-Cache-Fix ist in `work` fachlich vorhanden.
- Nicht alle späteren Follow-up-Dateien aus `ft-tour-journal-week-journal` wurden 1:1 übernommen.

## Gezielt festgestellte Restpunkte

### Fachlich vorhanden

- Journal-Rettung aus `3378477` über den Rettungscommit `4bb868d`
- Browser-/Cache-Rettungsstand aus `f10b552`
- Kalender-Query-Refresh-Fix in `client/src/lib/calendar-appointments.ts`

### Nur teilweise oder nicht 1:1 übernommen

- Paket-/Audit-Follow-ups aus `10b9390` weichen in `work` ab:
  - `package.json`
  - `package-lock.json`
- Test-Follow-up aus `5a56816` ist nicht vollständig identisch:
  - `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts` ist gegenüber `10b9390` nicht identisch, enthält auf `work` aber einen anderen weiterentwickelten Stand

### Nur dokumentarisch fehlend

- `logs/2026-04-27_audit-test-report.md`
- `logs/2026-04-27_browser-audit-followups-save.md`
- `logs/2026-04-27_browser-testfixes-ohne-produktionscode.md`
- `logs/2026-04-27_monatsuebersicht-blocked-weeks-cache-fix.md`

## Betroffene Dateien

- `logs/2026-04-27_work-merge-rettungsbranch-status.md`
- `logs/2026-04-27_branch-chronologie-analyse.md`
- `logs/2026-04-27_rettungsstand-und-merge-plan.md`
- `logs/2026-04-27_browser-rettung-retests.md`
- `logs/2026-04-27_tour-journal-week-journal.md`

## Hinweise zum Prüfen

Für diesen Schritt wurden vor allem Git- und Vergleichsprüfungen verwendet:

- `git fetch origin`
- `git merge --ff-only origin/work`
- `git merge --no-ff rescue/tour-journal-from-temp`
- gezielte `git log`-, `git show`- und `git diff`-Vergleiche zwischen:
  - `work`
  - `rescue/tour-journal-from-temp`
  - `ft-tour-journal-week-journal`
  - `10b9390`
  - `5a56816`

## Bekannte Einschränkungen

- `work` ist nach diesem Stand lokal vor `origin/work`, aber noch nicht auf `main` gespiegelt.
- Die Vollständigkeitsprüfung zeigt, dass nicht jede späte Follow-up-Datei aus `ft-tour-journal-week-journal` identisch angekommen ist.
- Vor einem Hochziehen nach `main` sollten die verbleibenden Paket-/Test-Follow-ups bewusst bewertet werden, statt stillschweigend als erledigt zu gelten.
