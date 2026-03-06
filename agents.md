# AGENTS.md – MuGPlan

Dieses Dokument definiert verbindliche Leitplanken für Codex als ausführenden Coding Agent im MuGPlan-Projekt.

Codex ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Denken, Einordnen und Entscheiden liegen außerhalb seines Verantwortungsbereichs. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht Codex die Umsetzung kontrolliert ab und dokumentiert den Blocker – statt still Entscheidungen zu treffen.

---

## 1. Pflichtlektüre vor jedem Auftrag

Codex liest die folgenden Dokumente **vollständig**, bevor er plant oder irgendetwas ändert, und bestätigt danach explizit: „gelesen und verstanden".

- `docs/architecture.md` – Ist-Architektur, Schichten, Datenflüsse, Erweiterungspunkte
- `docs/implementation.md` – Engineering-Handbook, Contracts, Schichtregeln, React Query Patterns

Ohne diese Pflichtlektüre darf Codex keine Entscheidungen treffen, keinen Code ändern und keine Tests anlegen oder erweitern.

---

## 2. Analyse vor der Umsetzung (Pflicht)

Bevor Änderungen vorgenommen werden, verschafft sich Codex einen Überblick über den relevanten Codebereich:

- Bestehende Strukturen, Dateien und Muster auffinden
- Passende Einstiegspunkte identifizieren
- Parallele oder redundante Implementierungen vermeiden
- Prüfen ob vorhandene Strukturen nutzbar sind, bevor neue angelegt werden

Neue Dateien, Controller, Services, Endpoints oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind. Dieser Nachweis muss dokumentiert werden.

---

## 3. Planungspflicht

Nachdem Codex die Pflichtdokumente und den Aufgabentext gelesen hat, beginnt er mit der Planung:

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

- Ein Termin ist fachlich nur gültig, wenn er einem Projekt zugeordnet ist
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

### Verbindliche Begriffe: â€žvoller Testlauf" und â€žvoller Audit"

Wenn der Nutzer â€žvoller Testlauf" verlangt, meint dies **alle** im Repository etablierten Testbereiche. Codex darf diesen Begriff nicht still auf ein einzelnes Standardkommando reduzieren.

FÃ¼r dieses Repository umfasst ein **voller Testlauf** mindestens:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Wenn der Nutzer â€žvoller Audit" verlangt, meint dies **alle** im Repository etablierten PrÃ¼f- und QualitÃ¤tskommandos. Codex darf diesen Begriff nicht still auf `npm run check` oder ein anderes Teilkommando reduzieren.

FÃ¼r dieses Repository umfasst ein **voller Audit** mindestens:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Wenn der Nutzer â€žvoller Testlauf und voller Audit" verlangt, sind alle oben genannten Kommandos vollstÃ¤ndig auszufÃ¼hren â€“ auch dann, wenn der konkrete Auftrag nur einen kleinen Bugfix, eine kleine Ã„nderung oder einen einzelnen neuen Test betrifft.

Nach AusfÃ¼hrung muss Codex immer explizit berichten:

- welche Kommandos ausgefÃ¼hrt wurden
- welches Ergebnis jedes Kommando hatte
- welche Teile nicht ausgefÃ¼hrt wurden und warum

Aussagen wie â€žalles grÃ¼n", â€žvollstÃ¤ndig erfolgreich" oder gleichwertige Zusammenfassungen sind nur zulÃ¤ssig, wenn wirklich alle verpflichtenden Kommandos des angeforderten Umfangs erfolgreich ausgefÃ¼hrt wurden.

Kann ein verpflichtender Teil wegen Setup-, Infrastruktur-, Berechtigungs-, Umgebungs- oder Laufzeitproblemen nicht ausgefÃ¼hrt werden, darf Codex das Ergebnis nicht als â€žvoll" bezeichnen und muss den fehlenden Teil als Blocker dokumentieren.

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
