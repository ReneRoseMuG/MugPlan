# FT-26 Reports: verbleibende Testabdeckung schließen

Die verbleibenden FT-26-Testlücken sollen gezielt analysiert und geschlossen werden, ohne bereits erledigte Sauna-Modell- und Tag-Punkte erneut umzubauen. W-21 grenzt erledigte Punkte bereits aus und benennt eine konkrete Liste offener Test- und Absicherungsfragen rund um Auftragsliste, Druckvorschau, Presets, Tourenplan und Settings-Testmatrix.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Mittel | Reports | Testabdeckung | 06.05.26 |

---

## Ziel

Die verbleibenden FT-26-Testlücken sollen gezielt analysiert und geschlossen werden, ohne bereits erledigte Sauna-Modell- und Tag-Punkte erneut umzubauen.

## Ausgangslage

W-21 grenzt erledigte Punkte bereits aus und benennt eine konkrete Liste offener Test- und Absicherungsfragen rund um Auftragsliste, Druckvorschau, Presets, Tourenplan und Settings-Testmatrix.

## Umfang

- Zur Aufgabe gehören die Prüfung eines Auftragslisten-Druckvorschau-Endpunkts, gegebenenfalls Integrationstests für Ausgabe ohne Paging und Rollenmatrix, die Absicherung von `OPEN_PRINT_PREVIEW` nur bei echtem Endpunkt, Tests für `includeWithoutTour` im Tourenplan sowie Abgleich oder Ergänzung von `tests/unit/settings/useSettings.auftragsliste.test.ts`.
- Nicht Teil der Aufgabe ist eine Änderung am Report-Contract ohne nachgewiesenen Implementierungsfehler.

## Umsetzungshinweise

- Reports dürfen von Admin, Disponent und Leser gelesen werden.
- USER-Presets sind benutzerbezogen.
- GLOBAL-Presets sind für alle lesbar, aber nur Admins dürfen sie schreiben oder löschen.
- Relevante Report- und Preset-Endpunkte müssen serverseitig geprüft werden.
- Tests sollen echte Endpunkte, echte Fixture-Daten und bestehende FT-26-Integrationsmuster nutzen.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 14.05.26
- Ergebnis: Die verbleibenden FT-26-Testlücken wurden tests-only geschlossen. Report-Presets wirken auf echte Reportdaten, Tourenplan inklusive Termine ohne Tour ist über den vorhandenen Print-Preview-Endpunkt abgesichert und veraltete Auftragslisten-Settings sind entfernt. Ein eigener Auftragslisten-Print-Preview-Endpunkt existiert nicht und wird fachlich nicht ergänzt, weil die Auftragsliste aus den geladenen Reportdaten druckt.
- Verifikation: `npm run test:integration -- tests/integration/server/reportConfigs.reportEffects.integration.test.ts tests/integration/server/tour-print-preview.integration.test.ts --reporter=verbose`; `npm run test:unit -- tests/unit/settings/useSettings.auftragsliste.test.ts --reporter=verbose`; gemeinsamer Abschlusslauf `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/settings/useSettings.auftragsliste.test.ts tests/unit/ui/tourManagement.versioning.test.tsx tests/unit/ui/tourWeekPlanningView.render.test.tsx --reporter=verbose` mit 21 bestandenen Tests.
- Folgeaufgaben: Keine.

---

## Beziehungen

- Features: —
- Entscheidungen: —
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../../projects/feature-testabdeckung-uc-luecken.md)
- Journal: [14.05.26 - P02: Feature-Testabdeckung und UC-Lücken abgeschlossen](../../journal/14-05-26-p02-feature-testabdeckung-uc-luecken-abgeschlossen.md)
