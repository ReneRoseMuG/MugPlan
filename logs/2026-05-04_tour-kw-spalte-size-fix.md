# Tour-KW-Spalte Größenfix im Wochenkalender

Datum: 04.05.26
Branch: `feature/tour-kw-week-card-actions`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `b682f379`

## Zweck

Dieses Log dokumentiert die Nachkorrektur am Layout der Tour-KW-Planungsspalte im Wochenkalender. Die Kacheln links vom Montag sollten den verfügbaren Raum der jeweiligen Tour-Lane vollständig nutzen. Eine erste Korrektur hatte zwar eine weiße Hintergrundfläche ergänzt, diese Fläche füllte aber weiterhin nicht die volle verfügbare Höhe.

## Ursache

Die Tour-KW-Spalte selbst wuchs bereits auf die verfügbare Lane-Höhe. Die neu eingefügte weiße Hintergrundfläche und der Kartenwrapper lagen jedoch weiterhin innerhalb der berechneten Grid-Zeilen. Diese Grid-Zeilen orientieren sich an den Terminzeilen und füllen nicht automatisch die freie Resthöhe der linken Spalte. Dadurch blieb unterhalb der KW-Karte weiterhin sichtbarer Freiraum.

Die vorherige direkte Höhenkopplung an berechnete Terminwerte wurde verworfen, weil sie Nebenwirkungen auf die regulären Tagesflächen erzeugen konnte. Der korrigierte Ansatz setzt deshalb am lokalen Box-Level der KW-Spalte an.

## Umsetzung

- Die Hintergrundfläche der Tour-KW-Spalte wurde innerhalb des Body-Containers auf `absolute inset-0` gesetzt.
- Der Kartenwrapper wurde ebenfalls auf `absolute inset-0` gesetzt und behält sein Innenpadding.
- Die Karte selbst bleibt innerhalb dieses Wrappers und nutzt weiter `h-full`.
- Die Footer-Farbe der KW-Karte bleibt an die Footer-Farbe der jeweiligen Terminkachel gekoppelt.
- Die bestehende Rollenlogik wurde nicht verändert.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/TourWeekNotesHoverPreview.tsx`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`

## Tests und Verifikation

Gezielt erfolgreich gelaufen:

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts --grep "KW-Plan-Toggle"`
- `git diff --check`

Der Browser-Test prüft zusätzlich, dass Hintergrundfläche und Kartenwrapper der Tour-KW-Spalte dieselbe vertikale Ausdehnung wie der Body der linken KW-Spalte haben.

## Bekannte Hinweise

- Die Unit-Tests melden weiterhin bestehende React-SSR-Warnungen zu `useLayoutEffect` im Hover-Preview-Umfeld. Die Testläufe selbst sind grün.
- Ein vollständiger E2E-Gesamtlauf wurde für diesen Nachfix nicht ausgeführt.
- Es wurden keine Schema-, API- oder Rollenänderungen vorgenommen.
