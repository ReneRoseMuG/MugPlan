# CLAUDE.md – MuGPlan

Pflichtlektüre für Claude Code beim Start jeder Session.

---

## 1. Projektkontext

MuGPlan ist eine webbasierte Dispositions- und Planungsanwendung.
Stack: Node.js / TypeScript, Express, Drizzle ORM, Vite/React, MySQL.

Verbindliche Leitplanken für alle Coding Agents: `agents.md` — vollständig lesen vor jedem Task.

---

## 2. Dokumentenstrategie — Kontext sparsam nutzen

**Niemals** automatisch `architecture.md` oder `implementation.md` vollständig laden.

Stattdessen:
1. `docs/architecture-index.md` lesen (20 Zeilen)
2. `docs/implementation-index.md` lesen (25 Zeilen)
3. Nur die Abschnitte laden die der Index als relevant ausweist

Ausnahmen: reine Fragen, Git-Operationen, isolierte Einzeiler-Fixes
→ kein Dokument nötig, direkt arbeiten.

---

## 3. Koordination und offene Aufgaben

**Release 01 Aufgaben:**
https://www.notion.so/Release-01-Aufgaben-326da094354e809ea174d7c13738958b

**Test Coverage Projekt:**
https://www.notion.so/Test-Coverage-Projekt-326da094354e80f59180c16c6b040229

Zu Beginn jeder Session die Release-01-Seite lesen.
Das Journal zeigt letzten Stand und nächste Schritte.

---

## 4. Arbeitsregeln

- Keine eigenständigen Architektur- oder Scope-Entscheidungen
- Bei Unklarheiten: abbrechen und Blocker dokumentieren
- Keine stillen Seiteneffekte
- Jede Mutation nachvollziehbar und testbar