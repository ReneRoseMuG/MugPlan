# A-10 - FT-04 mehrstufiger Tour-KW-Dialog

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Dialoge
- Typ: Implementierung
- Erstellt: 07.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-auftrag-ft04-multistep-kw-dialog.md`
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-04 Tourenplanung
- Use Cases:
  - UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - [A-09 - FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](a-09-ft04-dialog-basiskomponente.md)
  - [A-12 - Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](a-12-termin-tour-kw-mutationsdialoge.md)
  - [A-13 - FT-04 Multiselect für KW-Planung im Wochenkalender](a-13-ft04-multiselect-kw-planung-wochenkalender.md)
  - [A-14 - Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](a-14-mitarbeiter-auswahl-dialogstruktur.md)

## Ziel

Wenn ein Disponent mehrere Mitarbeiter für eine Tour-KW übernimmt, soll ein einheitlicher mehrstufiger Dialog den gesamten Vorgang transparent abbilden. Die bisherige stille Verkettung einzelner Vorschauen soll durch einen nachvollziehbaren Dialogfluss mit Fortschritt, Vorschau und Bestätigung ersetzt werden.

## Ausgangslage

Die Mehrfach-Zuweisung kann aus `TourManagement`, `TourEditForm`, `TourWeekForm` und `TourWeekPlanningView` ausgelöst werden. Der aktuell vorliegende Auftragsimport beschreibt den fachlichen Kern, endet aber in der Quelle nach dem Abschnitt zu betroffenen Dateien unvollständig. Die Umsetzung muss deshalb auf Codeanalyse, A-09 und den bestehenden FT-04-Regeln aufbauen.

## Umfang

Zur Aufgabe gehören:

- alle bestehenden Einstiegspunkte der Mehrfach-Mitarbeiterzuweisung zur Tour-KW identifizieren
- den heutigen stillen Kaskadenfluss analysieren
- den Ablauf mit der gemeinsamen Dialogstruktur aus A-09 verbinden
- Fortschritt, aktuelle Mitarbeiterposition und ausstehende Schritte sichtbar machen
- konfliktfreie betroffene Termine vorauswählen
- konfliktbehaftete Termine sichtbar, aber deaktiviert darstellen
- Abbruch und Zurück-Navigation fachlich korrekt begrenzen
- Bestätigung erst nach klarer Nutzerentscheidung ausführen

Nicht Teil der Aufgabe sind neue API-Routen, DB-Schemaänderungen oder eine Aufweichung bestehender Tour-KW-, Rollen-, Historien- oder Konfliktregeln.

## Umsetzungshinweise

- Ausgangspunkte sind `TourManagement`, `TourWeekForm`, `TourEditForm`, `TourWeekPlanningView` und der bestehende `TourEmployeeCascadeDialog`.
- Die Aufgabe ist thematisch an A-09 gekoppelt und soll keine zweite unabhängige Dialoglogik einführen.
- Serverseitige Re-Checks bleiben Pflicht; die Vorschau darf nicht als abschließende Berechtigung oder Konfliktprüfung behandelt werden.
- Historische Termine und gesperrte Kalenderwochen dürfen nicht durch den Dialog umgangen werden.

## Rollen- und Sicherheitsbezug

Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.

Erlaubte Aktionen:

- `ADMIN` und `DISPONENT` dürfen die bestehenden Tour-KW-Mutationen nur im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Tour-KW-Mutationen ausführen.

Die serverseitige Durchsetzung von Rollen, Sperren, historischen Grenzen, Versionskonflikten und Mitarbeiterkonflikten muss erhalten bleiben.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-auftrag-ft04-multistep-kw-dialog.md`

## Blocker und offene Fragen

- Die importierte Auftragsdatei ist offenbar unvollständig und muss vor Umsetzung gegen Code und A-09 validiert werden.
- Vor Umsetzung ist zu klären, ob die Mehrfach-Zuweisung erst final oder bereits pro Schritt mutiert.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
