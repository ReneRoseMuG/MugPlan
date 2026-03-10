# PDF Bulk Import Masterdata Mining

## Zweck

Der bisherige Projekt-Bulk-Import wurde aus der Projektliste entfernt und durch einen neuen Admin-Flow fuer PDF-Stammdaten-Mining im Bereich `Stammdaten` ersetzt.

## Scope

- Neuer Admin-Analysepfad fuer PDF-Stammdaten-Mining ohne Kunden- oder Projektanlage
- Alternativer Artikellistenparser fuer Produkt-/Komponenten-Splitting
- Neuer `Stammdaten`-Tab fuer Analyse, Konsolidierung und Uebernahme in Produkte/Komponenten
- Ausschlussregel fuer ungeeignete Dokumente
- Entfernung des Projekt-Bulk-Imports aus der Projektliste
- Tests und Test-Matrix aktualisiert

## Technische Entscheidungen

- Der bestehende deterministische Artikellistenparser bleibt unveraendert; der neue Mining-Parser laeuft separat.
- Analyseergebnisse werden nicht persistiert, sondern nur pro Request/Session im Response bereitgestellt.
- Konsolidierung erfolgt nur ueber exakt normalisierte Produktnamen.
- Dokumente werden fuer den Mining-Flow ausgeklammert, wenn die Artikelliste nur einen Eintrag enthaelt oder der Begriff `Sauna` in der Artikelliste nicht vorkommt.
- Produkt- und Komponentenuebernahme verwenden die bestehenden Master-Data-Endpunkte und deren Duplicate-/Conflict-Handling.

## Betroffene Dateien

- `shared/routes.ts`
- `server/controllers/adminBulkImportController.ts`
- `server/routes/adminBulkImportRoutes.ts`
- `server/services/documentArticleMasterDataParser.ts`
- `server/services/masterDataPdfMiningService.ts`
- `client/src/components/MasterDataPage.tsx`
- `client/src/components/MasterDataPdfMiningPage.tsx`
- `client/src/components/ProjectsPage.tsx`
- `tests/unit/services/documentArticleMasterDataParser.test.ts`
- `tests/unit/services/masterDataPdfMiningService.test.ts`
- `tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm run typecheck`
- `npm run test:run -- tests/unit/services/documentArticleMasterDataParser.test.ts tests/unit/services/masterDataPdfMiningService.test.ts tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- `npm run check`

Nicht ausgefuehrt:

- `npm run lint`
- `npm run audit`
- `npm run secrets`
- Integration-/E2E-Testlaeufe

## Bekannte Einschraenkungen

- Der neue Mining-Flow persistiert keine Analyse-Rohdaten.
- Die Produktgruppierung nutzt bewusst keine Alias-Regeln.
- Der Parser ist auf die aktuellen WaWi-Dokumentmuster ausgelegt; weitere Varianten aus dem Trainingsordner koennen zusaetzliche Heuristiken erfordern.
