# Test Strategy (Verbindliche Bauanleitung)

## Zweck und Geltungsbereich
Dieses Dokument definiert verbindlich, wie Tests im Projekt konstruiert, mit Daten versorgt und abgesichert werden.
Es gilt fuer alle neuen und geaenderten Tests in den Ebenen `Unit`, `Integration` und `E2E`.

## Must-Pass Safety Gate (vor jeder Testausfuehrung)
Die folgenden Regeln muessen erfolgreich geprueft sein, **bevor irgendein Test ausgefuehrt wird**:

1. `.env.test` ist vorhanden und erfolgreich geladen.
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`.
3. Erlaubte DB-Ziele stammen ausschliesslich aus Test-Env:
   - `MYSQL_DATABASE_URL`
   - `DB_ALLOWED_DATABASES_TEST`
   - `DB_ALLOWED_HOSTS_TEST`
4. Im Testmodus duerfen DB-Connections und destruktive Aktionen nur ueber zentrale Guard-APIs laufen:
   - `assertTestMode()`
   - `assertSafeWriteTargetForTestMode()`
   - `assertSafeDestructiveOperationTarget()`
   - `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungueltig.

## Zentrale Architekturregel fuer DB-Zugriffe
Im Testmodus darf `server/db.ts` (zentraler DB-Factory-Punkt) nur dann einen Client/Pool zurueckgeben, wenn:

1. `assertTestMode()` erfolgreich war und
2. `assertSafeWriteTargetForTestMode()` erfolgreich war.

Damit laufen alle Write-Pfade in Tests zwingend durch dieselbe Sicherheits-Schranke.

## Testebenen (strikt getrennt)

## Unit
Ziel: Isolierte Logik pruefen (Validation, Mapping, Service-Regeln, UI-Wiring).

Erlaubte Abhaengigkeiten:
- reine Funktionen/Module
- Mocks/Stubs/Fakes
- keine echte DB

Nicht erlaubt:
- echte DB-Verbindung
- destruktive DB-Operationen
- Integration von Infrastruktur-Seiteneffekten

Setup/Teardown:
- pro Testdatei nur lokale Testdaten
- keine globale DB-Initialisierung

Datenquelle:
- zentrale Unit-Fixtures/Builder verwenden
- keine ad-hoc konkurrierenden lokalen Datenmodelle

Determinismus:
- keine unkontrollierten Zufallswerte
- Zeit nur gemockt/fixiert, wenn Logik zeitabhaengig ist

## Integration
Ziel: Reale Interaktion von API/Service/Repository/DB pruefen.

Erlaubte Abhaengigkeiten:
- echte DB (nur Testziel)
- echte Route/Service-Pfade

Nicht erlaubt:
- DB-Connect am zentralen Guard vorbei
- destruktive SQL ohne vorgelagerten Guard-Check

Setup/Teardown:
- verbindlich ueber zentrales Integration-Setup (`tests/setup.integration.ts`)
- Reset nur ueber guardierte Helfer

Datenquelle:
- zwingend ueber zentralen Fixture/Factory-Einstiegspunkt
- keine neue ad-hoc Datenquelle ohne Erweiterung des zentralen Einstiegs

Determinismus:
- fixed clock fuer zeitkritische Integrationsfaelle (wo stabilitaetsrelevant)
- deterministische Fixture-IDs/Namensraeume fuer reproduzierbare Fehlerbilder
- kein breitflaechiges Refactoring alter Tests ohne klaren Stabilitaetsgewinn

## E2E
Ziel: Vollstaendige Workflows ueber Systemgrenzen pruefen.

Erlaubte Abhaengigkeiten:
- API + ggf. Client/Browser
- reale Infrastruktur nur gegen Testziel

Nicht erlaubt:
- implizite Nutzung von Dev-/Prod-Daten
- ungeregelte Seeds/Resets ausserhalb zentraler guardierter Entrypoints

Setup/Teardown:
- eigenes E2E-Setup mit isolierten Daten
- Suite-weite Reset-/Seed-Schritte nur guardiert

Datenquelle:
- zentraler E2E-Fixture/Seed-Einstiegspunkt

Determinismus:
- stabilisierte Zeitfenster (fixierte Referenzzeit)
- reproduzierbare Testdatenkennungen

## Testdaten-Bauanleitung
Jeder neue Test nutzt denselben Einstieg:

1. zentrale Factory/Fixure aufrufen
2. nur notwendige Overrides setzen
3. keine parallelen Eigenstrukturen aufbauen

Verbindlicher Einstiegspunkt:
- `tests/helpers/testDataFactory.ts`

Seed-Nutzung:
- Minimal-Seed: Referenzdaten
- Integration-Seed: FK-Ketten fuer Integrationsfaelle
- E2E-Seed: End-to-End Workflows

Verbotene Muster:
- direkter Insert/Update-Sprawl in Testdateien ohne zentralen Einstieg
- Demo-/Bestandsdaten als implizite Voraussetzung

## Akteure und Verantwortlichkeiten

## Entwickler
- waehlen die korrekte Testebene (Unit/Integration/E2E)
- nutzen zwingend den zentralen Fixture/Factory-Einstiegspunkt
- halten Setup/Teardown-Regeln je Ebene ein
- stellen Safety-Gate-Konformitaet sicher

## Reviewer
- pruefen Ebenentrennung und Datenquelle
- blocken unguardete DB-Connections oder destruktive Direktpfade
- pruefen Determinismus-Regeln in stabilitaetskritischen Faellen
- pruefen DoD-Kriterien vollstaendig

## CI
- erzwingt Safety-Gate vor Testausfuehrung
- blockt unzulaessige Testziele (dev/prod) fuer Testmodus
- blockt unguardete destruktive Pfade
- fuehrt definierte Teststufen reproduzierbar aus

## Definition of Done fuer neue Tests (Muss-Kriterien)
Ein neuer oder geaenderter Test ist nur fertig, wenn alle Punkte erfuellt sind:

1. Testebene ist korrekt und dokumentiert.
2. Daten kommen aus dem zentralen Fixture/Factory-Einstiegspunkt.
3. Setup/Teardown folgt dem Ebenenvertrag.
4. Safety-First-Regeln sind eingehalten.
5. Determinismus ist dort umgesetzt, wo Stabilitaet davon abhaengt.
6. Testdatei hat fachlichen Scope-Kommentar.
7. `docs/TEST_MATRIX.md` ist aktualisiert.

## Compliance-Checkliste (PR-Review)
- [ ] Ebene korrekt (`Unit`/`Integration`/`E2E`)
- [ ] Keine verbotenen Abhaengigkeiten fuer die Ebene
- [ ] Zentraler Fixture/Factory-Einstieg genutzt
- [ ] Safety-Gate beachtet (Env/DB/Guard)
- [ ] Keine unguardete destruktive Aktion
- [ ] Determinismus in stabilitaetskritischen Teilen umgesetzt
- [ ] Scope-Kommentar vorhanden/aktualisiert
- [ ] `docs/TEST_MATRIX.md` gepflegt

## Verknuepfte Dokumente
- `docs/TEST_DB_SAFETY_INVENTORY.md` (Inventar destruktiver Pfade und Guard-Nachweise)
- `docs/TEST_MATRIX.md` (fachliche Testabdeckung)
- `.ai/rules.md` (Pflichtlektueregeln fuer Agents)
