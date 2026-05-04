# Wochenkalender: Touren zuklappen mit Tour-KW-Spalte

Datum: 04.05.26
Branch: `feature/tour-kw-view`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `c0787223`

## Zweck

Dieses Log dokumentiert den Fix für den Wochenkalender-Toggle `Touren -> Zugeklappt`. Nach der Einführung der Tour-KW-Spalte links vom Montag hatte das Zuklappen keinen sichtbaren Effekt mehr, sobald die KW-Plan-Spalte eingeblendet war.

## Ursache

Die Collapse-Logik wirkte weiterhin auf den rechten Terminbereich. Die neue linke Tour-KW-Spalte war jedoch ein eigenes Grid-Sibling und hielt pro Tour-Lane mit eigener Body-Fläche weiterhin Höhe offen. Dadurch konnte der rechte Terminbereich zwar kollabieren, die gesamte Lane blieb aber wegen der KW-Spalte optisch hoch.

Die Funktion `Wochenplanung blockieren` und die dabei eingeblendete Sperrfläche wurden geprüft. Die Sperrflächen im Wochenkalender sind `pointer-events-none` und liegen nur visuell über Header bzw. Terminbody. Sie waren nicht die Ursache des fehlenden Collapse-Effekts.

## Umsetzung

- Pro Tour-Lane wird der Collapse-Zustand nun einmal als `isCurrentLaneCollapsed` berechnet.
- Dieser Zustand steuert weiterhin den rechten Terminbody.
- Zusätzlich steuert derselbe Zustand nun den Body der linken Tour-KW-Spalte.
- Kollabierte KW-Spalten-Bodies erhalten `max-h-0`, `flex-none`, `opacity-0` und `min-height: 0px`.
- Geöffnete Lanes behalten die volle KW-Body-Fläche mit `flex-1` und der bestehenden Kartenstruktur.
- Rollen, Mutationen, Sperren und Notizfunktionen wurden nicht verändert.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`

## Tests und Verifikation

Gezielt erfolgreich gelaufen:

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts --grep "KW-Plan-Toggle"`
- `git diff --check`

Der Browser-Test prüft jetzt zusätzlich, dass eine nicht aktive Tour-Lane mit eingeblendeter KW-Spalte nach `Touren -> Zugeklappt` tatsächlich auf nahe Null kollabiert und nach `Aufgeklappt` wieder Höhe erhält.

## Bekannte Hinweise

- Die Unit-Tests melden weiterhin bestehende React-SSR-Warnungen zu `useLayoutEffect` im Hover-Preview-Umfeld. Die Testläufe selbst sind grün.
- Ein vollständiger E2E-Gesamtlauf wurde für diesen lokalen Fix nicht ausgeführt.
- Es wurden keine Schema-, API- oder Rollenänderungen vorgenommen.
