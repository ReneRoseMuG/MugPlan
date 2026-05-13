# FT-34 Kalendermarker: Testlücken schließen

Sieben Testlücken und eine Code-Wiki-Diskrepanz für FT-34 beheben. Nach Abschluss sind alle fachlich relevanten Regeln aus FT-34 und die FT-03-Spaltenbreiten-Regel für Feiertage auf mindestens einer Testebene belastbar abgesichert. Ein manueller Testscan vom 08.05.26 hat die offenen Lücken bestätigt; die fehlenden Punkte sind im Umfang beschrieben.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `verworfen` | Mittel | Kalendermarker / Feiertage | Testabdeckung | 08.05.26 |

---

## Ziel

Sieben Testlücken und eine Code-Wiki-Diskrepanz für FT-34 beheben. Nach Abschluss sind alle fachlich relevanten Regeln aus FT-34 und die FT-03-Spaltenbreiten-Regel für Feiertage auf mindestens einer Testebene belastbar abgesichert. Die undokumentierte Implementierungsentscheidung zu partiellen Regionsfeiertagen wird im Wiki nachgetragen.

## Ausgangslage

Ein manueller Testscan vom 08.05.26 hat ergeben, dass die bestehenden Tests für FT-34 keine unzulässigen Mocks enthalten und qualitativ gut sind. Die verbleibenden Testlücken und die Code-Wiki-Diskrepanz sind im Umfang beschrieben.

## Umfang

- Zur Aufgabe gehören neue oder erweiterte Tests auf Unit-, Integrations- und Browser-E2E-Ebene für alle sieben Punkte sowie die Ergänzung des Entscheidungslogs in der FT-34-Wiki-Seite und die Aktualisierung von `docs/TEST_MATRIX.md`.
- Nicht Teil der Aufgabe: fachliche Änderungen an Seeding oder Markerlogik, Änderungen an UI-Komponenten, neue Endpunkte oder Datenbankänderungen.

## Umsetzungshinweise

- Codex-Auftrag liegt unter `.claude/codex-auftrag-ft34-testluecken.md`
- Betroffene Testdateien: `calendarMarkers.integration.test.ts`, `calendarMarkersService.test.ts`, `calendar-markers-visualization.browser.e2e.spec.ts`, `calendar-week-grid-widths.browser.e2e.spec.ts` sowie neue Browser-E2E-Dateien nach Codex-Entscheidung
- Breitenmess-Hilfsfunktionen aus `calendar-week-grid-widths.browser.e2e.spec.ts` wiederverwenden (L-01)
- Alle neuen Tests mit eindeutigen Testdaten-Tokens; Pflicht-Kommentar verpflichtend
- Keine Mocks für Datenbankmengen oder Dateisysteminhalte

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 14.05.26
- Ergebnis: Die Aufgabe wird vorerst verworfen, weil der referenzierte Ursprungsauftrag `.claude/codex-auftrag-ft34-testluecken.md` leer ist und die sieben Punkte nicht belastbar rekonstruierbar sind. Die konkret erkennbare Lücke zu nur teilweise regionalen Feiertagen wurde tests-only in `calendarMarkersService.test.ts` abgesichert.
- Verifikation: `npm run test:unit -- tests/unit/calendarMarkersService.test.ts --reporter=verbose`; gemeinsamer Abschlusslauf `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/settings/useSettings.auftragsliste.test.ts tests/unit/ui/tourManagement.versioning.test.tsx tests/unit/ui/tourWeekPlanningView.render.test.tsx --reporter=verbose` mit 21 bestandenen Tests.
- Folgeaufgaben: Keine. Falls die sieben Punkte später wieder auftauchen, soll eine neue, konkrete Aufgabe angelegt werden.

---

## Beziehungen

- Features: —
- Entscheidungen: —
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../../projects/feature-testabdeckung-uc-luecken.md)
- Journal: [14.05.26 - P02: Feature-Testabdeckung und UC-Lücken abgeschlossen](../../journal/14-05-26-p02-feature-testabdeckung-uc-luecken-abgeschlossen.md)
