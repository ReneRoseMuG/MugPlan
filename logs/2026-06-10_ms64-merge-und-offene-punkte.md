# MS-64 Integration in work + main-Sicherung + offene Punkte

Datum: 10.06.26
Auftragsklasse: 3 (Git-Operationen) mit vorgelagerter Analyse

## Zweck

Die fertige MS-64-Test-Parallelisierung in `work` integrieren, `main` vorab als sichere
Rückfallebene (aktueller Server-Stand) setzen und die offenen Folgepunkte festhalten.

## Was gemacht wurde

1. **Vorab-Prüfung „kein Produktionscode"** (auf Wunsch vor dem Merge):
   - Gegenüber `work` geändert: 100 Test-Dateien, 4 Doku-Dateien, 5 Test-/Build-/Doku-
     Konfigurationsdateien im Root — und **genau eine** Datei in einem Produktionspfad:
     `server/security/dbSafetyGuards.ts`.
   - Diese eine Änderung wirkt **nur im Testmodus** (erlaubt zusätzlich Worker-Test-DBs
     `mugplan_w<N>_test`); der Produktions-/Entwicklungspfad ist unverändert. Damit ändert
     der Merge **kein Produktionsverhalten**.
2. **Sorge „gestrige Fixes auf work könnten überschrieben werden" geklärt:**
   - `work` (lokal + origin) stand unverändert auf `69cfae96` — genau dem Punkt, auf dem der
     MS-64-Branch aufgesetzt wurde. Alle gestrigen Fixes (caldav, AppointmentSaveReviewDialog,
     E2E-Browser #1–#18, UI-Fixes) sind das **Fundament** des Branches und können beim Merge
     nicht verloren gehen. Der separat angelegte „Unified Appointment Change Model"-Branch ist
     laut Auftraggeber verworfen und blieb außen vor.
3. **`work` → `main` gemerged und gepusht:** `main` steht jetzt auf `69cfae96` (sicherer
   Server-Stand als Rückfallebene). Reiner Fast-Forward.
4. **`feature/ms64-test-parallelisierung` → `work` gemerged und gepusht:** `work` steht jetzt
   auf `ce328d7e` (sicherer Stand **+** komplette MS-64-Parallelisierung). Reiner Fast-Forward.
5. **Lokale Branch-Pflege:** alle lokalen Branches außer `main` und `work` gelöscht
   (`feature/ms64-test-parallelisierung` war vollständig gemerged → sichere Löschung). Der
   Remote-Branch `origin/feature/ms64-test-parallelisierung` bleibt vorerst erhalten.

## Branch-Stand danach

| Branch | Stand | Bedeutung |
|---|---|---|
| `main` | `69cfae96` | sicherer Server-Stand (Rückfallebene) |
| `work` | `ce328d7e` | sicherer Stand + MS-64-Parallelisierung |
| `origin/feature/ms64-test-parallelisierung` | `ce328d7e` | Remote-Arbeitsbranch (lokal gelöscht) |

## Angefangene, dann abgebrochene Analyse: 16 rote Browser-Tests

Auf Wunsch begonnen, dann bewusst abgebrochen und als offen belassen. Zwischenstand:
- 16 Browser-E2E-Specs sind **vorbestehend** rot (seriell wie parallel identisch, also
  unabhängig von der Parallelisierung).
- Erste Beobachtung am Drag-&-Drop-Test OR-01: Die App **erkennt den Konflikt korrekt** (Server
  lehnt ab), aber im Test erscheint das Konfliktfenster nicht und es trat eine
  React-Endlosschleife auf. **Gegenbefund des Auftraggebers:** dasselbe Fenster erscheint bei
  echter manueller Bedienung normal (Screenshot). → Verdacht verschiebt sich auf die
  **Test-Methode** (künstlich simuliertes Ziehen), nicht auf die App.
- Offene Gegenprobe: OR-01-Szenario mit **echtem Maus-Ziehen** nachstellen. Erscheint das
  Fenster → Tests auf echtes Ziehen umstellen (nur Test-Änderung). Sonst doch App-Bug.
- Festgehalten als offener Folgeauftrag (Chip „16 vorbestehende rote Browser-E2E-Tests
  aufarbeiten"). Keinerlei Code-Änderung an Tests oder App vorgenommen.

## Hinweise zum Testen / Nutzung

- Parallele Testläufe: `npm run test:unit` (datei-parallel), `npm run test:integration:parallel`,
  `npm run test:e2e:browser:parallel`. Serielle Fallbacks unverändert vorhanden.
- Voraussetzung parallel: Testnutzer darf `CREATE`/`DROP DATABASE` im Testmodus.

## Bekannte Einschränkungen / offene Punkte

1. **16 vorbestehende rote Browser-Tests** — Aufarbeitung offen (siehe oben).
2. **Fehlendes Baseline-Migrationsskript** — Migrationskette kann keine frische DB von Grund
   auf aufbauen (latentes Prod/Dev-Risiko); eigener Folgeauftrag.
3. **vitest-`e2e`-Projekt (3 Dateien)** noch nicht parallelisiert.
4. **`testIsolation*.ts`-Dateien** existieren physisch weiter (in den Hot-Paths umgangen).
5. **Remote-Branch** `origin/feature/ms64-test-parallelisierung` noch vorhanden (bei Bedarf
   löschen).
