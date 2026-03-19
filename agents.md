# AGENTS.md – MuGPlan

Codex ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht Codex die Umsetzung kontrolliert ab und dokumentiert den Blocker.

---

## 1. Dokumentenstrategie — Kontext sparsam nutzen

**Niemals** `docs/architecture.md` oder `docs/implementation.md` automatisch vollständig laden.

Stattdessen:
1. `architecture-index.md` lesen (Wurzelverzeichnis, ~20 Zeilen)
2. `implementation-index.md` lesen (Wurzelverzeichnis, ~30 Zeilen)
3. Nur die Abschnitte laden, die der Index als relevant ausweist

**Schnellcheck vor jedem Task:**

| Situation | Dokument nötig? |
|---|---|
| Reine Frage, kein Code | Nein |
| Git-Operation ohne Codeänderung | Nein |
| Isolierter Fix in einer Datei | Nur `implementation.md` Abschnitt 10 (Checkliste) |
| Neuer Endpunkt / Schichtenänderung | `architecture.md` Abschnitt 3, `implementation.md` Abschnitt 3 |
| Termin- / Mitarbeiter-Mutation | `architecture.md` Abschnitt 7, `implementation.md` Abschnitt 5.1 |
| Auth / Rollen / Sicherheit | Alle einschlägigen Auth- und Sicherheitsabschnitte |
| Neues Feature über mehrere Schichten | Vollständige Lektüre beider Dokumente |
| Unklare Zuordnung | Index lesen, dann gezielt erweitern — nicht raten |

Codex dokumentiert kurz, welche Abschnitte gelesen wurden und warum keine weitere Lektüre nötig ist.

---

## 2. Analyse vor der Umsetzung (Pflicht)

Bevor Änderungen vorgenommen werden:

- Bestehende Strukturen, Dateien und Muster auffinden
- Passende Einstiegspunkte identifizieren
- Parallele oder redundante Implementierungen vermeiden
- Prüfen ob vorhandene Strukturen nutzbar sind, bevor neue angelegt werden

Neue Dateien, Controller, Services, Endpoints oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind. Dieser Nachweis muss dokumentiert werden.

---

## 3. Planung

### 3.1 Branch-Frage (vor dem Plan)

Bevor Codex einen Plan erstellt, fragt er nach einem lokalen Branch von `work`, sofern der Nutzer nicht bereits ein Kurzkommando verwendet hat, das dieses Verhalten eindeutig festlegt:

> „Soll für diesen Auftrag ein lokaler Branch von `work` abgezweigt werden?"

- Bei **ja**: Branch-Namen erfragen, Branch anlegen, Remote-Tracking einrichten und den Branch sofort pushen (`git push -u origin <branch>`).
- Bei **nein**: direkt mit der Planung fortfahren.

Git-Aktionen dabei ausschließlich **seriell** ausführen (siehe Abschnitt 4.1).

### 3.2 Planformat

Pläne werden als klarer, lesbarer Fließtext im Chat präsentiert — kein Code, keine Diffs, keine Codeblöcke, keine Datei.

Jeder Plan enthält diese vier Abschnitte:

**Was ich plane**
Narrativer Überblick über Ansatz und Begründung — warum dieser Weg, nicht nur was getan wird.

**Betroffene Funktionen und Komponenten**
Je Funktion oder Komponente ein bis zwei Sätze: aktuelle Rolle und warum sie von der Änderung betroffen ist.

**Änderungen an bestehenden Funktionen**
Für jede Änderung: was sich ändert, warum, und was gleich bleibt. Nur Prosa.

**Erwartetes Ergebnis in der App**
Beobachtbares Ergebnis aus Nutzersicht: was sich verhält oder aussieht wie, welche Randfälle abgedeckt sind.

### 3.3 Planinhalt

- Plan ist klein geschnitten und nennt klar, welche Dateien voraussichtlich betroffen sind
- Jeder Planschritt hinterlässt einen stabilen, lauffähigen Zustand
- Risiken werden explizit benannt
- Abweichungen vom Plan während der Umsetzung werden kurz und nachvollziehbar begründet

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen.

### 3.4 Kurzkommandos

Zur Reduktion von Dialog- und Kontextverbrauch darf der Nutzer kurze Kommandos verwenden. Codex übersetzt diese Kommandos in die zugehörigen Handlungen. Fehlt ein Kommando, gilt das normale Verhalten aus den übrigen Abschnitten.

### Zulässige Kurzkommandos

