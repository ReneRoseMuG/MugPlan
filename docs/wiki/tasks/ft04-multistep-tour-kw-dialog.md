# FT-04 mehrstufiger Tour-KW-Dialog

Wenn ein Disponent mehrere Mitarbeiter für eine Tour-KW übernimmt, soll ein einheitlicher mehrstufiger Dialog den gesamten Vorgang transparent abbilden. Die bisherige stille Verkettung einzelner Vorschauen soll durch einen nachvollziehbaren Dialogfluss mit Fortschritt, Vorschau und Bestätigung ersetzt werden. Die Mehrfach-Zuweisung kann aus `TourManagement`, `TourEditForm`, `TourWeekForm` und `TourWeekPlanningView` ausgelöst werden. Der aktuell vorliegende Auftragsimport beschreibt den fachlichen Kern, endet aber i.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Implementierung | 07.05.26 |

---

## Ziel

Wenn ein Disponent mehrere Mitarbeiter für eine Tour-KW übernimmt, soll ein einheitlicher mehrstufiger Dialog den gesamten Vorgang transparent abbilden. Die bisherige stille Verkettung einzelner Vorschauen soll durch einen nachvollziehbaren Dialogfluss mit Fortschritt, Vorschau und Bestätigung ersetzt werden.

## Ausgangslage

Die Mehrfach-Zuweisung kann aus `TourManagement`, `TourEditForm`, `TourWeekForm` und `TourWeekPlanningView` ausgelöst werden. Der aktuell vorliegende Auftragsimport beschreibt den fachlichen Kern, endet aber in der Quelle nach dem Abschnitt zu betroffenen Dateien unvollständig. Die Umsetzung muss deshalb auf Codeanalyse, FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente und den bestehenden FT-04-Regeln aufbauen.

## Umfang

- Zur Aufgabe gehören:
- alle bestehenden Einstiegspunkte der Mehrfach-Mitarbeiterzuweisung zur Tour-KW identifizieren
- den heutigen stillen Kaskadenfluss analysieren
- den Ablauf mit der gemeinsamen Dialogstruktur aus FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente verbinden
- Fortschritt, aktuelle Mitarbeiterposition und ausstehende Schritte sichtbar machen
- konfliktfreie betroffene Termine vorauswählen
- konfliktbehaftete Termine sichtbar, aber deaktiviert darstellen
- Abbruch und Zurück-Navigation fachlich korrekt begrenzen
- Bestätigung erst nach klarer Nutzerentscheidung ausführen
- Nicht Teil der Aufgabe sind neue API-Routen, DB-Schemaänderungen oder eine Aufweichung bestehender Tour-KW-, Rollen-, Historien- oder Konfliktregeln.

## Umsetzungshinweise

- Ausgangspunkte sind `TourManagement`, `TourWeekForm`, `TourEditForm`, `TourWeekPlanningView` und der bestehende `TourEmployeeCascadeDialog`.
- Die Aufgabe ist thematisch an FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente gekoppelt und soll keine zweite unabhängige Dialoglogik einführen.
- Serverseitige Re-Checks bleiben Pflicht; die Vorschau darf nicht als abschließende Berechtigung oder Konfliktprüfung behandelt werden.
- Historische Termine und gesperrte Kalenderwochen dürfen nicht durch den Dialog umgangen werden.
- Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.
- Erlaubte Aktionen:
- `ADMIN` und `DISPONENT` dürfen die bestehenden Tour-KW-Mutationen nur im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Tour-KW-Mutationen ausführen.
- Die serverseitige Durchsetzung von Rollen, Sperren, historischen Grenzen, Versionskonflikten und Mitarbeiterkonflikten muss erhalten bleiben.

## Blocker und offene Fragen

- Die importierte Auftragsdatei ist offenbar unvollständig und muss vor Umsetzung gegen Code und FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente validiert werden.
- Vor Umsetzung ist zu klären, ob die Mehrfach-Zuweisung erst final oder bereits pro Schritt mutiert.

---

## Beziehungen

- Features: FT-04 Tourenplanung
- Use Cases: UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen: —
- Weitere Bezüge: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](termin-tour-kw-mutationsdialoge.md) · [FT-04 Multiselect für KW-Planung im Wochenkalender](ft04-multiselect-kw-planung-wochenkalender.md) · [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](mitarbeiter-auswahl-dialogstruktur.md)
