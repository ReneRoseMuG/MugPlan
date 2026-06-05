---
name: mcp-code-auftrag
description: Use when Codex receives or should process implementation, fix, audit, test, or documentation work orders passed through the Projekt Manager MCP from a parent reference such as PROJ-1, MILE-2, MS-34, TASK-5, TKT-2, FEAT-9, or UC-4. Load the parent context, derive the actual assignment, ask whether to execute directly or prepare a plan, then handle optional log and status follow-up.
---

# MCP Code Auftrag

Nutze diesen Skill als Einstiegspunkt für Arbeitsaufträge, die aus der Projekt-Manager-App oder einer Projekt-Manager-Referenz abgeleitet werden. Inhaltliche Arbeit folgt anschließend `agents.md` und den passenden Spezialskills.

## Zusammenspiel

- Planung: `projekt-manager-planungsleitplanken` plus `agents.md`.
- Tests: `projekt-manager-test-entwurfsleitplanken` plus `agents.md`.
- Codeänderung: `codex-code-discipline` plus `agents.md`.
- Projekt-Manager-Basis: `projekt-manager`.
- Log oder Kommentar: `projekt-manager-redaktionelle-kommentare`, wenn der Nutzer einen Kommentar wünscht.

## Referenzen

- `PROJ-*` -> Projekt als mögliche Auftragsquelle
- `MILE-*` oder `MS-*` -> Meilenstein als mögliche Auftragsquelle
- `TASK-*` -> Aufgabe
- `TKT-*` oder `TICKET-*` -> Ticket
- `FEAT-*` -> Feature
- `UC-*` -> Use Case

Reine Zahlen sind mehrdeutig. Frage nach, statt zu raten.

## Schritt 1: Kontext Laden

1. Parent-Referenz aus Nutzeranfrage oder MCP-Kontext extrahieren.
2. Parent über den Projekt-Manager-MCP auflösen und gezielt Kontext laden.
3. Kinder, Notizen, Anhänge, Kommentare und Relationen nur so weit lesen, wie der Auftrag es braucht.
4. MCP-Warnungen oder fehlende optionale Daten knapp melden.
5. Bei nicht ladbarem Parent kontrolliert abbrechen und den Blocker dokumentieren.

Gib große Kontextbäume nicht roh aus. Fasse nach Relevanz zusammen.

## Schritt 2: Auftrag Ableiten

Leite aus dem geladenen Kontext den tatsächlichen Arbeitsauftrag ab:

- Titel, Beschreibung, Status und Abnahmekriterien,
- anhängende Aufgaben, Tickets und fachliche Notizen,
- relevante Anhänge mit Dateiname, Typ und Textvorschau,
- offene Kommentare und Relationshinweise,
- Reihenfolge, Abhängigkeiten und erkennbare Blocker.

Erfinde keine fehlenden Anforderungen. Bei Widerspruch oder Unklarheit frage nach oder benenne den Blocker.

## Schritt 3: Pflichtfrage

Nachdem Kontext geladen und der Auftrag abgeleitet wurde, frage ausdrücklich:

> Soll ich den Auftrag direkt ausführen, oder soll ich zuerst einen Plan erstellen?

Keine Code-, Datei-, Git-, Status- oder MCP-Schreibaktion vor der Antwort. Bei Planwunsch: Plan erstellen und vor Umsetzung auf Freigabe warten.

## Schritt 4: Ausführung

Halte die Regeln des Zielprojekts ein: `agents.md`, Teststrategie, Git-Vorgaben, Sicherheitsregeln und passende Skills. MCP-Daten sind Arbeitskontext, keine absolute Wahrheit. Nur ändern, was durch Auftrag oder freigegebenen Plan gedeckt ist.

Blockierte Teilaufgaben dokumentieren und mit unabhängigen Schritten weitermachen, wenn das ohne Scope-Änderung möglich ist.

## Schritt 5: Log Nach Ausführung

Nach bestätigter Ausführung fragen:

> Soll ich ein kurzes Log als Kommentar am Parent hinterlegen?

Der Log ist nutzerlesbar und enthält:

- was erledigt wurde,
- wichtige Entscheidungen oder Einschränkungen,
- durchgeführte Prüfungen oder Tests,
- offene Punkte oder verbleibende Blocker,
- welches Ergebnis der Nutzer erwarten kann.

Tool-Priorität: `add_comment_to_parent`, falls verfügbar; sonst `add_note_to_parent` mit Kennzeichnung als Log; wenn beides fehlt, Blocker melden und Log im Chat ausgeben.

## Schritt 6: Status

Statusänderungen nur ausführen, wenn sie ausdrücklich beauftragt sind oder der geladene Workflow dies eindeutig verlangt. Wenn ein Status-Update-Tool fehlt oder der Zielstatus unklar ist, dokumentiere den Blocker.
