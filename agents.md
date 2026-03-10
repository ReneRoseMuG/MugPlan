# AGENTS.md – MuGPlan

Dieses Dokument definiert verbindliche Leitplanken für Codex als ausführenden Coding Agent im MuGPlan-Projekt.

Codex ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Denken, Einordnen und Entscheiden liegen außerhalb seines Verantwortungsbereichs. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht Codex die Umsetzung kontrolliert ab und dokumentiert den Blocker – statt still Entscheidungen zu treffen.

---

## 1. Pflichtlektüre vor jedem Auftrag

Codex arbeitet mit **gestufter Pflichtlektüre**. Ziel ist minimale Kontextnutzung bei unveränderter Sicherheits- und Architekturtreue.

### 1.1 Basislektüre vor jeder Planung und jeder Änderung

Vor jeder Planung liest Codex die für nahezu alle Aufgaben relevanten Kernabschnitte und bestätigt danach explizit: „gelesen und verstanden".

Verbindliche Basislektüre:

- `docs/architecture.md`: `3. Architekturprinzipien`, `7. Fachliche Invarianten`, `10. Erweiterungspunkte`, `11. Bekannte Risiken / Architekturhinweise`
- `docs/implementation.md`: `2. Runtime- und Env-Regeln`, `3. Contract-First und Schichten`, `7. Sicherheitsgates für destruktive Operationen`, `10. Implementierungsregeln`, `11. Bekannte technische Hinweise`, Abschnitt `Schutzregel`

Ohne diese Basislektüre darf Codex keine Entscheidungen treffen, keinen Code ändern und keine Tests anlegen oder erweitern.

### 1.2 Zusatzlektüre nur bei betroffenen Bereichen

Zusätzliche Abschnitte werden nur gelesen, wenn die Aufgabe den Bereich tatsächlich berührt:

- API-, Backend-, Datenmodell- oder Kalender-Aggregationsänderung: zusätzlich passende Abschnitte in `docs/architecture.md` und `docs/implementation.md`
- Auth-, Session-, Rollen-, Sicherheits-, Deployment- oder DB-Thema: zusätzlich alle einschlägigen Runtime-, Auth-, Sicherheits- und Betriebsabschnitte
- Frontend-Server-State-, Settings- oder Listenlogik: zusätzlich die passenden Frontend-Abschnitte
- Tests, Test-Setup, Testdaten oder Audit-Kommandos: zusätzlich die vollständigen Test- und Qualitätsabschnitte
- Unklare Zuordnung oder erkennbare Querwirkung über mehrere Schichten: vollständige Lektüre der betroffenen Dokumente, bei Bedarf beider Dokumente komplett

### 1.3 Leseprotokoll statt Volllektüre-Pflicht

Codex dokumentiert zu Beginn kurz:

- welche Basisabschnitte gelesen wurden
- welche Zusatzabschnitte gelesen wurden
- warum keine weitere Lektüre nötig ist oder warum vollständig gelesen wurde

Wenn Codex nicht sicher eingrenzen kann, welche Abschnitte relevant sind, darf er nicht raten. In diesem Fall erweitert er die Lektüre kontrolliert, bis die Zuordnung belastbar ist.

---

## 2. Analyse vor der Umsetzung (Pflicht)

Bevor Änderungen vorgenommen werden, verschafft sich Codex einen Überblick über den relevanten Codebereich:

- Bestehende Strukturen, Dateien und Muster auffinden
- Passende Einstiegspunkte identifizieren
- Parallele oder redundante Implementierungen vermeiden
- Prüfen ob vorhandene Strukturen nutzbar sind, bevor neue angelegt werden
- Prüfen, ob die für die Aufgabe gelesenen Dokumentabschnitte ausreichen oder ob Zusatzlektüre erforderlich ist

Codex liest Dokumentation und Code **aufgabenbezogen**, nicht pauschal vollständig. Er erweitert den Lesekontext nur dann, wenn der Auftrag oder der gefundene Code dies erforderlich macht.

