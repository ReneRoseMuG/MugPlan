# A-04 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken schließen

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Kalender/Touren/Abwesenheiten
- Typ: Testabdeckung
- Erstellt: 06.05.26
- Quelle: [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md)
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-01 Kalendertermine
  - FT-04 Tourenplanung
  - FT-33 Abwesenheiten
- Use Cases:
  - UC 04/12
  - UC 04/13
  - UC 04/14
  - Fehlender oder anders einzuordnender UC 04/03
- Entscheidungen:
  - [W-08 - Storno historischer Termine](../decisions/w-08-storno-historischer-termine.md)
  - [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md)

## Ziel

Die priorisierten Use-Case-Lücken und relevanten Testlücken für FT-01, FT-04 und FT-33 sollen fachlich belastbar geschlossen werden.

## Ausgangslage

W-19 beschreibt bereits eine konkrete Reihenfolge: zuerst FT-04-Use-Cases vervollständigen, danach priorisierte FT-01-, FT-04- und FT-33-Testlücken prüfen und ergänzen. Damit ist der Punkt besser als Aufgabe denn als Decision aufgehoben.

## Umfang

Zur Aufgabe gehören die Ausarbeitung von UC 04/12, UC 04/13 und UC 04/14, die Ergänzung oder bewusste Einordnung von UC 04/03 sowie priorisierte Tests zu historischen Storno-Aktionen, Tour-Preview-Abbruch, 4-KW-Matrix und Abwesenheitsdarstellungen.

Nicht Teil der Aufgabe ist die stillschweigende fachliche Umdeutung von Code-Spec-Widersprüchen. Solche Widersprüche müssen als eigene Decision oder Blocker behandelt werden.

## Umsetzungshinweise

- Rollenfälle müssen ausdrücklich mit Sichtbarkeit, erlaubter Aktion und serverseitiger Durchsetzung beschrieben oder getestet werden.
- Reine UI-Sichtbarkeit reicht nicht als Berechtigungsnachweis.
- FT-01 enthält bekannte Spannungen bei historischen Terminen und inaktiven Kunden.
- FT-33 muss Leser-Blockaden sowie Admin-/Disponent-Flows sauber abgrenzen.

## Anhänge

- Analyse-Datei aus W-19: `C:\Users\r.rose\Downloads\analyse-ft01-ft04-ft33-testabdeckung.md`

## Blocker und offene Fragen

- Der Spec-Code-Widerspruch zu Admin-Zugriff auf inaktive Kunden darf nicht im Rahmen dieser Aufgabe ohne Entscheidung umgedeutet werden.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
