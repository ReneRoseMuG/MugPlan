---
name: projekt-manager-redaktionelle-kommentare
description: Use when Codex should create a Projekt Manager comment through the Projekt-Manager MCP for "Session Kommentar", "Session-Kommentar", session summaries, work results, audits, test runs, fixes, decisions, milestones, tasks, tickets, features, use cases, or target references such as PROJ-1, TASK-10, TKT-4, FEAT-3, MILE-2, MS-2, or UC-1. Resolve the target object and attach a dated, user-readable comment with add_comment_to_parent.
---

# Projekt Manager Redaktionelle Kommentare

Nutze diesen Skill, wenn ein Kommentar im Projekt Manager erstellt werden soll, der Arbeitsstand, Testlauf, Analyse, Fix, Entscheidung oder offenen Punkt redaktionell zusammenfasst.

`agents.md` bleibt verbindlich. Bei Widerspruch gilt `agents.md`.

## Ziel

Schreibe Kommentare als User-Info: verständlich, knapp, chronologisch hilfreich und so wenig technisch wie möglich. Der Kommentar soll später erklären, was passiert ist und warum es relevant war.

Für Session-Kommentare gilt: Schreibe einen datierten Kommentar über den Inhalt der jeweiligen Session und hänge ihn an das genannte Zielobjekt. Schreibe keine lokale Journaldatei, außer der Nutzer fordert das zusätzlich ausdrücklich an.

## Verbindlicher MCP-Ablauf

1. Lies den genannten Kurzbezeichner, zum Beispiel `PROJ-1`, `MILE-2`, `MS-2`, `TASK-10`, `TKT-4`, `FEAT-3` oder `UC-1`.
2. Wenn kein eindeutiger Kurzbezeichner vorhanden ist, frage knapp nach dem Zielobjekt. Lege keinen Kommentar ohne eindeutig aufgelösten Parent an.
3. Löse den Kurzbezeichner mit dem Projekt-Manager-MCP auf.
4. Bestimme `parentId` aus dem aufgelösten Objekt und `parentType` aus dem Referenztyp:
   - `PROJ-*` -> `project`
   - `MILE-*` oder `MS-*` -> `milestone`
   - `TASK-*` -> `task`
   - `TKT-*` oder `TICKET-*` -> `ticket`
   - `FEAT-*` -> `feature`
   - `UC-*` -> `useCase`
5. Wenn die Referenzauflösung oder der Parent-Typ nicht eindeutig ist, nutze gezielt weiteren Projekt-Manager-Kontext. Bleibt es unklar, frage nach statt zu raten.
6. Rekonstruiere nur belegte Fakten aus aktuellem Auftrag, ausgeführten Kommandos, Fehlermeldungen, Testresultaten, Diffs oder Projekt-Manager-Kontext.
7. Schreibe den Kommentar im sichtbaren Datumsformat `dd.MM.yy`.
8. Hänge den Kommentar mit `add_comment_to_parent` an das aufgelöste Objekt.
9. Berichte kurz, an welches Objekt kommentiert wurde und ob der MCP-Aufruf erfolgreich war.

Verwende für diesen Skill ausschließlich den Projekt-Manager-MCP. Verwende kein Notion.

## Kommentarstil

- Schreibe für Projektbeteiligte, nicht für Entwickler.
- Nenne Anlass, wichtigste Beobachtung, Einordnung, Maßnahme und Ergebnis.
- Halte technische Details im Hintergrund. Verwende Datei-, Funktions- oder Kommando-Namen nur, wenn sie für die Nachvollziehbarkeit nötig sind.
- Trenne belegte Ergebnisse von offenen Punkten. Formuliere Unsicheres als offen, nicht als Tatsache.
- Erfinde keine Arbeit, Tests, Entscheidungen oder Risiken.
- Nenne keine Zugangsdaten, Tokens, Secrets oder personenbezogenen Rohdaten.

## Empfohlene Struktur

Ein guter Session-Kommentar besteht meist aus drei kurzen Abschnitten:

```markdown
**05.06.26 | Session-Kommentar**

Heute wurde ...

Ergebnis: ...

Offen bleibt ...
```

Passe die Überschriften sparsam an den Kontext an. Der Kommentar soll in einer Kommentarhistorie schnell lesbar bleiben.

## Qualitätscheck

Prüfe vor dem Tool-Aufruf:

- Ist der Kommentar an das richtige Zielobjekt adressiert?
- Stimmen Datum, Ergebnis und offene Punkte mit belegten Fakten überein?
- Kann ein nicht-technischer Nutzer den Verlauf verstehen?
- Ist der Kommentar kurz genug, um in einer Kommentarhistorie scanbar zu bleiben?
- Wurden keine Secrets, personenbezogenen Rohdaten oder unnötigen technischen Details aufgenommen?