Neue Dateien, Controller, Services, Endpoints oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind. Dieser Nachweis muss dokumentiert werden.

---

## 3. Planungspflicht

Nachdem Codex die Basislektüre, erforderliche Zusatzlektüre und den Aufgabentext gelesen hat, beginnt er mit der Planung:

- Die Planung ist klein geschnitten und nennt klar, welche Dateien voraussichtlich betroffen sind
- Jeder Planschritt hinterlässt einen stabilen, lauffähigen Zustand
- Risiken werden explizit benannt
- Abweichungen vom Plan während der Umsetzung werden kurz und nachvollziehbar begründet

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Kein eigenständiges Handeln außerhalb des Plans.

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

Git-Aktionen werden in diesem Projekt ausschließlich **seriell** ausgeführt.

- Kein paralleles Ausführen von `git add`, `git commit`, `git status`, `git diff`, `git push` oder ähnlichen Git-Kommandos
- Keine Tool-Parallelisierung rund um Git-Schritte
- Vor dem nächsten Git-Schritt ist immer das Ergebnis des vorherigen Git-Kommandos abzuwarten

Wenn mehrere Git-Schritte nötig sind, führt Codex sie nacheinander aus und prüft nach jedem Schritt den Zustand erneut.

---

## 5. Architektur- und Konfigurationsgrenzen

Codex hält die bestehende Architektur ein, insbesondere:

- Trennung im Backend nach Route → Controller → Service → Repository
- Contract-First-Regel über den zentralen Contract-Index – keine API-Änderungen „frei Hand"
- Fachliche Regeln werden serverseitig als Wahrheit implementiert, nie nur im Frontend
- React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung, keine lokalen „Korrekturzustände"
- Kalenderrelevante, in allen Views benötigte Daten bevorzugt in der serverseitigen Kalender-Aggregation ergänzen, nicht per zusätzlicher UI-Requests

Ohne explizite Anweisung im Auftrag darf Codex nicht:

- Architekturentscheidungen treffen oder ändern
- Neue Patterns, Frameworks oder Infrastruktur-Änderungen einführen
- Build-, Tooling- oder Konfigurationsdateien verändern
- Abhängigkeiten hinzufügen, entfernen oder aktualisieren

Wenn eine Aufgabe ohne solche Änderungen nicht sauber lösbar ist, wird dies als Blocker dokumentiert.

---

## 6. UI-Grenzen

UI-Elemente darf Codex nur ändern oder ergänzen, wenn dies **explizit im Auftrag** enthalten ist. Ohne explizite Anweisung gilt:

- Keine UI-Komponenten verändern oder neu entwerfen
- Kein CSS anpassen oder neu anlegen
- UI-Arbeit folgt dem vorhandenen Code und den existierenden Komponenten – keine Parallelstrukturen

---

## 7. Fachliche Invarianten

Codex respektiert die fachlichen Regeln des Systems:

- Ein Termin ist fachlich nur gueltig, wenn ihm entweder ein Projekt oder direkt ein Kunde zugeordnet ist
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
- Git-Zeilenenden bleiben durch `.gitattributes` konsistent (`lf`, PowerShell `crlf`)
- Bei falsch dargestellten Umlauten oder Sonderzeichen: `npm run check` ausführen, gemeldete Datei/Zeile in UTF-8 korrigieren, erneut `npm run check`, dann Commit
- `npm run check` führt den Encoding-Check vor dem Typecheck aus und bricht bei Mojibake-Mustern oder UTF-16-BOM-Dateien ab

---

## 10. Deployment & Umgebungsregeln

### Umgebungsmodi und Env-Dateien

| Modus | Env-Datei |
|---|---|
| `development` | `../../shared/.env.dev` |
| `test` | `../../shared/.env.test` |
| `production` | `../../shared/.env.prod` (via `npm start`) |

Kein Env-Datei-Fallback erlaubt (auch nicht im Testmodus). App- und Testprozesse werden immer aus `root/releases/<instanz>` gestartet. Fehlt die erwartete Env-Datei im development/test-Modus → fail fast.

