# 03.05.26 | Git | Wochenkalender: Arbeitsbranch für Tour-Personalspalte

## Zusammenfassung

Für die nächsten Wochenkalender-Änderungen wurde ein eigener Arbeitsbranch angelegt. Dadurch bleibt der aktuelle Refactoring-Stand getrennt von den geplanten Änderungen an Notizanzeige, Tour-KW-Personalspalte und zugehöriger Testsuite.

## Branch-Abhängigkeiten

- Neuer Arbeitsbranch: `refactor/week-calendar-tour-personnel`
- Basisbranch beim Abzweig: `refactor/kalender-refactoring`
- Remote-Tracking: `origin/refactor/week-calendar-tour-personnel`
- Ziel der Trennung: Der bisherige Kalender-Refactoring-Zustand bleibt als Ausgangspunkt nachvollziehbar, während die neue Tour-KW-Personalspalte und die Notiz-Fixes separat entwickelt werden.

## Hinweise

Es wurden keine Codeänderungen vorgenommen. Der Branch ist als Folgebranch des bestehenden Kalender-Refactorings zu behandeln und nicht direkt als unabhängiger `work`-Branch.