`branch <name>`
Codex legt vor der weiteren Arbeit einen lokalen Branch von `work` mit dem angegebenen Namen an, richtet das Remote-Tracking ein und pusht den Branch sofort mit `git push -u origin <name>`. Alle Git-Schritte werden seriell ausgeführt.

`plan`
Codex führt die Analyse gemäß Abschnitt 2 aus und erstellt danach direkt den Plan im Format aus Abschnitt 3.2 und 3.3, ohne die Branch-Frage erneut zu stellen.

`audit`
Codex führt den vollen Audit gemäß Abschnitt 12 aus und berichtet die Ergebnisse vollständig nach den dort definierten Regeln.

`test`
Codex führt den vollen Testlauf gemäß Abschnitt 12 als reinen Report-Auftrag aus und beachtet dabei zusätzlich alle Regeln aus Abschnitt 11. Während dieses Auftrags nimmt Codex keine Code-, Test-, Konfigurations- oder Dokumentationsänderungen vor.

`log <kurztitel>`
Codex erstellt das Auftragslog gemäß Abschnitt 14.2 unter `logs/<yyyy-mm-dd>_<kurztitel>.md`.

`docs-sync`
Codex prüft `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität im Kontext des erledigten Auftrags und aktualisiert sie bei Bedarf gezielt.

`cleanup`
Codex führt den Abschluss des aktuellen Arbeitsbranches ausschließlich seriell aus:
1. Codex stellt sicher, dass der aktuelle Branch nicht `work` ist, keine uncommitteten Änderungen enthält und vollständig nach `origin` gepusht ist.
2. Codex wechselt auf `work`.
3. Codex stellt sicher, dass `work` keine uncommitteten Änderungen enthält und vollständig mit `origin/work` synchronisiert ist.
4. Codex merged den Arbeitsbranch in `work`.
5. Codex prüft das Ergebnis auf `work`.
6. Codex pusht `work`.
7. Codex löscht danach nur den lokalen Arbeitsbranch. Der Remote-Branch wird nicht gelöscht.
8. Bei uncommitteten Änderungen, fehlendem Push, Divergenzen, Merge-Konflikten oder anderen Blockern bricht Codex kontrolliert ab und dokumentiert den Grund.

---

## 4. Änderungsdisziplin

Codex arbeitet minimal-invasiv. Er verändert nur den Code, der zur Erfüllung des Auftrags zwingend erforderlich ist:

- Keine stillen Refactorings
- Keine kosmetischen Anpassungen
- Keine Umbenennungen, Verschiebungen oder Formatierungen „zur Verbesserung"
- Keine Änderungen an Dateien, die nicht klar zum Auftrag gehören
- Keine bestehende Funktionalität nebenbei entfernen

Erkannter Verbesserungs- oder Refactoring-Bedarf wird dokumentiert, aber nicht umgesetzt.

### 4.1 Git-Kommandos nur seriell

Git-Aktionen werden ausschließlich **seriell** ausgeführt. Kein paralleles Ausführen von `git add`, `git commit`, `git status`, `git diff`, `git push` oder ähnlichen Kommandos. Vor dem nächsten Git-Schritt ist immer das Ergebnis des vorherigen abzuwarten.

---

## 5. Architektur- und Konfigurationsgrenzen

- Trennung im Backend nach Route → Controller → Service → Repository
- Contract-First-Regel über den zentralen Contract-Index — keine API-Änderungen „frei Hand"
- Fachliche Regeln werden serverseitig implementiert, nie nur im Frontend
- React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung
- Kalenderrelevante Daten bevorzugt in der serverseitigen Kalender-Aggregation ergänzen

Ohne explizite Anweisung im Auftrag darf Codex nicht:

- Architekturentscheidungen treffen oder ändern
- Neue Patterns, Frameworks oder Infrastruktur-Änderungen einführen
- Build-, Tooling- oder Konfigurationsdateien verändern
- Abhängigkeiten hinzufügen, entfernen oder aktualisieren

Wenn eine Aufgabe ohne solche Änderungen nicht sauber lösbar ist, wird dies als Blocker dokumentiert.

---

## 6. UI-Grenzen

UI-Elemente darf Codex nur ändern oder ergänzen, wenn dies **explizit im Auftrag** enthalten ist:

- Keine UI-Komponenten verändern oder neu entwerfen
- Kein CSS anpassen oder neu anlegen
- UI-Arbeit folgt dem vorhandenen Code und den existierenden Komponenten

---

## 7. Fachliche Invarianten

- Ein Termin ist fachlich nur gültig, wenn ihm entweder ein Projekt oder direkt ein Kunde zugeordnet ist
- Blockierende Überschneidungsregel für Mitarbeiterzuweisungen ist einzuhalten
- Keine Umgehung von Rollen- und Lock-Regeln

---

## 8. Daten- und Sicherheitsregeln

- Keine Zugangsdaten, Tokens oder Secrets in Quellcode, Logs oder Dokumentation
- Für Beispiele, Tests oder Platzhalter ausschließlich synthetische, eindeutig nicht-produktive Daten verwenden
- Debug-Ausgaben mit potenziell sensiblen oder personenbezogenen Daten vermeiden

---

## 9. Encoding

- Alle Quelltexte und Doku-Dateien werden in UTF-8 gespeichert
- Keine UTF-16-Dateien in `client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/`
- Bei falsch dargestellten Umlauten oder Sonderzeichen: `npm run check` ausführen, gemeldete Datei in UTF-8 korrigieren, erneut `npm run check`, dann Commit

---

## 10. Deployment & Umgebungsregeln

### Umgebungsmodi und Env-Dateien

| Modus | Env-Datei |
|---|---|
| `development` | `../../shared/.env.dev` |
| `test` | `../../shared/.env.test` |
| `production` | `../../shared/.env.prod` (via `npm start`) |

Kein Env-Datei-Fallback erlaubt. Fehlt die erwartete Env-Datei → fail fast.

### Startup-Befehle

- `npm run dev` → `cross-env NODE_ENV=development tsx server/index.ts`
- `npm test` → `cross-env NODE_ENV=test MUGPLAN_MODE=test vitest`
- `npm start` → `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`

### DB Safety Model (Pflicht)

Pflichtfelder in der jeweiligen Env-Datei: `DB_ALLOWED_DATABASES_DEV|TEST|PROD` und `DB_ALLOWED_HOSTS_DEV|TEST|PROD`.

- Globaler Startup-Guard in `server/db.ts` validiert das URL-Ziel vor `createPool()`
- URL-DB-Name und URL-Host müssen zur Allowlist passen
- Destruktive Operationen müssen zusätzlich `SELECT DATABASE()` validieren

### Migrationsstrategie (verbindlich)

- Jede strukturelle Änderung am DB-Schema erfordert eine neue versionierte Migrationsdatei unter `migrations/`
- Eine Änderung nur in `shared/schema.ts` ohne neue Migration ist unzulässig
- `drizzle-kit push` ist für reguläre Teamarbeit nicht zulässig
- Commits bei Schemaänderungen müssen immer `shared/schema.ts`, neue Migrationsdatei und `migrations/meta/*` gemeinsam enthalten
- Bereits versionierte Migrationsdateien dürfen nicht umgeschrieben werden — Korrekturen über neue Folge-Migrationen

---

## 11. Teststrategie

### Must-Pass Safety Gate (vor jeder Testausführung)

1. `.env.test` ist vorhanden und erfolgreich geladen
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`
3. Erlaubte DB-Ziele stammen ausschließlich aus Test-Env
4. DB-Connections laufen ausschließlich über zentrale Guard-APIs: `assertTestMode()`, `assertSafeWriteTargetForTestMode()`, `assertSafeDestructiveOperationTarget()`, `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungültig.

### Testebenen

**Unit** — isolierte Logik, Mocks/Stubs/Fakes, keine echte DB-Verbindung, zentrale Fixtures aus `tests/helpers/testDataFactory.ts`.

**Integration** — reale DB nur gegen Testziel, Setup/Teardown über `tests/setup.env.ts`, Factory-Einstieg zwingend über `tests/helpers/testDataFactory.ts`. Integration-Tests **müssen** mit `--reporter=verbose` ausgeführt werden.

**E2E** — vollständige Workflows, isolierte Daten, Suite-weite Resets nur guardiert.

### Timeout-Regel

Für `npm run test:integration` und `npm run test:e2e` ist standardmäßig ein langer Command-Timeout zu verwenden. `npm run test:e2e:browser` bleibt davon unberührt.

### Verbotene Testmuster

- Direkter Insert/Update-Sprawl in Testdateien ohne zentralen Einstieg
- Demo-/Bestandsdaten als implizite Voraussetzung
- Eigene Express-/HTTP-App-Aufbauten in Integrationstests statt `createApiTestApp()`
- Assertions auf mehrere alternative HTTP-Statuscodes für denselben fachlichen Fehler
- Schreibzugriffe in Tests außerhalb von `os.tmpdir()`

### Test-Runs dürfen nicht in eigenständigen Fixes münden

Schlägt ein Test fehl, dokumentiert Codex den Fehler und nimmt keine eigenständigen Fixes vor.

Wurde jedoch ein **voller Testlauf** oder das Kurzkommando `test` explizit angefordert, führt Codex alle in Abschnitt 12 definierten Test-Kommandos **vollständig und seriell** zu Ende, auch wenn einzelne Teilkommandos fehlschlagen. Die Fehlschläge werden gesammelt und anschließend strukturiert berichtet.

Ein explizit angeforderter Testlauf ist immer ein **reiner Report-Auftrag**. Während eines solchen Testlaufs nimmt Codex keinerlei Änderungen an Produktivcode, Tests, Konfiguration, Skripten oder Dokumentation vor. Auch triviale oder offensichtliche Test-Fixes sind in diesem Modus unzulässig. Änderungen sind erst nach einem separaten Folgeauftrag zur Behebung erlaubt.

---

## 12. Begriffe: „voller Testlauf" und „voller Audit"

### Voller Testlauf umfasst mindestens

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

### Voller Audit umfasst mindestens

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Nach Ausführung muss Codex explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte, welche Teile nicht ausgeführt wurden und warum. „Alles grün" ist nur zulässig, wenn alle verpflichtenden Kommandos erfolgreich abgeschlossen wurden.

---

## 13. Test-Dokumentationspflicht

### Pflicht-Kommentar in jeder Testdatei

```
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

### Pflege von docs/TEST_MATRIX.md

Bei jeder Erstellung oder Erweiterung von Tests pflegt Codex `docs/TEST_MATRIX.md` eigenständig und verpflichtend:

```
| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [datei.test.ts](../tests/...) | FT14 | Unit | Kurzbeschreibung | ✓ |
```

Fehlt die Aktualisierung der Test-Matrix, gilt die Teständerung als unvollständig.

---

## 14. Abschluss-Workflow

Nach Fertigstellung eines Auftrags stellt Codex die folgenden Fragen **der Reihe nach** und wartet jeweils auf Antwort:

### 14.1 Audit und Testlauf

> „Soll ich einen vollen Audit und einen vollen Testlauf ausführen?"

- Bei **ja**: Alle Kommandos aus Abschnitt 12 vollständig ausführen.
- Ein fehlgeschlagenes Test-Kommando unterbricht den vollen Testlauf nicht. Codex führt alle weiteren verpflichtenden Test-Kommandos seriell aus und berichtet die Fehlschläge gesammelt im Abschlussbericht.
- Der volle Testlauf ist auch hier ein reiner Report-Auftrag. Währenddessen werden keine Fixes und keine sonstigen Änderungen vorgenommen.
- Test-Report danach sortiert ausgeben nach:
  1. **Kritikalität** (rot/fehlgeschlagen zuerst, dann gelb/Warnungen, dann grün)
  2. **Problemstellung** (gleiche Fehlerursachen gruppiert)
- Jeder fehlgeschlagene Test wird mit Datei, Testname, Fehlertyp und einer Einschätzung der Auswirkung aufgeführt.
- Bei **nein**: kein Testlauf.

### 14.2 Log schreiben

> „Soll ich ein Log für diesen Auftrag schreiben?"

- Bei **ja**: neue Markdown-Datei unter `logs/<yyyy-mm-dd>_<kurztitel>.md` mit Zweck, Scope, technischen Entscheidungen, betroffenen Dateien, Hinweisen zum Testen und bekannten Einschränkungen.
- Bei **nein**: keine Dokumentationsdatei.

### 14.3 Architekturdokumentation aktualisieren

> „Soll ich `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität prüfen und bei Bedarf aktualisieren?"

- Bei **ja**: Codex prüft alle vier Dateien auf veraltete oder fehlende Einträge im Kontext des abgeschlossenen Auftrags und aktualisiert sie gezielt — keine vollständigen Neuschriften.
- Bei **nein**: keine Dokumentationsänderung.

### 14.4 Abschlussprüfung (immer, ohne Rückfrage)

Codex prüft das Ergebnis explizit gegen:

- Den Aufgabentext (Ziel, Nicht-Ziele, Akzeptanzkriterien)
- Die gelesenen Architektur- und Implementierungsvorgaben

Codex nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt, alle Verbote eingehalten und die geforderte Dokumentation vollständig vorliegt. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Abbruchgrund sauber dokumentiert ist.