### Startup-Befehle

- Lokal/Server (`root/releases/version01`):
  - `npm run dev` → `cross-env NODE_ENV=development tsx server/index.ts`
  - `npm test` → `cross-env NODE_ENV=test MUGPLAN_MODE=test vitest`
  - `npm start` → `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`

### DB Safety Model (Pflicht)

Pflichtfelder in der jeweiligen Env-Datei:

- `DB_ALLOWED_DATABASES_DEV|TEST|PROD`
- `DB_ALLOWED_HOSTS_DEV|TEST|PROD`

CSV-Werte werden normalisiert (trim, leere Einträge entfernen, Hosts lowercase). Leere Pflichtlisten werden abgewiesen.

Sicherheitsregeln:

- Globaler Startup-Guard in `server/db.ts` validiert das URL-Ziel vor `createPool()`
- URL-DB-Name muss zur Allowlist passen
- URL-Host muss zur Allowlist passen
- Destruktive Operationen müssen zusätzlich `SELECT DATABASE()` validieren
- Konkrete DB-Namen variieren je Umgebung/Mandant – die Allowlists sind die einzige Wahrheitsquelle

### Reverse-Proxy Session-Einstellungen

- `TRUST_PROXY` steuert `app.set("trust proxy", ...)`
- `SESSION_COOKIE_SECURE` steuert den `secure`-Modus des `express-session` Cookies
- Empfohlene Produktionsbaseline: `TRUST_PROXY=1`, `SESSION_COOKIE_SECURE=auto`
- Reverse Proxy muss `X-Forwarded-Proto=https` weiterleiten, sonst werden keine Secure-Session-Cookies ausgestellt

### Verbindliche Migrationsstrategie

Diese Regeln sind fuer alle kuenftigen Schemaaenderungen verbindlich. Ziel ist ein einheitlicher, versionierter Migrationspfad fuer lokale Akteure und Remote-Umgebungen.

#### Drei strikt getrennte Ebenen

- **Schema im Code**: `shared/schema.ts` beschreibt den beabsichtigten Datenmodell-Stand im Repository.
- **Migrationsdateien im Repository**: `migrations/*.sql` sowie `migrations/meta/*` bilden die versionierte, nachvollziehbare Historie der Schemaaenderungen.
- **Tatsaechlich angewendeter Stand je Datenbank**: Massgeblich ist die pro Datenbank eingetragene Migration-History, insbesondere `__drizzle_migrations`. Die Datenbank ist nur auf dem Stand der Migrationen, die dort wirklich ausgefuehrt wurden.

#### Wann eine Migration Pflicht ist

- Jede strukturelle Aenderung am DB-Schema ist erst vollstaendig, wenn dazu eine neue versionierte Migrationsdatei im Repository existiert.
- Dazu zaehlen insbesondere: neue Tabellen, neue Spalten, entfernte Spalten, geaenderte Spaltentypen, Nullability-Aenderungen, Defaults, Constraints, Foreign Keys, Checks und Indizes.
- Eine Aenderung nur in `shared/schema.ts` ohne neue Migration ist unzulaessig und gilt als unvollstaendig.
- Reine Datenkorrektur- oder Einmal-Skripte ersetzen keine Schema-Migration.

#### Kanonischer Migrationspfad

- Fuer neue Schemaaenderungen ist ausschliesslich `migrations/` der kanonische Standardpfad.
- Neue Migrationen muessen eindeutig sortierbar und versioniert sein; der bestehende Drizzle-Mechanismus mit numerischem Praefix ist beizubehalten.
- `migrations/meta/*` gehoert zur Migrationshistorie und ist nicht optional.
- Vorhandene Dateien unter `script/sql/*.sql` gelten als Bestand oder manueller Sonderfall, nicht als regulaerer Zukunftspfad fuer neue Schemaaenderungen.

#### Commit-Regeln bei Schemaaenderungen

