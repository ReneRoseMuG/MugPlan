# Volltestlauf - Rote Tests (2026-02-18)

## Status
- Diese Liste ist **obsolet**.
- Ursache: Der Lauf wurde mit `npm run test:run` gestartet und lief ohne Integration-Setup (`tests/setup.integration.ts`), daher ohne zentralen DB-Reset.

## Historischer Lauf (obsolet)
- Ausgefuehrter Befehl: `npm run test:run`
- Startzeit (Lauf): `13:15:47`
- Ergebnis: `7 failed | 84 passed (91)` Dateien, `15 failed | 356 passed (371)` Tests

## Verifizierter Lauf (aktuell gueltig)
- Integration: `npm run test:integration`
- Ergebnis: `25 passed (25)` Dateien, `108 passed (108)` Tests
- Startzeit (Lauf): `13:30:19`
- Dauer: `123.57s`

## Zusatzpruefung (Tour-Namenslogik)
- Unit: `npm run test:run -- tests/unit/ft04/TourTests.test.ts`
- Ergebnis: `1 passed (1)` Datei, `10 passed (10)` Tests

## Konsequenz
- Alle zuvor hier dokumentierten roten Tests gelten als aufgeklaert und koennen gestrichen werden.
