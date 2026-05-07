# A-12 - Termin- und Tour-KW-Mutationsdialoge vereinheitlichen

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Dialoge
- Typ: Analyse
- Erstellt: 07.05.26
- Quelle: Nutzerauftrag vom 07.05.26
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-01 Kalendertermine
  - FT-03 Kalenderansichten
  - FT-04 Tourenplanung
- Use Cases:
  - UC 01/03 - Termin verschieben
  - UC 01/05 - Tour einem Termin zuweisen
  - UC 01/15 - Optimistic Locking bei paralleler Bearbeitung
  - UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - [A-09 - FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](a-09-ft04-dialog-basiskomponente.md)
  - [A-10 - FT-04 mehrstufiger Tour-KW-Dialog](a-10-ft04-multistep-tour-kw-dialog.md)
  - [A-13 - FT-04 Multiselect für KW-Planung im Wochenkalender](a-13-ft04-multiselect-kw-planung-wochenkalender.md)
  - [A-14 - Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](a-14-mitarbeiter-auswahl-dialogstruktur.md)
  - [A-07 - FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender](closed/a-07-ft03-dnd-tourwechsel.md)
  - [A-08 - FT-03 Termin markieren und per Einfügen verschieben](closed/a-08-ft03-mark-and-insert.md)

## Ziel

Alle Termin- und Tour-KW-bezogenen Mutationspfade, die Konflikte auslösen können oder eine Entscheidung des Benutzers erfordern, sollen systematisch erfasst und auf eine einheitliche Dialogstruktur ausgerichtet werden.

Das Ergebnis soll ein konsistenter Dialogansatz sein, der vor einer Aktion verständlich über Konflikte, Konsequenzen und verfügbare Optionen informiert.

## Ausgangslage

Terminänderungen können über unterschiedliche Pfade ausgelöst werden, etwa durch Verschieben in Kalenderansichten, Tourwechsel, Cut & Insert, Mark & Insert, Änderungen auf Tour-KW-Ebene oder Formularaktionen. Diese Pfade können fachlich dieselben Konflikte auslösen, aber heute unterschiedlich sichtbar machen oder bestätigen lassen.

Zusätzlich können an Terminen Notizen hängen. Diese Notizen können datumbezogene Informationen enthalten und müssen deshalb bei Terminmutationen als eigener fachlicher Prüfpunkt betrachtet werden.

## Umfang

Zur Aufgabe gehören:

- alle Terminmutationen identifizieren, die Datum, Uhrzeit, Tour, Tour-KW, Mitarbeiterzuweisungen oder Kalenderzuordnung verändern
- alle Tour-KW-Mutationen identifizieren, die Termine mittelbar verändern oder Mitarbeiterzuweisungen an Terminen beeinflussen
- je Pfad prüfen, welche Konflikte auftreten können
- je Pfad prüfen, welche Benutzerentscheidung erforderlich ist
- vorhandene Konfliktprüfungen, Meldungen und Optionen erfassen
- Lücken zwischen Vorschau, Dialog, finalem Save und serverseitigem Re-Check benennen
- Notizen am Termin als eigenen Prüfpunkt aufnehmen, insbesondere bei datumbezogenen Inhalten
- eine einheitliche Dialogstruktur für Information, Konfliktanzeige, auswählbare Optionen, Bestätigung, Abbruch und Fehlerfall vorbereiten

Nicht Teil der Aufgabe ist die sofortige Umsetzung aller gefundenen Dialoge. Diese Aufgabe darf nach der Analyse in kleinere Implementierungsaufgaben aufgeteilt werden.

## Umsetzungshinweise

- A-09 und A-10 bilden die thematische Grundlage für die Dialogstruktur.
- A-07 und A-08 sind abgeschlossene Vorarbeiten und müssen als relevante Mutationspfade berücksichtigt werden.
- Zu prüfen sind insbesondere Kalender-Move, Cut & Insert, Mark & Insert, Tourwechsel, Terminformular-Save, Projekt-/Terminpfade mit Workflow-Folgen, Tour-KW-Mitarbeiterzuweisung und Tour-KW-Änderungen mit Auswirkung auf Termine.
- Konflikte müssen sowohl aus Sicht des Zieltermins als auch aus Sicht der betroffenen Ressourcen betrachtet werden.
- Dialoge dürfen keine serverseitigen Rollen-, Sperr-, Lock- oder Konfliktregeln ersetzen.

## Rollen- und Sicherheitsbezug

Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.

Erlaubte Aktionen:

- `ADMIN` und `DISPONENT` dürfen Termin- und Tour-KW-Mutationen nur im Rahmen der bestehenden serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Mutationen ausführen.

Die Analyse muss ausdrücklich prüfen, ob direkte API-Aufrufe, bereits geöffnete Ansichten, Deep Links, parallele Bearbeitung und historische Sperren weiterhin serverseitig abgesichert sind.

## Anhänge

- Keine Anhänge.

## Blocker und offene Fragen

- Ohne vollständige Pfadanalyse darf keine einheitliche Dialogregel als abgeschlossen betrachtet werden.
- Unklar ist fachlich zu klären, welche Arten von Terminnotizen bei Datumsmutationen aktiv erwähnt, bestätigt oder gesondert behandelt werden müssen.
- Falls bestehende Konfliktprüfungen fachlich unterschiedlich ausgelegt sind, darf Codex diese Unterschiede nicht ohne Rücksprache vereinheitlichen.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
