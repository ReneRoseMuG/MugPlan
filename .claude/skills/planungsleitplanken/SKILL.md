---
name: planungsleitplanken
description: >
  Planungs-Gate für das MuGPlan Repository. IMMER vor jeder Planung verwenden —
  egal ob Feature, Fix, Audit, Test, Branch, Migration, API, UI, Auth, Rollen
  oder Architekturentscheidung. Auslöser: "plan", "plane", "wie gehen wir vor",
  jede Ankündigung einer Umsetzung oder Änderung in diesem Repository.
---

# Planungsleitplanken — MuGPlan

`agents.md` bleibt die verbindliche Quelle. Bei Widersprüchen gilt `agents.md`; Abweichungen kurz benennen.

## Pflichtablauf

1. Auftrag gemäß `agents.md` §0 klassifizieren (Klasse 1–5)
2. Aktuellen Branch und Working Tree prüfen wenn Änderungen möglich
3. Bei Code-Bezug zuerst Graphify (`graphify query/path/explain`), dann nur benötigte Repo-Abschnitte lesen — erst bei Bedarf erweitern
4. Betroffene Domänen, Schichten, Dateien, API, Datenmodell, Frontend-State, Tests, Logs und Abnahmekriterien identifizieren
5. Explizit entscheiden ob Auth, Rollen, Permissions, Migrationen und UI-Regeln betroffen sind
6. Annahmen und Blocker benennen — keine stillen Architektur-, Produkt- oder Scope-Entscheidungen
7. Beobachtbare Erfolgskriterien vorab festlegen — Auftrag in prüfbare Ziele übersetzen
8. Plan proportional zur Auftragsklasse — Sicherheit, Tests, Datenmigration nie weglassen wenn relevant

## Pflichtfragen vor jedem Plan

- Welche Domäne: Termine, Mitarbeiter, Projekte, Kunden oder Querschnittsinfrastruktur?
- Welche Routen, Controller, Services, Repositories, Shared Types, Migrationen, UI-Komponenten?
- Auth, Rollen, Permissions oder Sichtbarkeitsgrenzen betroffen?
- DB-Migration nötig (neues Schema → neue Migrationsdatei unter `migrations/`)?
- React Query Keys, Invalidierung oder Frontend-State betroffen?
- Was bleibt bewusst unverändert?
- Was kann kaputtgehen — wie wird das Risiko begrenzt?
- Woran ist Erfolg beobachtbar — welcher Test oder welche Prüfung beweist die Umsetzung?

## Architektur-Referenz

Tiefergehende Architekturarbeit: `docs/architecture-index.md` → `docs/architecture.md` (gezielt). Implementierungsdetails: `docs/implementation-index.md` → `docs/implementation.md` (gezielt).

**Schichten:**
- Shared Types → `shared/schema.ts`, `shared/routes.ts`
- API-Routen → `server/routes/` (Validierung + Controller-Aufruf, keine Business-Logik)
- Controller → `server/controllers/` (HTTP-Koordination, Aufruf des Service)
- Services → `server/services/` (Business-Regeln, fachliche Logik, domänenübergreifend)
- Repositories → `server/repositories/` (CRUD, Datenbankzugriff via Drizzle ORM)
- Frontend-State → React Query Hooks, zentrale Invalidierung

**DB und Migration:**
- Strukturelle Schemaänderung → `shared/schema.ts` + neue Migrationsdatei unter `migrations/` + `migrations/meta/` + erfolgreicher lokaler Migrationslauf auf Dev und Test
- `drizzle-kit push` ist nicht zulässig für reguläre Teamarbeit
- Neue Migrationen nie in bestehende bereits committete Dateien einarbeiten

**Frontend-State:**
- React Query für Server-State
- Keine direkten API-Calls ohne Query-/Mutation-Hook
- Saubere Invalidierung nach Mutationen

## Auth und Rollen — Referenz

- Neue API-Routen sind standardmäßig authentifizierungspflichtig
- Die API ist die Sicherheitsgrenze — Frontend-Gating ist nur UX-Unterstützung

**Pflicht-Prüfungen:**
- Welche Rollen sehen den betroffenen Vorgang?
- Welche Rollen dürfen den betroffenen Vorgang ausführen?
- Wo wird die Berechtigung serverseitig durchgesetzt?
- 401- und 403-Pfade vorhanden?

## Test-Referenz

- Tests beweisen beobachtbares Verhalten — keine leeren Tests, keine Skips ohne dokumentierten Blocker
- Nur Temp-Daten oder `os.tmpdir()` — nie produktive MySQL-DBs

**Testkommandos (seriell):**
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:e2e:browser
```

**Pflicht-Abdeckung nach Änderungstyp:**
- API-Route → Auth-Guard, Validierung, Erfolgspfad, Fehlerpfade (400/401/403/404), Service-Effekt
- Schema/Migration → Must-Pass Safety Gate + Migrationslauf auf Dev und Test
- Frontend-State → Query-Key, Hook-Verhalten, Mutations-Invalidierung

## Git-Workflow — Referenz

- Git-Kommandos immer seriell
- `work` nicht direkt anfassen außer bei explizitem Nutzerwunsch
- `git status --short --branch` vor Branch- oder Save-Operationen

**Kurzkommandos:**
- `branch <name>` → von `work` abzweigen, Remote-Tracking einrichten, sofort pushen
- `save` → alle Änderungen stagen, sinnvoll committen, Branch pushen
- `savetowork` → save, in `work` mergen, Änderungen verifizieren, `work` pushen, Branch-Löschung erst nach expliziter Bestätigung

## Plan-Checkliste

Vor jedem Plan benennen:
- [ ] Auftragsklasse (1–5)
- [ ] Branch-Strategie (nur bei explizitem Wunsch)
- [ ] Gelesene Dokumente und warum sie ausreichen
- [ ] Betroffene Domäne und Schichten
- [ ] Auth/Rollen/Permissions betroffen?
- [ ] DB-Migration nötig?
- [ ] Was bleibt unverändert?
- [ ] Beobachtbare Erfolgskriterien / Verifikationsweg benannt
- [ ] Risiken und Schadenspotential

## Abnahmekriterien

**Definition of Done:**
- Geplanter Scope implementiert oder Blocker dokumentiert
- Keine unverwandten Refactorings oder Scope-Erweiterungen
- Migrationen und Shared Types enthalten wenn betroffen
- Auth, Rollen und Permission-Effekte implementiert und getestet
- Frontend-State, Invalidierung und Navigation konsistent
- Tests hinzugefügt oder fehlende Abdeckung als Blocker dokumentiert
- Schritt-Log für Klassen 4 und 5

**Abschlussbericht auf Deutsch:**
- Ergebnis, geänderte Dateien/Bereiche, ausgeführte Tests, offene Risiken und Blocker

## Hard-Stop-Bedingungen

Abbrechen und Blocker dokumentieren wenn:
- Scope widerspricht `agents.md`
- Architekturentscheidung nicht spezifiziert und keine sichere lokale Konvention vorhanden
- Plan würde stille unverwandte Nutzeränderungen entfernen oder überschreiben
- Benötigte Migrationsdatei oder Schema-Quelle fehlt und alle abhängigen Schritte brauchen sie
