# A-05 - FT-26 Reports: verbleibende Testabdeckung schließen

## Metadaten

- Status: offen
- Dringlichkeit: Mittel
- Thema: Reports
- Typ: Testabdeckung
- Erstellt: 06.05.26
- Quelle: [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-26 Auswertungen und Reports
- Use Cases:
  - Noch gezielt je Report-Use-Case zu verlinken.
- Entscheidungen:
  - [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)

## Ziel

Die verbleibenden FT-26-Testlücken sollen gezielt analysiert und geschlossen werden, ohne bereits erledigte Sauna-Modell- und Tag-Punkte erneut umzubauen.

## Ausgangslage

W-21 grenzt erledigte Punkte bereits aus und benennt eine konkrete Liste offener Test- und Absicherungsfragen rund um Auftragsliste, Druckvorschau, Presets, Tourenplan und Settings-Testmatrix.

## Umfang

Zur Aufgabe gehören die Prüfung eines Auftragslisten-Druckvorschau-Endpunkts, gegebenenfalls Integrationstests für Ausgabe ohne Paging und Rollenmatrix, die Absicherung von `OPEN_PRINT_PREVIEW` nur bei echtem Endpunkt, Tests für `includeWithoutTour` im Tourenplan sowie Abgleich oder Ergänzung von `tests/unit/settings/useSettings.auftragsliste.test.ts`.

Nicht Teil der Aufgabe ist eine Änderung am Report-Contract ohne nachgewiesenen Implementierungsfehler.

## Umsetzungshinweise

- Reports dürfen von Admin, Disponent und Leser gelesen werden.
- USER-Presets sind benutzerbezogen.
- GLOBAL-Presets sind für alle lesbar, aber nur Admins dürfen sie schreiben oder löschen.
- Relevante Report- und Preset-Endpunkte müssen serverseitig geprüft werden.
- Tests sollen echte Endpunkte, echte Fixture-Daten und bestehende FT-26-Integrationsmuster nutzen.

## Anhänge

- Auftragsdatei aus W-21: `C:\Users\r.rose\Downloads\codex-auftrag-ft26-reports-testabdeckung.md`

## Blocker und offene Fragen

- Ob ein echter Druckvorschau-Endpunkt für die Auftragsliste existiert, muss vor Testergänzungen geprüft werden.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
