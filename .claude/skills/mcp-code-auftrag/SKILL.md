---
name: mcp-code-auftrag
description: >
  Orchestrierungs-Skill für Arbeitsaufträge aus der Projekt Manager App via MCP.
  Verwenden wenn ein Arbeitsauftrag eine Parent-Referenz wie PROJ-1, MS-34, TKT-12,
  UC-5 oder FEAT-7 als Auftragsquelle nennt. Auslöser: "bearbeite TKT-90", "setze
  MS-12 um", "führe den Auftrag aus UC-5 aus", oder jede Übergabe einer PM-Referenz
  als Arbeitsauftrag.
---

# MCP-Code-Auftrag — MuGPlan

## Referenz-Format

| Referenz | Bedeutung | Rolle |
|---|---|---|
| `PROJ-<id>` | Projekt | Parent — Auftragsquelle |
| `MS-<id>` | Meilenstein | Parent — Auftragsquelle |
| `TKT-<id>` | Ticket | Arbeitsgegenstand |
| `UC-<id>` | Use Case | Arbeitsgegenstand |
| `FEAT-<id>` | Feature | Arbeitsgegenstand |

Reine Zahlen ohne Typ → kurz nach dem Typ fragen. Referenzen case-insensitiv.

## Schritt 1: Kontext laden

1. Parent-Referenz extrahieren
2. `get_reference_context` aufrufen — lädt Parent mit rekursiven Kindern, Notes, Attachments, Comments, Relationen
3. Ergänzende Lesetools nur wenn `get_reference_context` nicht ausreicht
4. MCP-Warnungen knapp melden
5. Bei nicht ladbarem Parent → kontrolliert abbrechen, Blocker dokumentieren

Großen Kontextbaum nicht roh ausgeben — nach Relevanz zusammenfassen.

## Schritt 2: Auftrag ableiten

Aus dem Kontext ableiten:
- Titel, Beschreibung, Status und Abnahmekriterien des Parents
- Anhängende Aufgaben, Tickets, Notizen, Attachments
- Offene Comments und Relationshinweise
- Reihenfolge, Abhängigkeiten, erkennbare Blocker

Keine fehlenden Anforderungen erfinden. Bei widersprüchlichem Kontext → nachfragen oder Blocker benennen.

## Schritt 3: Pflichtfrage vor der Umsetzung

> „Soll ich den Auftrag direkt ausführen, oder soll ich zuerst einen Plan erstellen?"

Keine Code-, Datei-, Git-, Status- oder Schreibaktion vor der Antwort.
Bei Planwunsch → Plan erstellen, auf Freigabe warten.

## Schritt 4: Ausführung

`agents.md`, Teststrategie, Log-Pflicht, Git-Vorgaben und Sicherheitsregeln einhalten.
Nur ändern was durch Auftrag oder freigegebenen Plan gedeckt ist.
Blockierte Teilaufgaben dokumentieren und mit unabhängigen Schritten weitermachen.

Spezialisierte Skills anwenden wenn zutreffend:
- Analyse / Code-Verständnis → `exploration`, `architektur`, `datenmodell` (Graphify zuerst)
- Planung → `planungsleitplanken`
- Tests → `test-entwurfsleitplanken`
- Code-Änderung → `code-discipline`

## Schritt 5: Log nach der Ausführung

Nach Abschluss schreibt der Agent **automatisch und ohne Rückfrage** einen Abschlusskommentar — gemäß `agents.md §15.1.1`. Geloggt wird an den Auftrags-Parent **und** an das Standard-Log-Ziel aus `docs/projekt-kontext.md` (aktuell `PROJ-1`), sofern beide nicht identisch sind.

Log ist für den Nutzer — gut lesbar, keine technischen Dateilisten:
- Was erledigt wurde
- Wichtige Entscheidungen oder Einschränkungen
- Durchgeführte Prüfungen oder Tests
- Offene Punkte oder Blocker
- Welches Ergebnis der Nutzer erwarten kann

Tool-Priorität: `add_comment_to_parent` → `add_note_to_parent` (als Log kennzeichnen) → Blocker melden + Log im Chat ausgeben.

## Schritt 6: Parent-Status abschließen

Parent-Status auf `pending` setzen — erst nach Ausführung und optionaler Log-Frage.

Kein Status-Update-Tool → als Blocker melden.
