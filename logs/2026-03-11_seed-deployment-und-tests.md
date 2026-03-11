# Seed Deployment und Tests

## Zweck

Den Adminbereich `Stammdaten > Seed` zu einer dateibasierten Verwaltungsoberflaeche fuer Startdaten ausbauen und die Seed-Flows mit Unit- und Integration-Tests gegen externe Testdatenordner absichern.

## Scope

- Seed-Panels fuer Mitarbeiter, Hilfetexte, Produktverwaltung, Projekt Status und Notiz Vorlagen erweitert
- Dateiablage unter `uploads/seed`
- Status-, Import- und Export-Endpunkte fuer alle Seed-Domaenen ergaenzt
- Dateibasierte Seed-Services fuer CSV- und YAML-Formate eingefuehrt
- FT27-Produktverwaltungs-Seed auf dateibasierten Import/Export erweitert
- Neue Unit- und Integration-Tests fuer Seed-Dateiablage und Seed-Services hinzugefuegt

## Technische Entscheidungen

- Keine Schemaaenderung; vorhandene Tabellen und Felder werden per Upsert genutzt
- Seed-Dateien werden serverseitig im konfigurierten Uploads-Ordner verwaltet, nicht als Browser-Download
- Fehlende Datensaetze werden angelegt, vorhandene ueber Namen/Titel/Schluessel aktualisiert, nicht gelistete Datensaetze nicht geloescht
- Hilfetexte verwenden das bestehende YAML-Import/Export-Format
- Tests fuer Dateisystemzugriffe verwenden externe Temp-Verzeichnisse ausserhalb des Repositorys

## Betroffene Dateien

- `client/src/components/MasterDataSeedPage.tsx`
- `client/src/components/ui/seed-panel.tsx`
- `shared/routes.ts`
- `server/routes/masterDataRoutes.ts`
- `server/controllers/masterDataController.ts`
- `server/services/seedFileStoreService.ts`
- `server/services/seedCsvService.ts`
- `server/services/seedEmployeesService.ts`
- `server/services/seedHelpTextsService.ts`
- `server/services/seedProductManagementService.ts`
- `server/services/seedProjectStatusService.ts`
- `server/services/seedNoteTemplatesService.ts`
- `tests/unit/services/seedFileStoreService.test.ts`
- `tests/unit/services/masterDataSeedServices.test.ts`
- `tests/integration/server/masterData.seed-files.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm run check`
- `npm test -- tests/unit/ui/masterDataSeed.wiring.test.tsx tests/integration/server/masterData.ft27.integration.test.ts tests/unit/ui/bulkImportDialogs.wiring.test.ts tests/unit/services/masterDataService.ft27.test.ts`
- `npm test -- tests/unit/services/seedFileStoreService.test.ts tests/unit/services/masterDataSeedServices.test.ts tests/integration/server/masterData.seed-files.integration.test.ts`

## Hinweise

- Der Arbeitsbaum enthielt beim Commit zusaetzlich bereits vorhandene Aenderungen an `client/src/components/NoteTemplatesPage.tsx` und `client/src/components/NotesSection.tsx`, die auf ausdruecklichen Wunsch mitgestaged und mitcommitted wurden.