- Zusammen committed werden muessen mindestens:
- die Aenderung in `shared/schema.ts`
- die neue Datei unter `migrations/*.sql`
- die zugehoerigen Aenderungen unter `migrations/meta/*`
- alle fachlich notwendigen Code-, Test- und Dokumentationsanpassungen, die von dieser Schemaaenderung abhaengen
- Unzulaessig sind Commits mit Schemaaenderung ohne Migration oder Migration ohne den dazugehoerigen Schemakontext.
- Bereits versionierte und in Benutzung befindliche Migrationsdateien duerfen nicht still umgeschrieben, ersetzt oder inhaltlich uminterpretiert werden. Korrekturen erfolgen ueber neue Folge-Migrationen.

#### Lokaler Ablauf fuer Entwickler und Agenten

- Bei einer Schemaaenderung ist zuerst `shared/schema.ts` anzupassen und danach unmittelbar eine neue Migration unter `migrations/` zu erzeugen.
- Lokale Entwicklungsdatenbanken muessen ueber denselben versionierten Migrationspfad aktualisiert werden wie alle anderen Umgebungen.
- Direkte manuelle Schemaaenderungen per SQL-Client sind nicht Teil des Standardprozesses.
- `npm run db:push` beziehungsweise `drizzle-kit push` ist fuer regulaere Teamarbeit, gemeinsame Entwicklung und nachverfolgbare Schemaentwicklung nicht zulaessig.
- Reset-Skripte wie `script/sql/reset_safe_dev_test.sql` und `script/sql/reset_absolute_state.sql` sind Bootstrap-/Reset-Werkzeuge, aber keine autoritative Migrationshistorie.

#### Ablauf fuer Remote-Deployments

- Remote-Umgebungen verwenden denselben Migrationspfad wie lokale Akteure: die im Repository versionierten Dateien unter `migrations/`.
- Vor Inbetriebnahme einer neuen Version sind die ausstehenden Repository-Migrationen auf die Ziel-Datenbank anzuwenden.
- Ein Deployment ist nicht vollstaendig, wenn zugehoeriger Code ausgerollt wurde, die benoetigten Migrationen auf der Ziel-Datenbank aber noch fehlen.
- Ein stiller Direktabgleich des Schemas ohne versionierte Migration-History ist nicht zulaessig.

#### Zu vermeidende Abkuerzungen und Sonderwege

- Kein unprotokollierter Direktabgleich zwischen `shared/schema.ts` und Datenbank.
- Kein manuelles "Nachziehen" von Spalten, Indizes oder Constraints ausserhalb einer versionierten Migration als Standardweg.
- Keine neuen regulaeren Schemaaenderungen in `script/sql/*.sql`.
- Kein Vertrauen darauf, dass Startskripte Migrationen automatisch ausfuehren, solange ein solcher Mechanismus nicht explizit als Projektstandard eingefuehrt und dokumentiert wurde.

---

## 11. Teststrategie

### Must-Pass Safety Gate (vor jeder Testausführung)

Die folgenden Regeln müssen erfolgreich geprüft sein, **bevor irgendein Test ausgeführt wird**:

1. `.env.test` ist vorhanden und erfolgreich geladen
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`
3. Erlaubte DB-Ziele stammen ausschließlich aus Test-Env: `MYSQL_DATABASE_URL`, `DB_ALLOWED_DATABASES_TEST`, `DB_ALLOWED_HOSTS_TEST`
4. DB-Connections und destruktive Aktionen laufen ausschließlich über zentrale Guard-APIs:
   - `assertTestMode()`
   - `assertSafeWriteTargetForTestMode()`
   - `assertSafeDestructiveOperationTarget()`
   - `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungültig.

### Zentrale Architekturregel für DB-Zugriffe im Testmodus

`server/db.ts` darf nur dann einen Client/Pool zurückgeben, wenn `assertTestMode()` und `assertSafeWriteTargetForTestMode()` erfolgreich waren. Damit laufen alle Write-Pfade in Tests zwingend durch dieselbe Sicherheitsschranke.

### Testebenen (strikt getrennt)

