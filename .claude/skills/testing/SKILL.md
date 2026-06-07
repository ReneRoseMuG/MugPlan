---
name: testing
description: >
  Test-Strategie und Testplanung für MugPlan — Regelanalyse, Szenariomatrix und
  Testebenenentscheidung für abgeschlossene Codeänderungen oder Testlückenbewertungen.
  Auslöser: "welche Tests brauche ich", "schreib Tests für X", "prüf die Testabdeckung",
  "nach der Änderung Tests", "fehlen Tests für Y".
---

# Testing-Skill — MugPlan

Kombiniert Auftragsklärung, Regelanalyse, Teststrategie und Szenarioplanung.
Einstiegspunkt für alle Test-Aufträge die mehr als eine einzelne Testebene betreffen.

---

## MugPlan-Testkommandos

```bash
npm run test:unit                                         # Unit-Tests
npm run test:integration -- <datei> --reporter=verbose   # Integration (immer verbose)
npm run test:e2e                                          # E2E
npm run test:e2e:browser                                  # Browser-E2E
```

**Safety Gate (Pflicht vor jedem Lauf, CLAUDE.md §12):**
- `.env.test` vorhanden und geladen
- `NODE_ENV=test` und `MUGPLAN_MODE=test` aktiv
- DB-Ziel aus Test-Env, Guards aktiv: `assertTestMode()`, `assertSafeWriteTargetForTestMode()`

**Verbindliche Teststrukturen:**
```
tests/helpers/testDataFactory.ts          ← Pflichtquelle für alle Testdaten
tests/setup.env.ts                        ← Setup/Teardown für Integration-Tests
tests/integration/server/                 ← Integrationstests
tests/e2e-browser/                        ← Browser-E2E mit Playwright
```

---

## Trigger

- Abgeschlossene Codeänderung die Tests erfordert
- Auftrag Testlücken oder Testabdeckung fachlich zu prüfen
- Auftrag Tests anzupassen oder zu erweitern
- Abschlussprüfung vor Übergabe oder Merge

## Nicht-Trigger

- Ausdrücklich auf eine einzelne Testebene begrenzter Auftrag ohne vorgelagerte Analyse
- Reiner Testlauf ohne Änderungs- oder Bewertungsauftrag → direkt Kommando aus oben

---

## Pflichtablauf

### Teil 1 — Testkontext ermitteln

1. Änderungsquelle und beabsichtigtes Verhalten bestimmen.
2. Graphify-Protokoll anwenden (`skills/core/graphify-protocol.md`):
   ```bash
   graphify query "<geänderter Bereich>"
   graphify path "<Einstieg>" "<Persistenz oder Service>"
   ```
3. Geänderte Dateien, direkte Aufrufer, Abhängigkeiten und betroffene Schichten untersuchen.
4. Relevante fachliche Regeln laden (aus `shared/routes.ts`, Servicecode, `docs/architecture.md`).
5. Regeln als: Ausgangszustand → Aktion → Ergebnis → Ausnahmen formulieren.
6. Bestehende Tests nur als Indiz auswerten — Abweichungen zur Fachregel markieren.

**Quellenpriorität:**
1. Akzeptanzkriterien und freigegebene Spezifikationen
2. Feature- und Use-Case-Dokumentation
3. Architekturentscheidungen und API-Verträge (`shared/routes.ts`)
4. Tickets und nachvollziehbarer Nutzerauftrag
5. Bestehende Tests
6. Aktueller Code

### Teil 2 — Strategie und Szenarien

1. Für jede Regel mindestens ableiten: Erfolgsweg, relevante Gegenbeispiele, Fehlerfälle.
2. Ausgangszustand, Aktion, erwartete Wirkung und erwartete Nicht-Wirkung je Szenario festhalten.
3. Bestehende Tests den Regeln zuordnen. Status bewerten:
   - weiterhin passend | muss angepasst werden | muss erweitert werden | redundant | fehlt vollständig
4. Für Lücken entscheiden: anpassen, erweitern, ersetzen oder neu erstellen.
5. Testebene wählen:
   - **Unit** → isolierte Berechnung, Validierung, Zustandslogik — kein DB, kein Browser
   - **Integration** → reale Services, Repositories, DB, Auth, Dateisystem — via `createApiTestApp()`
   - **Browser/E2E** → kritischer Nutzerablauf, Risiko entsteht erst im Gesamtsystem; **Übergangsmodus beachten** (siehe unten)

---

## E2E/Browser — Übergangsmodus

Die E2E- und Browser-Test-Infrastruktur befindet sich im Umbau (`docs/TEST_ISOLATION_REBUILD_PLAN.md`).
Der Zeitpunkt des Umstiegs wird vom Nutzer bestimmt.

**Bis zur expliziten Freigabe durch den Nutzer gilt:**
- Neue E2E/Browser-Tests folgen den bestehenden Mustern der vorhandenen Suite
- Keine Pflicht zur Deklaration von Isolationsklasse, Baseline oder Storage-Bedarf
- Bestehende weiche Sichtbarkeitsprüfungen dürfen beibehalten und erweitert werden
- Keine Isolationsklassen-Infrastruktur neu aufbauen

**Nach expliziter Freigabe durch den Nutzer** gelten die vollen CLAUDE.md §12-Regeln:
Isolationsklasse (`A`/`B`/`C`/`S`), Baseline (`core`/`seeded`), Storage-Bedarf, Testdaten-Tokens.

---

## MugPlan-Isolationsregeln für Integration-Tests (CLAUDE.md §12)

- Keine direkten Insert/Update in Tests — immer über `testDataFactory.ts`
- Keine eigenen Express-App-Aufbauten — immer `createApiTestApp()`
- Eindeutig identifizierbare Testdaten-Tokens wenn Verwechslungen möglich

## Verbotene Testmuster

- Nur prüfen ob ein Element existiert (ohne Count/Identity/Delta)
- Assertions ausschließlich auf Mock-Aufrufe
- Pauschale Wartezeiten in Browser-Tests
- Assertions abschwächen damit Tests grün werden
- Demo- oder Bestandsdaten als implizite Voraussetzung

## Pflichtkommentar in jeder Testdatei

```ts
/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - <Regel 1>
 *
 * Fehlerfälle:
 * - <Fehlerfall 1>
 *
 * Ziel:
 * <Kurzbeschreibung der Absicherung>
 */
```

Neue/erweiterte Tests müssen `docs/TEST_MATRIX.md` aktualisieren.

---

## Ergebnisformat

| Feld | Inhalt |
|---|---|
| Regelkatalog | Fachliche Regeln mit Ausgangszustand, Aktion, Ergebnis |
| Szenariomatrix | Szenarien pro Regel mit Testebene |
| Bestandsbewertung | Status vorhandener Tests |
| Lücken | Fehlende Tests mit Begründung |
| Testplan | Priorität, Ebene, Daten, Isolation |
