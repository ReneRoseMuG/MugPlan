---
name: projekt-manager
description: Use for interactions with the Projekt Manager MCP app and objects such as projects, milestones, tasks, tickets, features, use cases, comments, notes, attachments, catalogs, users, relations, status updates, and reference resolution. Apply when the user asks to inspect, list, summarize, create, update, link, comment on, or otherwise work with Projekt Manager objects or references such as PROJ-1, MILE-2, MS-2, TASK-5, TKT-4, FEAT-9, or UC-3.
---

# Projekt Manager Basis

Nutze diesen Skill als Basis für Interaktionen mit der Projekt-Manager-App über den Projekt-Manager-MCP. Spezialisierte Skills wie `feature-editorial`, `test-quality-review`, `mcp-code-auftrag` oder `projekt-manager-redaktionelle-kommentare` ergänzen ihn und haben Vorrang, wenn ihr engerer Trigger passt.

`agents.md` bleibt verbindlich. Verwende keinen Notion-Connector, außer der Nutzer erlaubt dies für den konkreten Auftrag ausdrücklich.

## Grundregeln

- Bei Kurzreferenzen wie `PROJ-*`, `MILE-*`, `MS-*`, `TASK-*`, `TKT-*`, `FEAT-*` oder `UC-*` zuerst die Referenz über den Projekt-Manager-MCP auflösen.
- Bei unbekanntem Projektkontext zuerst die passenden Listen- oder Suchtools des MCP verwenden.
- Bei hierarchischen Abfragen zuerst den Parent bestimmen, danach Kinder, Kommentare, Notizen, Anhänge und Relationen gezielt laden.
- Ergebnisse kompakt präsentieren und lange Kontextbäume nicht roh ausgeben.
- Schreibe nur in den MCP, wenn der Nutzer eine Schreibaktion beauftragt oder sie Teil eines bestätigten Workflows ist.
- Keine fehlenden Anforderungen, Tests, Entscheidungen oder Statusstände erfinden.

## Referenztypen

- `PROJ-*` -> Projekt
- `MILE-*` oder `MS-*` -> Meilenstein
- `TASK-*` -> Aufgabe
- `TKT-*` oder `TICKET-*` -> Ticket
- `FEAT-*` -> Feature
- `UC-*` -> Use Case

Reine Zahlen sind mehrdeutig. Frage knapp nach, wenn kein Typ erkennbar ist.

## Textfelder

Wenn ein MCP-Tool HTML für Beschreibungs- oder Textfelder erwartet, gib HTML aus statt Markdown. Nutze einfache, sichere Struktur:

- Überschrift Ebene 2: `<h2>...</h2>`
- Überschrift Ebene 3: `<h3>...</h3>`
- Absatz: `<p>...</p>`
- Fett: `<strong>...</strong>`
- Liste: `<ul><li>...</li></ul>` oder `<ol><li>...</li></ol>`
- Mermaid: `<pre class="mermaid">...</pre>`

Wenn unklar ist, ob das konkrete Feld Markdown oder HTML erwartet, lies vorhandene Objektdaten oder frage nach, bevor du Inhalte schreibst.

## Bearbeitungsworkflow

Wenn ein Projekt-Manager-Objekt umgesetzt, analysiert oder abgeschlossen werden soll:

1. Kontext gezielt laden und den tatsächlichen Auftrag ableiten.
2. Repository-Regeln aus `agents.md` und passende Spezialsills anwenden.
3. Erst die eigentliche Arbeit erledigen.
4. Statusänderungen nur ausführen, wenn der Auftrag oder der spezialisierte Workflow dies verlangt.
5. Ausführungskommentare nur nach Nutzerauftrag oder gemäß spezialisiertem Skill anlegen.

## Ausgabe

Trenne klar zwischen:

- belegtem MCP-Kontext,
- eigener Ableitung aus dem Kontext,
- ausgeführten lokalen Arbeiten,
- offenen Fragen oder Blockern.

Halte Rückmeldungen für Nutzer lesbar. Technische Details nur nennen, wenn sie für Entscheidung, Prüfung oder Nachvollziehbarkeit nötig sind.