**Unit** – Isolierte Logik (Validation, Mapping, Service-Regeln, UI-Wiring)
- Erlaubt: reine Funktionen/Module, Mocks/Stubs/Fakes
- Nicht erlaubt: echte DB-Verbindung, destruktive DB-Operationen, Infrastruktur-Seiteneffekte
- Setup/Teardown: nur lokale Testdaten pro Testdatei, keine globale DB-Initialisierung
- Datenquelle: zentrale Unit-Fixtures/Builder – keine ad-hoc lokalen Datenmodelle
- Determinismus: keine unkontrollierten Zufallswerte; Zeit nur gemockt wenn Logik zeitabhängig ist

**Integration** – Reale Interaktion von API/Service/Repository/DB
- Erlaubt: echte DB (nur Testziel), echte Route/Service-Pfade
- Nicht erlaubt: DB-Connect am zentralen Guard vorbei, destruktives SQL ohne vorgelagerten Guard-Check
- Setup/Teardown: verbindlich über `tests/setup.env.ts` mit guardiertem DB-Reset; Reset nur über guardierte Helfer
- Datenquelle: zwingend über zentralen Fixture/Factory-Einstiegspunkt `tests/helpers/testDataFactory.ts`
- Determinismus: fixed clock für zeitkritische Fälle, deterministische Fixture-IDs

**E2E** – Vollständige Workflows über Systemgrenzen
- Erlaubt: API + ggf. Client/Browser, reale Infrastruktur nur gegen Testziel
- Nicht erlaubt: implizite Nutzung von Dev-/Prod-Daten, ungeregelte Seeds/Resets
- Setup/Teardown: eigenes E2E-Setup mit isolierten Daten, Suite-weite Resets nur guardiert
- Datenquelle: zentraler E2E-Fixture/Seed-Einstiegspunkt
- Determinismus: fixierte Referenzzeit, reproduzierbare Testdatenkennungen

### Timeout-Regel für lange Testläufe

- Für `npm run test:integration` ist per Tooling standardmäßig ein langer Command-Timeout zu verwenden.
- Für `npm run test:e2e` ist per Tooling ebenfalls standardmäßig ein langer Command-Timeout zu verwenden.
- Kurze Default-Timeouts sind unzulässig, wenn sie erfahrungsgemäß zu abgebrochenen Läufen und kostenpflichtigen Wiederholungen führen.
- Diese Regel gilt nur für die nicht-Browser-Testläufe; `npm run test:e2e:browser` bleibt davon unberührt, solange der Auftrag nichts anderes verlangt.

### Testdaten-Bauanleitung

1. Zentralen Factory/Fixture-Einstiegspunkt aufrufen: `tests/helpers/testDataFactory.ts`
2. Nur notwendige Overrides setzen
3. Keine parallelen Eigenstrukturen aufbauen

Verbotene Muster:
- Direkter Insert/Update-Sprawl in Testdateien ohne zentralen Einstieg
- Demo-/Bestandsdaten als implizite Voraussetzung

### Test-Runs dürfen nicht in eigenständigen Fixes münden

Schlägt ein Test fehl, dokumentiert Codex den Fehler und wartet auf Anweisung. Codex behebt Testfehler nicht eigenmächtig.

---

### Verbindliche Begriffe: „voller Testlauf" und „voller Audit"

Wenn der Nutzer „voller Testlauf" verlangt, meint dies **alle** im Repository etablierten Testbereiche. Codex darf diesen Begriff nicht still auf ein einzelnes Standardkommando reduzieren.

Für dieses Repository umfasst ein **voller Testlauf** mindestens:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Wenn der Nutzer „voller Audit" verlangt, meint dies **alle** im Repository etablierten Prüf- und Qualitätskommandos. Codex darf diesen Begriff nicht still auf `npm run check` oder ein anderes Teilkommando reduzieren.

Für dieses Repository umfasst ein **voller Audit** mindestens:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Wenn der Nutzer „voller Testlauf und voller Audit" verlangt, sind alle oben genannten Kommandos vollständig auszuführen – auch dann, wenn der konkrete Auftrag nur einen kleinen Bugfix, eine kleine Änderung oder einen einzelnen neuen Test betrifft.

