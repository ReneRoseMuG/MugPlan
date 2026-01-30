# Refactor-Plan: Architektur-Alignment nach MySQL-Migration

## 1. Ausgangslage (Ist-Analyse)

### Einstiegspunkte & Setup
- **Server-Start:** `server/index.ts` initialisiert Express, Logging, Error-Handling und bindet die Routen. 
- **Routing:** Sämtliche API-Endpunkte befinden sich zentral in `server/routes.ts`.
- **Persistenz:** DB-Setup in `server/db.ts`, sämtliche Datenbankzugriffe in `server/storage.ts`.

### Aktuelle Layer-Verteilung
- **Bootstrap/Server:** `server/index.ts` enthält neben Setup auch Error-Middleware.
- **Routes:** `server/routes.ts` enthält neben Routing auch Request-Validierung, Business-Logik, Orchestrierung und direkte Persistenzaufrufe.
- **Persistenz:** `server/storage.ts` bündelt SQL/Drizzle-Operationen aller Domains (God-File).

### Verstöße gegen Architekturvorgaben (aus `docs/architektur.md`)
- **Routing + Controller vermischt:** `server/routes.ts` enthält Controller- und Service-Logik (Use-Cases, Validierungslogik, Orchestrierung).
- **Service-Layer fehlt:** Use-Case-Logik liegt in Routen statt Services.
- **Repository-Layer fehlt:** Persistenzzugriffe sind nicht je Domain gekapselt.
- **God-File:** `server/storage.ts` enthält alle Persistenzzugriffe.

### Identifizierte God-Files / Vermischte Zuständigkeiten
- **`server/storage.ts`**: monolithische Persistenzlogik für Events, Tours, Teams, Customers, Notes, Templates, Projects, Project Status, HelpTexts, Employees.
- **`server/routes.ts`**: sämtliche Endpunkte in einer Datei inkl. Validierung/Use-Case/Orchestrierung.

## 2. Refactor-Roadmap

### Phase 1: Architektur-Entkopplung
1. **Neue Struktur aufbauen:** `server/routes`, `server/controllers`, `server/services`, `server/repositories`, `server/middleware`.
2. **Routen aus `server/routes.ts` extrahieren** (nur Routing + Delegation an Controller).
3. **Controller-Layer einführen** (Request-Validierung, Parameter-Parsing, Response).
4. **Service-Layer einführen** (Use-Case-Logik, Orchestrierung, Transaktionsgrenzen).
5. **Repository-Layer einführen** (SQL/Drizzle-Zugriffe je Domain).

### Phase 2: Persistenz-Konsolidierung (MySQL)
1. **Join-Tabellen konsequent pflegen** (explizites Anlegen/Entfernen von Relationseinträgen).
2. **DB-Setup prüfen/zentralisieren** (`server/db.ts` als einziges DB-Setup-Modul verwenden).
3. **Ungültige MySQL-Optionen entfernen** (z. B. `ssl-mode`, falls vorhanden).

### Phase 3: Strukturreduktion & Stabilität
1. **God-Files aufteilen** (vor allem `server/storage.ts`).
2. **Error-Handling zentralisieren** (eigene Middleware).
3. **Regression vermeiden** (Endpoint-Logik unverändert, UI nicht anfassen).

## 3. Risiken & Abhängigkeiten
- **Hohe Änderungsbreite im Backend:** Viele Endpunkte betroffen.
- **Routing-Referenzen:** API-Definitionen in `shared/routes.ts` dürfen nicht verändert werden.
- **UI-Integrität:** UI/Styles müssen unverändert bleiben.
- **Datenbank-Relationen:** Explizites Aufräumen bei Löschungen erforderlich.

## 4. Reihenfolge der Umsetzung
1. Strukturordner & Basis-Middleware.
2. Repositories (DB-Zugriffe pro Domain).
3. Services (Use-Cases pro Domain).
4. Controller (HTTP-Adapter).
5. Routes (nur Routing + Controller-Delegation).
6. Restliche Konsolidierungen (DB-Setup, Relation-Handling).
