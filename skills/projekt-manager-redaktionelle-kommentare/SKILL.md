---
name: projekt-manager-redaktionelle-kommentare
description: Use when Codex should write user-facing editorial comments for the Projekt Manager app from work results, audits, test runs, bug analyses, fixes, decisions, milestones, or task progress, and attach them to a project, milestone, task, ticket, feature, or use case via a short reference such as PROJ-1, TASK-10, FEAT-3, or MILE-2. The skill is for non-technical overview comments that help users understand project development history while browsing comments.
---

# Projektmanager Redaktionelle Kommentare

Nutze diesen Skill, wenn ein Kommentar im Projektmanager erstellt werden soll, der Arbeitsstand, Testlauf, Analyse, Fix, Entscheidung oder offenen Punkt redaktionell zusammenfasst.

`agents.md` bleibt verbindlich. Bei Widerspruch gilt `agents.md`.

## Ziel

Schreibe Kommentare als User-Info: verständlich, knapp, chronologisch hilfreich und so wenig technisch wie möglich. Der Kommentar soll beim späteren Durchgehen von Projekt-, Meilenstein-, Aufgaben- oder Ticket-Kommentaren erklären, was passiert ist und warum es relevant war.

## Ablauf

1. Löse den genannten Kurzbezeichner mit `mcp__projekt_manager__.resolve_reference` auf.
2. Bestimme aus dem Ergebnis `parentId` und `parentType`.
3. Rekonstruiere nur belegte Fakten aus dem aktuellen Auftrag, ausgeführten Kommandos, Fehlermeldungen, Testresultaten, Diffs oder Projektmanager-Kontext.
4. Schreibe den Kommentar im sichtbaren Datumsformat `dd.MM.yy`.
5. Hänge den Kommentar mit `mcp__projekt_manager__.add_comment_to_parent` an das aufgelöste Objekt.

Wenn kein eindeutiger Kurzbezeichner vorhanden ist, frage knapp nach dem Parent-Objekt. Keine Kommentare anlegen, wenn der Parent nicht eindeutig aufgelöst werden kann.

## Kommentarstil

- Schreibe für Projektbeteiligte, nicht für Entwickler.
- Nenne den Anlass, die wichtigste Beobachtung, die Einordnung, die Korrektur oder Entscheidung und das Ergebnis.
- Halte technische Details im Hintergrund. Verwende Datei-, Funktions- oder Kommando-Namen nur, wenn sie für die Nachvollziehbarkeit wirklich nötig sind.
- Erkläre Folgefehler, übersprungene Prüfungen oder offene Punkte in Alltagssprache.
- Trenne belegte Ergebnisse von Vermutungen. Formuliere unsichere Punkte als offen, nicht als Tatsache.
- Erfinde keine Arbeit, Tests, Entscheidungen oder Risiken.
- Vermeide Schuldzuweisung und dramatische Sprache.

## Empfohlene Struktur

Ein guter Kommentar besteht meist aus zwei bis vier kurzen Absätzen:

1. Datum und Anlass: Was wurde geprüft oder bearbeitet?
2. Befund: Was wurde gefunden und wie ist es einzuordnen?
3. Maßnahme: Was wurde geändert oder entschieden?
4. Ergebnis und offene Punkte: Was ist jetzt bestätigt, was bleibt separat offen?

## Qualitätscheck vor dem Anlegen

Prüfe vor dem Tool-Aufruf:

- Ist der Kommentar an das richtige Parent-Objekt adressiert?
- Stimmen Datum, Ergebnis und offene Punkte mit den belegten Fakten überein?
- Kann ein nicht-technischer Nutzer den Verlauf verstehen?
- Ist der Kommentar kurz genug, um in einer Kommentarhistorie scanbar zu bleiben?
- Wurden keine Secrets, personenbezogenen Rohdaten oder unnötigen technischen Details aufgenommen?
