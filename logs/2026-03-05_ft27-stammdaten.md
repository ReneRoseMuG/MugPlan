# FT27 Stammdaten Admin-Bereich (2026-03-05)

## Zweck
Umsetzung eines zentralen Admin-Bereichs **"Stammdaten"** für FT27 mit vollständigem CRUD für:
- Produktkategorien
- Komponenten-Kategorien
- Produkte
- Komponenten

Zusätzlich: Verifikation und Ausführung der vorhandenen FT27-Migration auf `_dev` und `_test`.

## Scope
Im Scope:
- Contract-First Erweiterung der API unter `/api/admin/master-data/...`
- Backend-Implementierung nach Schichtenmodell Route -> Controller -> Service -> Repository
- UI-Integration als neuer Admin-Screen "Stammdaten"
- Navigationseintrag in der Sidebar
- Migration-Lauf auf `mugplan_dev` und `mugplan_test`

Nicht im Scope:
- Erweiterung um weitere Domänenobjekte im Stammdaten-Bereich
- Änderungen an `project_order_items`-Semantik (Repo-Variante bleibt)
- Neue Abhängigkeiten/Tooling-Änderungen

## Technische Entscheidungen
- Beibehaltung der vorhandenen FT27-Repo-Variante mit `project_order_items.source` und DB-CHECK-Constraints.
- Zugriff auf neue Stammdaten-Endpunkte nur für `ADMIN` (serverseitig durch Service-Guard).
- Optimistic Locking über `version` in Update/Delete-Endpunkten (`VERSION_CONFLICT` bei Rennen).
- FK-/Unique-Konflikte als `BUSINESS_CONFLICT` abgebildet.
- Frontend-State über React Query; nach jeder Mutation gezielte Invalidation der relevanten Query-Keys.
- Neue UI als zentraler Admin-Screen "Stammdaten" mit zwei Registerkarten:
  - Kategorien
  - Produkte & Komponenten

## Betroffene Dateien
- `shared/routes.ts`
- `server/routes.ts`
- `server/routes/masterDataRoutes.ts`
- `server/controllers/masterDataController.ts`
- `server/services/masterDataService.ts`
- `server/repositories/masterDataRepository.ts`
- `client/src/components/MasterDataPage.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/Sidebar.tsx`

## DB / Migration
Durchgeführt:
- `node --env-file=../../shared/.env.dev ./node_modules/drizzle-kit/bin.cjs migrate`
- `node --env-file=../../shared/.env.test ./node_modules/drizzle-kit/bin.cjs migrate`

Ergebnis:
- Beide Datenbanken enthalten FT27-Tabellen:
  - `product_categories`
  - `component_categories`
  - `products`
  - `components`
  - `product_component`
  - `project_order_items`
- Tabellenanzahl je DB nach Lauf: `37`

## Testhinweise
Automatischer Check:
- `npm run check` erfolgreich (Encoding-Check + Destructive-Inventory + TypeScript).

Manuelle Smoke-Tests empfohlen:
1. Navigation als Admin: Sidebar -> Administration -> Stammdaten.
2. CRUD-Flow pro Entität (Create, Edit, Aktiv/Inaktiv, Delete).
3. Konfliktfälle:
   - doppelter Name (Unique) -> `BUSINESS_CONFLICT`
   - Löschen referenzierter Kategorie/Entität -> `BUSINESS_CONFLICT`
   - paralleles Speichern mit alter Version -> `VERSION_CONFLICT`
4. Sichtbarkeitstest des Aktivfilters (`all`/`active`/`inactive`).

## Bekannte Einschränkungen
- Der Bereich ist bewusst auf vier Entitäten begrenzt; weitere Domänen werden später ergänzt.
- Für `product_component` wurde in dieser Ausbaustufe noch keine dedizierte UI-Verwaltung ergänzt.
- Es wurden keine zusätzlichen Testdateien angelegt; bisheriger Nachweis erfolgt über `npm run check` und DB-Verifikation.
