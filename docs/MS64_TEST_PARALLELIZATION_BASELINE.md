# MS-64 — Browser Test Parallelisierung: Baseline & Laufzeitbericht

Lebendes Artefakt zu Meilenstein MS-64. Erfasst die AP01-Baseline (Ist-Laufzeiten
seriell), die Zielmetrik und die fortlaufenden Vorher/Nachher-Vergleiche je Testebene.

Stand: 09.06.26

## Mess-Setup (feste Referenz)

- Maschine: lokale Entwicklungsumgebung (Windows, git-bash).
- DB: `mugplan_test` auf `localhost:3306` (lokale MySQL-Instanz).
- Worker-Konfiguration der Baseline: Playwright `workers = 1`, Vitest `fileParallelism = false`.
- Messgroesse: Wall-Clock-`Duration` aus dem jeweiligen Test-Runner, Median aus mindestens 3 Laeufen.
- Hinweis zu Vitest-Kennzahlen: Die Teilwerte `import`/`tests` werden im Parallelbetrieb
  kumulativ ueber alle Worker-Prozesse ausgewiesen; massgeblich ist die Wall-Clock-`Duration`.

## Statische Metriken (Bestand)

| Ebene | Test-Dateien | Tests | Runner |
|---|---|---|---|
| Unit | 317 (316 aktiv, 1 skipped) | 1352 (1350 aktiv, 2 skipped) | Vitest (`unit`-Projekt) |
| Integration | 128 | — (noch nicht gemessen) | Vitest (`integration`-Projekt) |
| E2E (Vitest) | 3 | — (noch nicht gemessen) | Vitest (`e2e`-Projekt) |
| Browser/E2E | 90 | — (noch nicht gemessen) | Playwright |

## Vorgehensentscheidung: Baseline je Ebene verschraenkt

Statt vorab alle vier Suiten 3x zu messen, wird die Baseline je Ebene unmittelbar vor
der Parallelisierung genau dieser Ebene erhoben (Unit -> AP11, Integration -> AP10,
Browser -> AP05-AP09). Begruendung: Der Vorher/Nachher-Vergleich braucht die Baseline nur
fuer die jeweils geaenderte Ebene; das vermeidet einen mehrstuendigen Vorab-Messblock und
haelt die Referenz pro Ebene konsistent mit dem Aenderungszeitpunkt.

## Zielmetrik

Je Testebene eine messbar reduzierte Wall-Clock-Laufzeit gegenueber der seriellen Baseline,
ohne Verlust an gruenen Ergebnissen und ohne neue Flakiness in Wiederholungslaeufen. Der
serielle Modus bleibt je Ebene als Fallback lauffaehig.

## Ergebnisse je Ebene

### Unit (AP01-Baseline + AP11)

Baseline seriell (`fileParallelism = false`), 3 Laeufe:

| Lauf | Duration |
|---|---|
| 1 | 129,14s |
| 2 | 132,72s |
| 3 | 130,56s |
| **Median** | **130,56s** |

Parallel (`--fileParallelism`, forks-Pool, Tests innerhalb Datei seriell), 3 Laeufe:

| Lauf | Duration |
|---|---|
| 1 | 13,40s |
| 2 | 13,41s |
| 3 | 13,30s |
| **Median** | **13,40s** |

Ergebnis: **~9,75x schneller** (130,56s -> 13,40s, ca. 117s Ersparnis pro Lauf). In allen
sechs Laeufen identisch 316 passed / 1 skipped, 1350 Tests gruen — keine neue Flakiness.

Umsetzungshinweis: `fileParallelism` ist in der eingesetzten Vitest-Version eine Root-Option
und laesst sich nicht pro Projekt ueberschreiben (empirisch belegt). Da `test:unit` als
eigenstaendige Invocation nur das `unit`-Projekt ausfuehrt, wird die Parallelitaet dort per
CLI-Flag `--fileParallelism` auf Root-Ebene erzwungen, ohne Integration/E2E zu beeinflussen.
Serieller Fallback fuer Unit: `npm run test:unit -- --no-file-parallelism`.

