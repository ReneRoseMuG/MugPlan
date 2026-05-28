---
name: projekt-manager-redaktionelle-kommentare
description: Use when Codex should create a Projekt Manager comment through the Projekt-Manager MCP for "Session Kommentar", "Session-Kommentar", session summaries, work results, audits, test runs, fixes, decisions, milestones, tasks, tickets, features, use cases, or target references such as PROJ-1, TASK-10, FEAT-3, MILE-2, UC-1. Resolve the target object and attach a dated, user-readable Markdown comment with add_comment_to_parent.
---

# Projektmanager Redaktionelle Kommentare

Nutze diesen Skill, wenn ein Kommentar im Projektmanager erstellt werden soll, der Arbeitsstand, Testlauf, Analyse, Fix, Entscheidung oder offenen Punkt redaktionell zusammenfasst.

`agents.md` bleibt verbindlich. Bei Widerspruch gilt `agents.md`.

## Ziel

Schreibe Kommentare als User-Info: verständlich, knapp, chronologisch hilfreich und so wenig technisch wie möglich. Der Kommentar soll beim späteren Durchgehen von Projekt-, Meilenstein-, Aufgaben-, Ticket-, Feature- oder Use-Case-Kommentaren erklären, was passiert ist und warum es relevant war.

Für Session-Kommentare gilt: Schreibe einen datierten Markdown-Kommentar über den Inhalt der jeweiligen Session und hänge ihn an das genannte Zielobjekt. Schreibe keine lokale Journaldatei, außer der Nutzer fordert das zusätzlich ausdrücklich an.

## Verbindlicher MCP-Ablauf

1. Lies den genannten Kurzbezeichner, zum Beispiel `PROJ-1`, `TASK-10`, `FEAT-3`, `MILE-2`, `UC-1` oder `TICKET-4`.
2. Wenn kein eindeutiger Kurzbezeichner vorhanden ist, frage knapp nach dem Zielobjekt. Lege keinen Kommentar ohne eindeutig aufgelösten Parent an.
3. Löse den Kurzbezeichner mit `mcp__projekt_manager__.resolve_reference` auf.
4. Bestimme `parentId` aus dem aufgelösten Objekt und `parentType` aus dem Referenztyp:
   - `PROJ-*` -> `project`
   - `MILE-*` -> `milestone`
   - `TASK-*` -> `task`
   - `TICKET-*` -> `ticket`
   - `FEAT-*` -> `feature`
   - `UC-*` oder Use-Case-Referenzen -> `useCase`
5. Wenn die Referenzauflösung oder der Parent-Typ nicht eindeutig ist, nutze bei Bedarf `mcp__projekt_manager__.get_reference_context`. Bleibt es unklar, frage nach statt zu raten.
6. Rekonstruiere nur belegte Fakten aus dem aktuellen Auftrag, ausgeführten Kommandos, Fehlermeldungen, Testresultaten, Diffs oder Projektmanager-Kontext.
7. Schreibe den Kommentar als Markdown im sichtbaren Datumsformat `dd.MM.yy`.
8. Hänge den Kommentar mit `mcp__projekt_manager__.add_comment_to_parent` an das aufgelöste Objekt.
9. Berichte danach kurz, an welches Objekt kommentiert wurde und ob der MCP-Aufruf erfolgreich war.

Verwende für diesen Skill ausschließlich den Projekt-Manager-MCP. Verwende kein Notion.

## Kommentarstil

- Schreibe für Projektbeteiligte, nicht für Entwickler.
- Nenne Anlass, wichtigste Beobachtung, Einordnung, Maßnahme und Ergebnis.
- Halte technische Details im Hintergrund. Verwende Datei-, Funktions- oder Kommando-Namen nur, wenn sie für die Nachvollziehbarkeit nötig sind.
- Trenne belegte Ergebnisse von offenen Punkten. Formuliere Unsicheres als offen, nicht als Tatsache.
- Erfinde keine Arbeit, Tests, Entscheidungen oder Risiken.
- Vermeide Schuldzuweisung und dramatische Sprache.
- Nenne keine Zugangsdaten, Tokens, Secrets oder personenbezogenen Rohdaten.

## Empfohlene Markdown-Struktur

Ein guter Session-Kommentar besteht meist aus drei kurzen Abschnitten:

```markdown
**28.05.26 | Session-Kommentar**

Heute wurde ...

Ergebnis: ...

Offen bleibt ...
```

Passe die Überschriften sparsam an den Kontext an. Der Kommentar soll in einer Kommentarhistorie schnell lesbar bleiben.

## Qualitätscheck vor dem Anlegen

Prüfe vor dem Tool-Aufruf:

- Ist der Kommentar an das richtige Zielobjekt adressiert?
- Stimmen Datum, Ergebnis und offene Punkte mit den belegten Fakten überein?
- Kann ein nicht-technischer Nutzer den Verlauf verstehen?
- Ist der Kommentar kurz genug, um in einer Kommentarhistorie scanbar zu bleiben?
- Wurden keine Secrets, personenbezogenen Rohdaten oder unnötigen technischen Details aufgenommen?
