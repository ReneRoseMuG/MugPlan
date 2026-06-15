---
datum: 15.06.26
uhrzeit: "15:30"
schritt: MuGPlan an Projekt Manager angleichen — Skills, agents.md, Hooks
status: abgeschlossen
---

# Schritt-Log: MuGPlan-Angleichung an Projekt Manager

## Was umgesetzt wurde

### agents.md
- Alle "Codex"-Vorkommen durch "der Agent" ersetzt (vollständig, verifiziert)
- §0-Klassifikationstabelle: Notion-Lektüre-Spalte entfernt
- Grundhaltungs-Prolog ergänzt (Erst denken, §0-Präambel)
- §1.1 Projekt-Manager-MCP als fachlicher Einstiegspunkt (ersetzt Notion-Abschnitt)
- §1.2 Skill-Pfad von `skills/` auf `.claude/skills/` aktualisiert; 12 Skills gelistet
- §3.0 Planungs-Skill Pflicht (planungsleitplanken) ergänzt
- §3.0.1 Testentwurfs-Skill Pflicht (test-entwurfsleitplanken) ergänzt
- §4 umbenannt in "Umsetzungsregeln" mit neuen Unterabschnitten §4.1–§4.5
- §4.3 Keine Regressions-Fixes während Tests (neu)
- §4.4 Test-Nachführung bei Codeänderungen (neu, Pflicht)
- §4.5 Blocker-Verhalten (neu)
- §5 Schritt-Log (neu, Pflicht nach jeder Teilaufgabe): Dateinamenformat, Pflichtinhalt, Abschluss-Kriterien
- §15 Abschluss-Workflow komplett überarbeitet:
  - §15.1 Schritt-Log automatisch (keine Rückfrage)
  - §15.1.1 MCP-Abschlusskommentar automatisch (keine Rückfrage, an PROJ-1)
  - §15.2 Audit/Testlauf (mit Rückfrage)
  - §15.2a Journal (mit Rückfrage)
  - §15.3 Architekturdoku (mit Rückfrage)
  - §15.4 Abschlussprüfung (immer)
- Alle Kurzkommandos aktualisiert: savetowork ergänzt, Abschnittsnummern korrigiert

### CLAUDE.md
- §0-Tabelle: "Notion-Lektüre"-Spalte entfernt
- §2.1 komplett ersetzt: Notion → Projekt-Manager-MCP als fachlicher Einstiegspunkt
- Explizites Notion-Verbot in MuGPlan verankert

### Neue Skill-Dateien (.claude/skills/)
- `code-discipline/SKILL.md` — Disziplin-Gate, MuGPlan-Projektspezifik (React Query, shared/routes.ts, Schichten)
- `planungsleitplanken/SKILL.md` — Planungs-Gate, MuGPlan-Schichten, MySQL-Migration, vitest-Testkommandos
- `mcp-code-auftrag/SKILL.md` — Orchestrierung von PM-Referenzen, Log-Ziel PROJ-1
- `test-entwurfsleitplanken/SKILL.md` — Testentwurfs-Gate, MySQL, vitest, testDataFactory.ts, createApiTestApp()
- `test-quality-review/SKILL.md` — Testbestandsanalyse, MuGPlan-Testhierarchie
- `feature-editorial/SKILL.md` — Redaktionelle Feature-Aufbereitung, MCP-Ausgabe

### Neue Hook-Dateien (.claude/hooks/)
- `graphify-hint.sh` — PreToolUse-Hook: erinnert bei Code-/Doc-Suche an Graphify-Wissensgraph
- `docs-check.sh` — Stop-Hook: erinnert nach Änderungen an client/, server/, shared/ an Doku-Prüfung

### settings.json
- PreToolUse-Hook für graphify-hint.sh ergänzt (Matcher: Bash|Read|Glob|Grep)
- Stop-Hook für docs-check.sh ergänzt

### docs/projekt-kontext.md (neu)
- Standard-Log-Ziel: PROJ-1

## Geänderte Dateien
- `agents.md`
- `CLAUDE.md`
- `.claude/settings.json`
- `.claude/skills/code-discipline/SKILL.md` (neu)
- `.claude/skills/planungsleitplanken/SKILL.md` (neu)
- `.claude/skills/mcp-code-auftrag/SKILL.md` (neu)
- `.claude/skills/test-entwurfsleitplanken/SKILL.md` (neu)
- `.claude/skills/test-quality-review/SKILL.md` (neu)
- `.claude/skills/feature-editorial/SKILL.md` (neu)
- `.claude/hooks/graphify-hint.sh` (neu)
- `.claude/hooks/docs-check.sh` (neu)
- `docs/projekt-kontext.md` (neu)

## Probleme / Abweichungen
- Root-`skills/`-Verzeichnis existiert noch mit alten Skill-Varianten (Codex-Referenzen). Diese wurden nicht verändert (keine ungefragte Bereinigung). Da `.claude/skills/` jetzt die maßgebliche Quelle ist, sind die root-`skills/`-Dateien obsolet.
- CLAUDE.md wurde nicht vollständig auf den gleichen Stand wie agents.md gebracht (Abschnitt-Nummern weichen ab) — beide Dokumente sind inhaltlich konsistent, unterscheiden sich aber in der Gliederungstiefe. Das ist kein Fehler, da CLAUDE.md eine kürzere Zusammenfassung für Claude Code darstellt.

## Offene Punkte
- Root-`skills/`-Verzeichnis: ggf. in einer separaten Session bereinigen oder archivieren
- CLAUDE.md §15 und Abschnittsnummern könnten auf agents.md-Stand gebracht werden (nachrangig)
