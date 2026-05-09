# Aufgabenpflege

## Zweck

Dieser Bereich enthält Pflege- und Ausführungsregeln für Codex. Die lesbare Aufgabenübersicht bleibt unter [Aufgaben](../README.md) auf offene Arbeit beschränkt.

## Statuswerte

- offen
- in Bearbeitung
- blockiert
- abgeschlossen
- verworfen

## Aufgabentypen

- Dokumentation
- Testabdeckung
- Implementierung
- Analyse
- Refactoring
- Infrastruktur
- Planung

## Metadaten

Jede Aufgabe enthält mindestens:

- Status
- Dringlichkeit
- Thema
- Typ
- Erstellt

`Thema` ist ein gruppierbarer Arbeitszuschnitt. Mehrere Aufgaben mit demselben oder verwandtem Thema können gemeinsam analysiert oder umgesetzt werden.

Journalbezüge können im Abschnitt `## Beziehungen` als weitere Bezüge geführt werden, wenn sie für Umsetzung, Teilumsetzung, Entscheidung, Blockade oder Verschiebung relevant sind.

## Projektbezug

Größere Arbeitsstränge werden unter `docs/wiki/projects/` als Projektseiten geführt. Eine Projektseite bündelt Masteraufgabe, Einzelaufgaben und relevante Decisions, ohne die thematische Sortierung der Aufgabenübersicht zu ersetzen.

## Offene Aufgaben Anzeigen

Bei `Tasks?` liefert Codex ausschließlich offene, in Bearbeitung befindliche oder blockierte Aufgaben aus `docs/wiki/tasks/`, ohne Aufgaben aus `docs/wiki/tasks/closed/`.

Sortierung:

1. Dringlichkeit: Hoch, Mittel, Niedrig
2. Thema
3. Aufgaben-ID

Die Antwort enthält keine Struktur- oder Pflegehinweise, sondern nur die Aufgabenliste mit Status, Thema, Dringlichkeit und Link.

## Aufgaben Abschließen

Wenn eine Aufgabe fachlich abgeschlossen, verworfen oder kontrolliert teilabgeschlossen ist:

1. Aufgabendatei aktualisieren:
   - Status setzen
   - Abschlussdatum im Format `dd.MM.yy`
   - Ergebnis knapp dokumentieren
   - Verifikation dokumentieren
   - Folgeaufgaben benennen oder `Keine`
2. Passenden Journaleintrag erstellen oder vorhandenen Journaleintrag verlinken.
3. Aufgabe aus `docs/wiki/tasks/README.md` entfernen.
4. Aufgabendatei nach `docs/wiki/tasks/closed/` verschieben.
5. Relative Links auf die verschobene Aufgabe aktualisieren.

## Journal Statt Logs

Ab 07.05.26 ist das Wiki-Journal die Protokollebene für neue Aufträge. Der Ordner `logs/` bleibt als historischer Altbestand erhalten und soll nicht mehr für neue Auftragsprotokolle genutzt werden.
