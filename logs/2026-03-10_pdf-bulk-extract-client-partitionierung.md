# Ergebnisdokumentation: PDF Bulk Extract Client-Partitionierung

## Zweck
Diese Dokumentation beschreibt die Erweiterung des Stammdaten-PDF-Minings, damit beliebig viele PDF-Dateien verarbeitet werden koennen, ohne das bestehende serverseitige Hard-Limit pro Request aufzuweichen.

## Scope
- Neuer read-only Limits-Endpunkt fuer das Stammdaten-PDF-Mining
- Clientseitige Partitionierung grosser Dateilisten in serielle Analyze-Batches
- Batch-uebergreifende Aggregation von Mining-Ergebnissen
- Fortschrittsanzeige und Teilfehlerbehandlung im Mining-UI
- Unit-Tests fuer Partitionierung, Aggregation und UI-Verdrahtung

## Technische Entscheidungen
1. Das serverseitige Hard-Limit bleibt unveraendert.
   - `BULK_IMPORT_LIMITS.maxFiles = 100` bleibt Schutzgrenze pro Request.
   - Keine Erhoehung und kein Entfernen des Limits.
2. Die Quelle der Wahrheit fuer Limits bleibt der Server.
   - Neuer Endpunkt: `GET /api/admin/master-data/pdf-mining/limits`
   - Das Frontend nutzt keine Magic Number fuer Batchgroessen.
3. Die Gesamtverarbeitung erfolgt im Frontend seriell.
   - Die ausgewaehlte Gesamtliste wird in Batches nach `maxFiles` und `maxTotalBytes` partitioniert.
   - Analyse-Requests werden strikt nacheinander gesendet.
4. Teilresultate bleiben bei Batch-Fehlern erhalten.
   - Erfolgreiche Batch-Ergebnisse werden direkt in ein Gesamtergebnis gemergt.
   - Fehlerhafte Batches werden als Fehler pro Datei ausgewiesen.
5. Zu grosse Einzeldateien werden lokal abgefangen.
   - Dateien ueber `maxFileSizeBytes` werden nicht an den Server gesendet.
   - Sie erscheinen direkt im Fehlerbereich des Mining-Ergebnisses.

## Betroffene Dateien
- `shared/routes.ts`
- `server/controllers/adminBulkImportController.ts`
- `server/routes/adminBulkImportRoutes.ts`
- `client/src/lib/masterDataPdfMining.ts`
- `client/src/components/MasterDataPdfMiningPage.tsx`
- `tests/unit/lib/masterDataPdfMining.test.ts`
- `tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- `docs/TEST_MATRIX.md`

## Testausfuehrung
Ausgefuehrt:
- `npm run check`
- `npm run test:unit -- tests/unit/lib/masterDataPdfMining.test.ts tests/unit/ui/bulkImportDialogs.wiring.test.ts tests/unit/services/masterDataPdfMiningService.test.ts`

Ergebnis:
- `npm run check` erfolgreich
- gezielter Unit-Lauf erfolgreich

## Bekannte Einschraenkungen
- Die Gesamtverarbeitung bleibt synchron aus Sicht des Browsers; es gibt kein serverseitiges Job-Tracking.
- Bei sehr grossen Gesamtmengen haengt die Laufzeit weiterhin von der seriellen Batch-Anzahl ab.
- Fuer fehlgeschlagene Batches gibt es bewusst noch keine automatische Retry-Logik.
