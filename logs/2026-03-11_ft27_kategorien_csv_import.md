# FT27 Kategorien CSV Import

## Zweck

CSV-Import pro Kategorie im Admin-Stammdatenbereich Produkte ergaenzen, damit Produktkategorien Produkte und Komponentenkategorien Komponenten direkt aus einer beliebigen CSV-Datei importieren koennen.

## Scope

- Neue FT27-Importendpunkte fuer Produkt- und Komponentenkategorien
- Multipart-Upload mit CSV-Parsing, Idempotenz und Reaktivierung bestehender Datensaetze
- UI-Erweiterung um `Daten importieren` je Kategorienzeile
- Delete-Label in beiden Kategorienlisten auf `-` verkuerzt
- Unit- und Integrationstests fuer Service, API und UI-Verdrahtung erweitert

## Technische Entscheidungen

- Contract-First ueber `shared/routes.ts`, danach Route -> Controller -> Service -> Repository umgesetzt
- Keine Migration, da bestehendes FT27-Schema `name`, `description`, `categoryId`, `isActive`, `version` bereits ausreicht
- Kategorienzuordnung kommt ausschliesslich vom geklickten Kategorieeintrag, nicht aus der CSV
- Duplikate werden per normalisiertem Namen (`trim` + case-insensitive) als Update behandelt; inaktive Datensaetze werden reaktiviert
- Fehlende, leere oder nicht parsebare `IsActive`-Werte werden auf `true` gedreht

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/masterDataRoutes.ts`
- `server/controllers/masterDataController.ts`
- `server/services/masterDataService.ts`
- `server/repositories/masterDataRepository.ts`
- `client/src/components/ProductManagementPage.tsx`
- `tests/unit/services/masterDataService.ft27.test.ts`
- `tests/unit/ui/productManagementPage.categoryImport.wiring.test.tsx`
- `tests/integration/server/masterData.ft27.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

- `npm run test:unit -- tests/unit/services/masterDataService.ft27.test.ts tests/unit/ui/productManagementPage.categoryImport.wiring.test.tsx`
- `npm run test:integration -- tests/integration/server/masterData.ft27.integration.test.ts`

## Bekannte Einschraenkungen

- Der Import liefert aktuell nur ein kompaktes Summary per Toast; kein dauerhaftes Import-Reporting in der FT27-UI
- `Name` bleibt das einzige Pflichtfeld; weitere CSV-Spalten werden bewusst nicht ausgewertet
