# FT-26 Reportlayout, Preset-Sperre und FT-03 Wiki-Aufgabe

## Datum

06.05.26

## Zweck

Die Produktionsplanung sollte Kategorien, die demselben Block zugeordnet sind, nebeneinander darstellen. Zusätzlich sollten die Preset-Funktionen der vier Reports vorübergehend sichtbar, aber nicht bedienbar sein. Im Anschluss wurde eine offene FT-03-Auftragsdatei als Wiki-Aufgabe übernommen.

## Scope

- Lokale UI-Änderung in der Produktionsplanung für Bildschirm- und Druckansicht.
- Temporäre UI-Sperre der Preset-Controls in Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan.
- Ergänzende Unit-/UI-Tests für Blocklayout und Preset-Sperre.
- Neue Wiki-Aufgabe A-08 für FT-03 Mark & Insert.
- Keine API-, Datenbank-, Schema- oder Rollenmodelländerung.

## Technische Entscheidungen

- Das bestehende Kategorie-Layout bleibt unverändert: `categoryId`, `block` und `columns` werden weiter genutzt.
- Kategorien im selben Block werden als dreispaltiges Raster gerendert; `columns` steuert sowohl die interne Artikelspaltenzahl als auch die Breite der Kategorie im Block.
- Für die Bildschirmansicht wird ein responsiver Span verwendet, damit kleine Viewports weiterhin einspaltig bleiben.
- Für die Druckansicht wird direkt ein dreispaltiges Raster verwendet.
- `ReportPresetControls` erhält ein optionales `disabled`-Prop; alle vier Report-Einbindungen setzen dieses temporär auf `true`.
- Die FT-03-Auftragsdatei wurde nicht roh übernommen, sondern als nachverfolgbare Wiki-Aufgabe im bestehenden A-Format zusammengefasst.

## Betroffene Dateien

- `client/src/lib/produktionsplanung-category-layout.ts`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ProduktionsplanungPrintLayout.tsx`
- `client/src/components/reports/ReportPresetControls.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `tests/unit/lib/produktionsplanungCategoryLayout.test.ts`
- `tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/ui/reportPresetControls.disabled.test.tsx`
- `docs/wiki/tasks/README.md`
- `docs/wiki/tasks/a-08-ft03-mark-and-insert.md`

## Rollen und Berechtigungen

Die Reportlayout-Änderung verändert keine Sichtbarkeits- oder Berechtigungsregeln. Die Preset-Sperre ist ausschließlich UI-seitig und weicht keine serverseitige Preset-Berechtigung auf.

Bestehende Regeln bleiben unverändert: Reports sind für zulässige Report-Leserollen lesbar; globale Preset-Verwaltung bleibt serverseitig Admin-beschränkt. Die neue FT-03-Aufgabe dokumentiert explizit, dass Mark & Insert nur mit serverseitiger Absicherung für historische Termine, direkte API-Aufrufe und Konfliktpfade umgesetzt werden darf.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/lib/produktionsplanungCategoryLayout.test.ts tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/reportPresetControls.disabled.test.tsx`
- `npm run typecheck`
- `git diff --check` für die bearbeiteten Code-, Test- und Wiki-Dateien

## Bekannte Einschränkungen

- Die Preset-Funktionen sind nur temporär per UI-Flag deaktiviert; die serverseitigen Endpunkte bleiben unverändert bestehen.
- A-08 ist eine offene Aufgabe und noch keine Implementierung.
- Vor dem Abschluss waren bereits Wiki-Änderungen im Arbeitsbaum vorhanden; sie wurden inhaltlich nicht durch diese Report-Änderung bewertet.