Nach Ausführung muss Codex immer explizit berichten:

- welche Kommandos ausgeführt wurden
- welches Ergebnis jedes Kommando hatte
- welche Teile nicht ausgeführt wurden und warum

Aussagen wie „alles grün", „vollständig erfolgreich" oder gleichwertige Zusammenfassungen sind nur zulässig, wenn wirklich alle verpflichtenden Kommandos des angeforderten Umfangs erfolgreich ausgeführt wurden.

Kann ein verpflichtender Teil wegen Setup-, Infrastruktur-, Berechtigungs-, Umgebungs- oder Laufzeitproblemen nicht ausgeführt werden, darf Codex das Ergebnis nicht als „voll" bezeichnen und muss den fehlenden Teil als Blocker dokumentieren.

## 12. Test-Dokumentationspflicht

### Pflicht-Kommentar in jeder Testdatei

Am Anfang jeder Testdatei muss ein erklärender Blockkommentar stehen:

```
/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - <Regel 1>
 * - <Regel 2>
 *
 * Fehlerfälle:
 * - <Fehlerfall 1>
 * - <Fehlerfall 2>
 *
 * Ziel:
 * <Kurzbeschreibung der Absicherung>
 */
```

Der Kommentar beschreibt die fachliche Intention – keine technischen Details wiederholen.

### Pflege von docs/TEST_MATRIX.md (automatisch, ohne Rückfrage)

Bei jeder Erstellung oder Erweiterung von Tests pflegt Codex `docs/TEST_MATRIX.md` eigenständig und verpflichtend:

- Neuer Test: neuen Tabelleneintrag anlegen

```
| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [appointment.versioning.test.ts](../tests/...) | FT14 | Unit | Optimistic Locking & Konfliktlogik | ✓ |
```

- Bestehender Test erweitert: bestehenden Eintrag fachlich aktualisieren
- Spalte `Test-Datei` als klickbarer Markdown-Link auf die konkrete Testdatei
- Beschreibungen in `Zweck` kurz und fachlich verständlich – kein technisches Detailprotokoll

Fehlt die Aktualisierung der Test-Matrix, gilt die Teständerung als unvollständig.

Unzulässig:
- Testdateien ohne Kopfkommentar
- „misc", „new", „tmp" Testdateien

---

## 13. Abschluss

### Abschlussprüfung (Pflicht)

Codex prüft sein Ergebnis explizit gegen:

- Den Aufgabentext (Ziel, Nicht-Ziele, Akzeptanzkriterien)
- Die Architektur- und Engineering-Vorgaben aus den gelesenen Dokumenten (Schichtmodell, Contract-First, React Query-Invalidierung, kalenderseitige Aggregation, fachliche Invarianten)

Codex nennt dabei konkret, welche Stellen geprüft wurden, und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

### Abschlusskriterien

Eine Aufgabe gilt als abgeschlossen, wenn:

- Das fachliche Ziel gemäß Auftrag umgesetzt ist
- Alle Verbote und Grenzen eingehalten wurden
- Die geforderte Dokumentation vollständig vorliegt
- Keine stillen Nebenwirkungen eingeführt wurden

Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie ebenfalls als abgeschlossen, sofern der Abbruchgrund sauber dokumentiert ist.

### Dokumentation (Pflichtfrage)

Codex fragt am Ende ausdrücklich: „Soll ich das Resultat dokumentieren?"

- Bei „ja": neue Markdown-Datei unter `logs/<yyyy-mm-dd>_<kurztitel>.md` mit Zweck, Scope, technischen Entscheidungen, betroffenen Dateien, Hinweisen zum Testen und bekannten Einschränkungen
- Bei „nein": keine Dokumentationsdatei

Der Orchestrator legt pro Aufgabe fest, ob und in welchem Umfang Dokumentation zu erstellen ist. Codex trifft keine eigene Entscheidung über zusätzliche oder reduzierte Dokumentation.
