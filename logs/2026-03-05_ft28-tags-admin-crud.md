# FT28 Tags Admin CRUD (2026-03-05)

## Zweck
- Umsetzung der FT28-Teilanforderung fuer eine zentrale Tag-Verwaltung im Admin-Bereich.
- Fokus auf CRUD fuer Tags innerhalb der bestehenden Stammdatenverwaltung.

## Scope
- Enthalten:
  - Admin-API fuer Tag-CRUD unter `/api/admin/master-data/tags`
  - UI-Integration in bestehende `MasterDataPage`
  - Serverseitige Loeschregel: Tag-Loeschung nur ohne Relationen
  - Tests (Unit + Integration) fuer neue Tag-Logik
  - Pflege von `docs/TEST_MATRIX.md`
- Nicht enthalten:
  - WP-C Tag-Zuweisungs-UI fuer Projekt/Kunde/Mitarbeiter/Termin
  - Aenderung bestehender DB-Migrationen/FK-Strategie
  - Nutzung/Exponierung von `is_default` in der UI

## Technische Entscheidungen
- Keine neue Migration angelegt, da Tag-Tabellen bereits vorhanden sind (`migrations/0001_safe_silk_fever.sql`).
- Umsetzung in bestehender Schichtstruktur Route -> Controller -> Service -> Repository.
- Contract-First erweitert in `shared/routes.ts` mit `api.masterData.tags`.
- `is_default` wird nicht im API-Input akzeptiert; Create setzt serverseitig implizit `isDefault=false`.
- Delete-Regel wird fachlich im Service abgesichert:
  - Vor `DELETE` werden Relationen in `project_tags`, `customer_tags`, `employee_tags`, `appointment_tags` gezaehlt.
  - Bei vorhandenen Relationen wird mit `409 BUSINESS_CONFLICT` geblockt.
- UI-Erweiterung minimal-invasiv als weitere Sektion in der bestehenden `MasterDataPage`.

## Betroffene Dateien
- `shared/routes.ts`
- `server/routes/masterDataRoutes.ts`
- `server/controllers/masterDataController.ts`
- `server/services/masterDataService.ts`
- `server/repositories/masterDataRepository.ts`
- `client/src/components/MasterDataPage.tsx`
- `tests/helpers/testDataFactory.ts`
- `tests/unit/services/masterDataService.ft28.tags.test.ts`
- `tests/integration/server/masterData.tags.ft28.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen
- Durchgefuehrte Checks:
  - `npm run check`
  - `npm run test:run -- tests/unit/services/masterDataService.ft28.tags.test.ts`
  - `npm run test:run -- tests/integration/server/masterData.tags.ft28.integration.test.ts`
- Manuelle Kernpruefpunkte:
  - Admin kann Tag erstellen/bearbeiten/loeschen (ohne Relationen).
  - Nicht-Admin bekommt `403 FORBIDDEN` auf Tag-Endpunkte.
  - Loeschung eines referenzierten Tags liefert `409 BUSINESS_CONFLICT`.
  - `is_default` ist in der UI nicht sichtbar und nicht aenderbar.

## Bekannte Einschraenkungen
- Loeschschutz basiert auf Service-Validierung, nicht auf FK-Restrict-Constraints.
- Keine Anzeige von Relation-Breakdown in der UI (nur Blockade bei Delete).
- Keine Tag-Zuweisungsfunktion in Fachformularen (bewusst out of scope).
