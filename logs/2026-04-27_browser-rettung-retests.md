# Browser-Rettung und Retests am 2026-04-27

## Zweck

Dieses Log dokumentiert den aktuell lokal vorbereiteten Rettungsstand auf `rescue/tour-journal-from-temp` vor dem Speichern. Ziel war, die noch offenen Browser-Probleme aus dem Rettungsbranch gezielt zu stabilisieren, ohne zusätzlichen fachlichen Scope zu eröffnen.

## Scope

- Cache-Verhalten für Kalendertermine und blockierte Tourwochen nachziehen
- Browser-Test für Filter-Scope in der Terminliste stabilisieren
- Browser-Test für FT13-Notizdialoge stabilisieren
- Browser-Test für Tourwochen-Blockierung und Monatsübersicht ergänzen
- vorhandene Analyse- und Rettungslogs mitsichern

## Technische Entscheidungen

- Keine Produktionslogik außerhalb des bereits lokal vorbereiteten Rettungsstands erweitert
- Kalender- und Blocked-Week-Queries erhalten `staleTime: 0` und `refetchOnMount: "always"`, damit frisch geänderte Zustände nicht durch den globalen Cache verdeckt bleiben
- Der FT13-Notiztest bindet Farbauswahl, Speichern und Schließen jetzt enger an den konkret geöffneten Dialog statt an globale Cancel-Buttons auf der Seite
- Der Filter-Scope-Test öffnet den Zeitraum-Picker robuster erneut, falls das Popover nach Filteränderungen nicht mehr sichtbar ist
- Der Tour-Week-Browser-Test navigiert gezielt in den passenden Monat und prüft zusätzlich den Fall, dass eine bereits gecachte Monatsansicht nach dem Blockieren korrekt nachlädt

## Betroffene Dateien

- `client/src/lib/calendar-appointments.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/unit/ui/calendarAppointments.queryOptions.test.ts`
- `logs/2026-04-27_branch-chronologie-analyse.md`
- `logs/2026-04-27_rettungsstand-und-merge-plan.md`

## Hinweise zum Testen

Gezielt verifiziert wurden:

- `npm run test:e2e:browser -- tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`

Zusätzlich wurde ein voller Browser-Gesamtlauf ausgeführt:

- `npm run test:e2e:browser`

Dieser Gesamtlauf war vor dem letzten Filter-Scope-Fix bei genau einer Spec rot: `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`.

## Bekannte Einschränkungen

- Nach dem letzten Fix in `appointments-list.filter-scope.browser.e2e.spec.ts` wurde die betroffene Spec erneut grün verifiziert, aber der vollständige Browser-Gesamtlauf wurde danach noch nicht ein weiteres Mal komplett wiederholt.
- Dieses Log dokumentiert bewusst nur den aktuellen Rettungs- und Verifikationsstand; ein finaler Merge nach `work` ist damit noch nicht implizit freigegeben.
