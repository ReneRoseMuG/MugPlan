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

---

## 5. Test-Ausführung

Integration-Tests **müssen** mit `--reporter=verbose` ausgeführt werden,
sonst tritt ein Vitest-Runner-Fehler auf (bekannter Bug im stillen Modus):

```bash
npm run test:integration -- <testname> --reporter=verbose
```

Die `.env`-Dateien liegen nicht im Repo, sondern in:
```
../../shared/.env.test   (relativ zu releases/work)
../../shared/.env.dev
../../shared/.env.prod

## Planning

### Branch Setup
Before creating any plan, ask the user:
"Should I create a local feature/refactor branch with upstream tracking for this task?"
If yes, ask for the branch name and create it automatically including upstream tracking.
If no, proceed without creating a branch.

### Plan Format
Write plans in clear, readable prose — no code snippets, no diffs, no code blocks.
Present the plan directly in the chat, do not save it to a file.
Structure every plan with these four sections:

**What I'm planning**
A narrative description of the overall approach and reasoning. Explain why this
approach was chosen, not just what will be done.

**Functions & components involved**
For each relevant function or component: one to two sentences describing its
current role and why it is affected by this change.

**Changes to existing functions**
For each modification: describe in plain language what changes, why it changes,
and what stays the same. No code, no diffs — only prose.

**Expected result in the app**
Describe the observable outcome from the user's perspective: what will behave
differently, what will look different, and which edge cases are now handled.