# 06.05.26 | Kalender | A-07/A-08: Termine markieren und verschieben

## Zusammenfassung

A-07 und A-08 sind abgeschlossen. Termine können im Wochenkalender per Drag & Drop auf reguläre Tour-Lanes verschoben werden. Zusätzlich können Termine per längerem Linksklick als Verschiebeauswahl markiert und in Wochen- oder Monatsansicht in ein reguläres Tour-Ziel eingefügt werden. Solange ein Termin selektiert ist, zeigt der Kalender oben eine deutlich sichtbare Statuskarte. Ein Rechtsklick im Kalenderbereich hebt die Auswahl auf.

## Art der Änderung

Mehrschichtige Frontend- und Backend-Änderung ohne DB-Schemaänderung und ohne Migration. Die Änderung nutzt bestehende Termin- und Tour-KW-Preview-Pfade und erweitert sie um einen gemeinsamen Kalender-Move-Zuschnitt.

## Betroffene Features

- FT-03 Kalenderansichten: Wochenkalender, Monatsübersicht, Kalender-Workspace.
- FT-01 Kalendertermine: Terminverschiebung mit Datum, Tour und Mitarbeiterliste.
- FT-04 Tourenplanung: Tour-KW-Mitarbeiter-Vorschau beim Tour- oder KW-Wechsel.

Notion-Links wurden für diese Session nicht ergänzt; die lokale Wiki-Aufgabenlage A-07/A-08 war ausreichend.

## Konkrete Änderungen

- Neuer gemeinsamer Move-Helfer `client/src/lib/calendar-move.ts` für Auswahl, Move-Request, Zielvalidierung und Preview-Auswahl.
- `CalendarWorkspace` hält den ausgewählten Termin, rendert die obere Statuskarte, hebt per Rechtsklick auf und führt Preview, Bestätigung und PATCH zentral aus.
- Wochen- und Monatsansicht erhalten Long-Press-Markierung, visuelle Auswahlringe und Einfügeaktionen.
- Week-Drop-Ziele berücksichtigen jetzt die Ziel-Tour-Lane statt nur die bisherige Quell-Tour.
- "Ohne Tour", "Parkplatz" und Abwesenheiten sind als Verschiebe- und Einfügeziele ausgeschlossen.
- `tour-change-preview` erhält die Request-Rolle und blockiert Leser sowie historische Disponentenfälle serverseitig.
- A-07, A-08 und der Aufgabenindex wurden auf abgeschlossen aktualisiert.

## Rollen

`ADMIN` darf Termine markieren, ziehen und einfügen, auch historische Fälle, soweit bestehende serverseitige Regeln dies erlauben. `DISPATCHER`/`DISPONENT` darf aktuelle und zukünftige Termine verschieben, aber keine historischen Quell- oder Zieltermine. `READER`/`LESER` bleibt read-only; Auswahl-, Einfüge- und Drag-Aktionen werden nicht angeboten und direkte Preview-Aufrufe werden serverseitig abgelehnt.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/calendarMove.helpers.test.ts tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
- `npm run test:integration -- tests/integration/server/appointments.tour-change-preview.integration.test.ts --reporter=verbose`
- `npm run check`

Zusätzlich wurde der Datumsformat-Suchlauf ausgeführt. Die verbleibenden Treffer sind bestehende technische ISO-Werte, Testdaten, maschinenlesbare Keys oder bestehende Dokumentationshinweise.

Der Staged-Encoding-Guard führt `aktuelle`, `Quell` und `visuelle` als bestätigte positive Treffer, weil diese Schreibungen keine Umlaut-Ersatzformen sind.

## Offene Punkte

- Keine offenen A-07/A-08-Blocker im aktuell beauftragten Zuschnitt.
- Die ursprünglich in A-08 erwähnte Escape-/Click-Away-Deselektion wurde nicht umgesetzt, weil der aktuelle Auftrag Rechtsklick als Deselektion festgelegt hat.
- A-09 bleibt separat offen.
