---
name: test-quality-review
description: >
  Vollständige Qualitäts- und Abdeckungsanalyse des MuGPlan-Testbestands.
  Liest alle Testdateien, zählt Testfunktionen (nicht nur Dateien), prüft
  Teststrategie-Konformität gemäß agents.md §12, identifiziert Abdeckungslücken
  und erzeugt einen priorisierten Markdown-Bericht mit Änderungsaufträgen.
  Auslöser: "Testanalyse", "Testbericht", "Testqualität prüfen",
  "Teststrategie-Konformität", "Testabdeckung prüfen", "Tests analysieren".
---

# Test Quality Review — MuGPlan

Auftragsklasse 2 (reiner Report) — keine Codeänderungen.

## Testhierarchie

```
tests/
├── unit/                    ← isolierte Logik, keine echte DB
├── integration/
│   └── server/              ← echte MySQL Temp-DB (mugplan_test), echte Express-App
├── e2e/                     ← vitest E2E
└── e2e-browser/             ← Playwright Browser-Tests
```

Hilfsdateien:
- `tests/helpers/testDataFactory.ts` — Factory-Einstieg für alle Tests mit DB-Bezug
- `tests/setup.env.ts` — Setup/Teardown für Integrationstests
- `createApiTestApp()` — App-Instanz für Integrationstests

## Schritt 0: Vorbereitung

Alle Testdateien unter `tests/` kartieren (`*.test.ts`, `*.spec.ts`).

Zählung pro Ebene:
- Anzahl Testdateien
- Anzahl Testfunktionen (`it(` / `test(`) — nicht nur Dateizählung

## Schritt 1: Teststrategie-Konformität (agents.md §12)

**1.1 DB-Isolation in Unit-Tests**
Prüfen ob Unit-Tests echte DB-Verbindungen verwenden (`drizzle`, `db.`, `mysql2`, `pool`).
Jeder Treffer → Befund (Kritisch).

**1.2 Produktions-DB-Zugriff**
Prüfen ob Tests `.env.dev` oder `.env.prod` laden oder produktive DB-Namen verwenden.
Jeder Treffer → Befund (Kritisch).

**1.3 Safety Gate Umgehung**
Prüfen ob Tests `assertTestMode()`, `assertSafeWriteTargetForTestMode()` o.ä. Guard-APIs fehlen in Integrationstests die auf DB schreiben.
Fehlend → Befund (Kritisch).

**1.4 Pflichtkommentar**
Prüfen ob Testdateien den Pflichtkommentar enthalten (Test Scope / Abgedeckte Regeln / Fehlerfälle / Ziel).
Fehlend → Befund (Niedrig).

**1.5 Leere Tests und undokumentierte Skips**
Prüfen auf `test.skip`, `it.skip`, `describe.skip` oder leere Testkörper ohne Log-Blocker.
Jeder Treffer → Befund (Mittel).

**1.6 Berechtigungstests**
Prüfen ob geschützte Routen Berechtigungstests haben (positiver Fall + negativer Fall).
Fehlend → Befund (Hoch).

**1.7 testDataFactory-Nutzung**
Prüfen ob Integrationstests mit direkten `INSERT`-Statements statt Factory arbeiten.
Jeder Treffer → Befund (Mittel).

## Schritt 2: Domänen-Abdeckung

| Domäne | Kern-Entitäten | Abgedeckt? |
|---|---|---|
| Termine | appointments, appointmentEmployees | — |
| Mitarbeiter | employees, employeeAvailability | — |
| Projekte | projects, projectEmployees | — |
| Kunden | customers | — |
| Kalender | calendar aggregation, KW-Logik | — |
| Auth & Rollen | session, permissions | — |

Fehlende Kerndomänen → Befund (Hoch). Fehlende Infrastruktur → Befund (Mittel).

## Schritt 3: Methodische Qualität

**3.1 Zu schwache Assertions**
`toBeTruthy()` / `toBeDefined()` wo spezifische Werte prüfbar wären → Befund (Niedrig).

**3.2 Mehrfach-Status-Erwartungen**
`expect([200, 201]).toContain(status)` statt konkretem Status → Befund (Mittel).

**3.3 Assertions abschwächen**
Prüfen ob neuere Tests gegenüber älteren Versionen abgeschwächte Assertions haben → Befund (Hoch).

**3.4 Direkter DB-Sprawl in Testdateien**
Prüfen ob Tests Daten direkt einfügen ohne `testDataFactory` → Befund (Mittel).

## Schritt 4: Dateisystem-Sicherheit

Schreibzugriffe auf Produktionspfade (echte Upload- oder Backup-Verzeichnisse außerhalb `os.tmpdir()`) → Befund (Kritisch).

Temporäre Schreibzugriffe ohne `os.tmpdir()` und ohne Cleanup → Befund (Mittel).

## Schritt 5: Bericht

```markdown
# Test Quality Review — MuGPlan
**Datum:** <DATUM>

## Kennzahlen
| Ebene | Dateien | Testfunktionen |
|---|---|---|
| Unit | N | N |
| Integration | N | N |
| E2E (vitest) | N | N |
| Browser (Playwright) | N | N |
| Gesamt | N | N |

## Befunde
### Kritisch
### Hoch
### Mittel
### Niedrig

## Empfehlungen
```

## Schritt 6: Änderungsaufträge

- Pro Befund Kritisch/Hoch → eigenständiger Änderungsauftrag
- Pro Befund Mittel → gebündelter Auftrag
- Befunde Niedrig → Gesamtliste ohne Einzelauftrag
