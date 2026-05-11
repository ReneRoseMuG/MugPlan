# 11.05.26 | Abschluss | P01 Ressourcenplanung-Dialoge

## Zusammenfassung

Der P-01-Restblock zur Ressourcenplanung ist umgesetzt. Tour-KW-Planung, Terminänderungen, Kalenderbewegungen, direkte Termin-Mitarbeiteraktionen, Tour-KW-Sperren und Abwesenheitskonflikte nutzen jetzt soweit fachlich passend einen gemeinsamen Ressourcenplanungsrahmen für Vorschau, Konfliktanzeige, Auswahl, Bestätigung, Ausführungsstand und Fehlerzustände.

Die Aufgaben A-09, A-10, A-12, A-13, A-19 und A-20 sind als abgeschlossen dokumentiert und in `docs/wiki/tasks/closed/` verschoben. P-01 bleibt als Projektseite weiterhin die Klammer für die übrigen noch offenen Dialogthemen.

## Umsetzung

- `ResourcePlanningDialog` bündelt die gemeinsame Dialogstruktur für Tour-KW- und Terminressourcen.
- `TourEmployeeCascadeDialog` bleibt als kompatibler Wrapper erhalten.
- Tour-KW-Multiselect sammelt Vorschauen und führt bestätigte Schritte erst nach finaler Gesamtbestätigung seriell aus.
- Terminformular und Kalenderbewegungen nutzen vor ressourcenrelevanten Änderungen den Preview-Pfad.
- Reine Terminzeit- und Datumsverschiebungen im gleichen Tour-/KW-Kontext zeigen aktuelle Mitarbeiterkonflikte vor dem Speichern.
- Direkte Termin-Mitarbeiterzuweisung und Entfernung laufen über den Ressourcenplanungsdialog.
- Tour-KW-Blockieren nutzt in Tourformular und Wochenkalender denselben Bestätigungsdialog.
- Abwesenheitsflüsse bleiben in die Ressourcenbereinigung eingebunden.

## Rollen

- `ADMIN` und `DISPONENT` dürfen die bestehenden Ressourcenmutationen ausführen, sofern serverseitige Sperren, Zeitraumregeln, Versionsstände und Fachvalidierungen dies erlauben.
- `READER`/`LESER` darf die betroffenen Ansichten sehen, aber keine Ressourcenmutation ausführen.
- Die serverseitige Durchsetzung bleibt maßgeblich. UI-Dialoge, ausgeblendete Aktionen und deaktivierte Checkboxen ersetzen keine Backend-Prüfung.

## Verifikation

- `npm run check` erfolgreich.
- `npm run test:unit` erfolgreich mit 305 Dateien, 1273 bestandenen Tests und 1 übersprungenen Test.
- `npm run test:integration` erfolgreich mit 126 Dateien, 704 bestandenen Tests und 4 übersprungenen Tests.
- `npm run test:e2e` erfolgreich.
- Browser-E2E gezielt erfolgreich für Terminformular, Kalender-Drag-&-Drop, Wochenkalender-Personal, Tour-KW-Form, Abwesenheiten und Reader-Readonly.
- `git diff --check` erfolgreich.
- Datumsformat-Suchlauf gemäß Projektregel durchgeführt; verbleibende Treffer sind technische ISO-Kontexte, Testdaten oder bestehende Regeltexte.

`npm run test:all` wurde versucht, aber nach 20 Minuten durch das Tool-Timeout beendet. Danach wurden die Testebenen seriell und die betroffenen Browser-Spezifikationen gezielt erfolgreich ausgeführt.

## Verknüpfungen

- Projekt: [P01 Dialog-Rollout](../projects/dialog-rollout.md)
- Aufgaben: [A-09 FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](../tasks/closed/ft04-dialog-basiskomponente.md) · [A-10 FT-04 mehrstufiger Tour-KW-Dialog](../tasks/closed/ft04-multistep-tour-kw-dialog.md) · [A-12 Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](../tasks/closed/termin-tour-kw-mutationsdialoge.md) · [A-13 FT-04 Multiselect für KW-Planung im Wochenkalender](../tasks/closed/ft04-multiselect-kw-planung-wochenkalender.md) · [A-19 Tour-KW- und Termin-Mutationsdialoge](../tasks/closed/tour-kw-termin-mutationsdialoge.md) · [A-20 Termine- und Kalenderdialoge](../tasks/closed/termine-und-kalenderdialoge.md)
