---
name: projekt-manager-planungsleitplanken
description: Use when Codex creates, reviews, updates, or executes any plan for the MuGPlan / Projekt Manager repository, including fixes, features, audits, tests, migrations, API/Web changes, UI work, branch strategy, permissions, roles, acceptance criteria, and implementation sequencing. Apply before proposing or executing code changes in this codebase.
---

# Projekt Manager Planungsleitplanken

Nutze diesen Skill als Planungs-Gate für dieses Repository. `agents.md` bleibt die verbindliche Quelle. Bei Widersprüchen gilt `agents.md`; benenne die Abweichung kurz.

## Pflichtablauf

1. Auftrag gemäß `agents.md` in Klasse 1 bis 5 einordnen.
2. Bei möglichen Änderungen Branch und Working Tree prüfen.
3. Dokumente sparsam lesen: zuerst auftragsnahe Dateien, Architektur- oder Implementierungsindizes nur bei Bedarf, große Dokumente nie automatisch vollständig.
4. Betroffene Domänen, Schichten, Dateien, API, Datenmodell, Frontend-State, Tests, Journal/Logs und Abnahmekriterien identifizieren.
5. Explizit entscheiden, ob Auth, Rollen, Permissions, Migrationen, Dumps, Fixtures, sichtbare Datumsformate und UI-Regeln betroffen sind.
6. Annahmen und Blocker benennen statt Architektur-, Produkt- oder Scope-Entscheidungen still zu treffen.
7. Den Plan proportional zur Auftragsklasse halten; Sicherheit, Rollen, Tests und Datenmigration nie auslassen, wenn sie relevant sind.

## Referenzauswahl

Lies `references/plan-checklist.md` für Feature-, Fix-, Refactor-, Audit- oder Testplanung.

Lies diese Referenzen nur bei Relevanz:

- `references/architecture.md` für Domänen-, Schichten-, Schema-, Shared-Type-, Dump-, Repository- oder Service-Entscheidungen.
- `references/auth-roles.md` für API, Web-Workflows, Navigation, Admin, Permission oder geschützte Daten.
- `references/testing.md` für Testpläne, Testmigration, Fixtures, E2E, Testlaufzeit oder Abnahmenachweise.
- `references/git-workflow.md` für Branch, `save`, Merge, Push, Cleanup oder andere Git-Abläufe.
- `references/ui-guidelines.md` für Frontend-Layout, Navigation, Komponenten, Menüs, Formulare, Dashboards oder Interaktionen.
- `references/acceptance-criteria.md` vor finalem Planabschluss oder bevor eine Aufgabe als erledigt gemeldet wird.

Es gibt in diesem Projekt keine verbindliche separate Designrichtlinien-Datei, solange `agents.md` oder eine konkrete Nutzeranweisung sie nicht ausdrücklich nennt. Verwende stattdessen `references/ui-guidelines.md` und die bestehenden UI-Muster.

## Plan-Pflichtfragen

Beantworte vor jedem Umsetzungsplan:

- Welche Domäne ist betroffen?
- Welche Routen, Controller, Services, Repositories, Shared Types, Migrationen, Web-APIs, Hooks, Komponenten und Seiten sind betroffen?
- Erfordert die Änderung Auth, Rollen, Permissions, UI-Gating oder Admin-Verhalten?
- Berührt die Änderung UI-Visuals, Layout, Styling, Dashboards, Formulare oder Interaktionen?
- Ist eine DB-Migration, Dump-Registry-Aktualisierung, Fixture- oder Seed-Änderung nötig?
- Sind Query-Keys, Invalidierung, TanStack-Hooks oder E2E-Setup-Änderungen nötig?
- Was bleibt bewusst unverändert?
- Was kann kaputtgehen und wie wird das Risiko begrenzt?

## Rollenprüfung

Bei jedem möglichen Rollen-, Auth-, Sichtbarkeits- oder Berechtigungsbezug muss der Plan ausdrücklich nennen:

- betroffene Rollen,
- erlaubte Sichtbarkeit,
- erlaubte Aktionen,
- technische Durchsetzung im Frontend, Backend oder beiden Schichten,
- direkte Aufrufe, Deep Links, API-Calls und Nebenpfade,
- offene Unklarheiten oder Blocker.

Wenn diese Angaben nicht eindeutig belegbar sind, keine Rechteänderung planen oder umsetzen.

## Plan-Ausgabe

Schreibe Pläne auf Deutsch und im Format aus `agents.md`.

Für Klasse 4 genügen:

- Was ich plane
- Betroffene Funktionen, Komponenten und Dateien
- Erwartetes Ergebnis in der App

Für Klasse 5 verwende:

- Was ich plane
- Betroffene Funktionen, Komponenten und Dateien
- Auswirkungen der Änderung
- Risiken und Schadenspotential
- Erwartetes Ergebnis in der App

Vermeide vage Aussagen wie "Tests hinzufügen" oder "UI aktualisieren". Benenne Testebenen, Negativfälle, sichtbare Wirkungen und Akzeptanzkriterien konkret.

## Hard Stops

Stoppe die Planung und dokumentiere den Blocker, wenn:

- der Scope `agents.md` widerspricht,
- eine benötigte Architektur-, Rollen- oder Produktentscheidung fehlt,
- die Umsetzung nur durch nicht freigegebene Infrastruktur-, Dependency- oder Konfigurationsänderungen möglich wäre,
- vorhandene Nutzeränderungen überschrieben oder entfernt würden,
- erforderliche Dokumente, Schemas oder Projektkontexte fehlen und alle weiteren Schritte davon abhängen.