### Integration (AP01-Baseline + AP10)

Noch offen. Voraussetzung: Worker-DB-Lifecycle (AP03) und erweiterte Safety-Guards (AP04).

### E2E Vitest (haengt am Integration-Setup, mit AP10)

Blockiert (siehe Migrations-Blocker unten).

### Browser/E2E (AP01-Baseline + AP05-AP09)

Blockiert (siehe Migrations-Blocker unten). Spaeter zusaetzlich zu erfassen: Liste der
langsamsten Browser-Spezifikationen (Top-Zeitfresser) und die Dauer-Verteilung ueber alle
Browser-Dateien (Median vs. Maximum), um zu beurteilen, ob einzelne lange Dateien den
kritischen Pfad deckeln (Reorg-Potenzial).

## HARTER BLOCKER: Migrationskette baut kein Schema von Grund auf (AP03/AP05/AP10)

Status: **blockiert** — betrifft AP03 (Worker-DB-Lifecycle) und davon abhaengig AP05
(Worker-Server) und AP10 (Integration worker-parallel). AP11 (Unit) und AP04 (Guards) sind
davon **nicht** betroffen und bleiben gueltig.

Befund (verifiziert):
- `npm run db:migration-status:test` meldet fuer `mugplan_test`: 29 Repository-Migrationen,
  0 angewendete, 29 fehlende. Das getrackte Migrationsjournal ist leer.
- Keine Migration erzeugt die Basistabellen (`project`, `users`, `customers`, `appointments`,
  `employees`, `tours`). `0000_nice_bulldozer.sql` legt nur Produkt-Management-Tabellen an
  und fuegt sofort einen Fremdschluessel `project_order_items -> project(id)` hinzu, obwohl
  die Tabelle `project` nie per Migration erzeugt wird.
- Folge: Die Migrationskette ist rein inkrementell auf einem historisch via `drizzle-kit push`
  erzeugten Schema. `tests/helpers/resetDatabase.ts` setzt ein vorhandenes Schema voraus
  (SHOW TABLES + DELETE, plus manueller 2FA-Spalten-Patch).
- Auf der bestehenden `mugplan_test` bleibt das verborgen, weil der idempotente
  Migrationsrunner vorhandene Tabellen ueberspringt. Auf einer **frischen** Worker-DB laufen
  alle Statements in Dateireihenfolge und brechen mit `Failed to open the referenced table
  'project'` (MySQL 1824) ab.

Konsequenz fuer AP03: Eine frische Worker-DB kann ueber `db:migrate:test` derzeit nicht
aufgebaut werden. Die in AP03 geforderte Akzeptanz ("vollstaendig migriert, Historie ohne
pending/unexpected") ist damit ohne vorgelagerte Korrektur nicht erreichbar. Gemaess CLAUDE.md
Abschnitt 16 ist dies als harter Abschluss-Blocker zu behandeln; AP03 gilt als blockiert, nicht
als umgesetzt.

Optionen (Entscheidung erforderlich, jeweils ausserhalb des bisherigen AP03-Scopes):
1. Konsolidiertes Baseline-Migrationsskript erstellen, das das aktuelle Gesamtschema von Grund
   auf erzeugt (sauberster, produktionsnaher Weg; eigener, sensibler Migrationsauftrag mit
   Dev/Test-Verifikation nach CLAUDE.md 16).
2. Worker-DB-Schema per Klon der bestehenden `mugplan_test` aufbauen (mysqldump --no-data oder
   `CREATE TABLE LIKE`) statt Migration; entkoppelt die Parallelisierung von der
   Migrationsdrift, weicht aber vom AP03-Ziel "produktionsnaher Migrationspfad" ab.
3. DB-gebundene Parallelisierung (AP03/AP05/AP10) zurueckstellen; nur den bereits erzielten
   Unit-Gewinn (AP11) behalten.
