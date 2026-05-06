# W-18 - Bulk-Import und PDF-Mining entfernen

## Metadaten

- Status: Abgeschlossen
- Priorität: Mittel
- Feature: Bulk-Import, PDF-Mining, FT-21 Dokumentenextraktion
- Entdeckt: 05.05.26
- Art: Technische Schuld

## Befund

Im System existiert ein vollständig implementierter Bulk-Import-Workflow für Kunden und Projekte sowie eine PDF-Mining-Funktion für Stammdaten. Nach aktuellem Auftragskontext ist dieser Workflow nicht in Navigation oder Routing der Oberfläche eingebunden:

- keine Sidebar-Einträge
- kein `ViewType`-Eintrag in `Home.tsx`
- vier Client-Komponenten sind verwaist und werden nicht gerendert
- Server-Routen sind registriert, aber fachlich nicht über die App erreichbar

Der Auftrag zielt darauf, den gesamten Bulk-Import/PDF-Mining-Stack aus Server, Client, Shared-Contracts und Tests zu entfernen. Die gemeinsam genutzte Extraktions-Infrastruktur darf dabei nicht beschädigt werden, weil sie weiterhin von FT-21 Dokumentenextraktion genutzt wird.

## Optionen

- A) Bulk-Import und PDF-Mining vollständig entfernen und FT-21 Single-Doc-Extract ausdrücklich unangetastet lassen.
- B) Den Code vorerst beibehalten und nur als verwaisten technischen Bestand dokumentieren.
- C) Nur UI-nahe oder serverseitige Teile entfernen und einzelne Shared-Schemas oder Tests stehen lassen.

## Betroffene Bereiche bei Umsetzung

Serverseitig wären folgende Dateien vollständig zu entfernen:

- `server/services/bulkImportService.ts`
- `server/services/masterDataPdfMiningService.ts`
- `server/controllers/adminBulkImportController.ts`
- `server/routes/adminBulkImportRoutes.ts`

Zusätzlich muss die zentrale Route-Registrierung, vermutlich `server/routes.ts` oder `server/index.ts`, um Import und Verwendung von `adminBulkImportRoutes` bereinigt werden.

In `shared/routes.ts` sind die Bulk-Import- und Master-Data-Mining-Schemas sowie die zugehörigen `api.admin`-Route-Definitionen zu entfernen. Falls der `api.admin`-Block danach leer ist, kann der Block selbst entfernt werden; falls andere Admin-Einträge bleiben, dürfen nur die Bulk-Import- und PDF-Mining-Definitionen verschwinden.

Clientseitig wären folgende verwaiste Komponenten zu entfernen:

- `client/src/components/CustomerBulkImportDialog.tsx`
- `client/src/components/ProjectBulkImportDialog.tsx`
- `client/src/components/ProjectDuplicateResolutionDialog.tsx`
- `client/src/components/MasterDataPdfMiningPage.tsx`

Außerdem wären folgende Tests zu entfernen:

- `tests/unit/services/bulkImportService.limits.test.ts`
- `tests/unit/services/masterDataPdfMiningService.test.ts`

In `server/services/projectsService.ts` muss geprüft werden, ob `isOrderNumberAlreadyImported` ausschließlich vom Bulk-Import genutzt wird. Nur wenn das eindeutig zutrifft, dürfen die Funktion und gegebenenfalls die zugehörige Repository-Methode entfernt werden.

## Schutzgrenze FT-21

Die Single-Doc-Extract-Infrastruktur bleibt fachlich und technisch erhalten. Folgende Dateien dürfen im Rahmen dieser Entscheidung nicht verändert oder gelöscht werden:

- `server/services/documentTextExtractor.ts`
- `server/services/documentHeaderDeterministicParser.ts`
- `server/services/documentArticleDeterministicParser.ts`
- `server/services/documentArticleMasterDataParser.ts`
- `server/services/extractionValidator.ts`
- `server/services/extractionFallback.ts`
- `server/services/documentProcessingService.ts`
- `server/controllers/documentExtractionController.ts`
- `server/routes/documentExtractionRoutes.ts`

Ebenfalls nicht Teil der Umsetzung sind Änderungen an `Home.tsx`, `Sidebar.tsx`, `MasterDataPage.tsx` oder `ImportExportPage.tsx`, sofern dort weiterhin keine Referenzen auf die zu entfernenden Komponenten bestehen.

## Rollen- und Sicherheitsbezug

Der spätere Eingriff betrifft Admin-nahe Routen unter anderem für Kunden-Bulk-Import, Projekt-Bulk-Import und Stammdaten-PDF-Mining. Die bisherige Sichtbarkeit in der Oberfläche ist nach Auftragskontext nicht gegeben; die registrierten Server-Routen müssen bei Umsetzung dennoch ausdrücklich geprüft werden.

Zulässige Sichtbarkeit und Ausführung für den bestehenden Bulk-Workflow sind vor Entfernung zu verifizieren. Falls die Routen mit einem Admin-Guard wie `requireAdmin` registriert sind, darf nur der Bulk-spezifische Registrierungsblock entfernt werden. Bestehende Admin-Guards, die auch andere Funktionen schützen, dürfen nicht geschwächt oder entfernt werden.

Die erwartete spätere Wirkung ist, dass direkte Aufrufe von `/api/admin/customers/bulk-import/*`, `/api/admin/projects/bulk-import/*` und `/api/admin/master-data/pdf-mining/*` nicht mehr erreichbar sind und kontrolliert als nicht vorhandene Endpunkte behandelt werden. FT-21-Routen und deren serverseitige Berechtigungslogik bleiben unverändert.

## Auswirkungen eines Eingriffs

Variante A reduziert technischen Ballast und entfernt einen nicht eingebundenen Workflow vollständig aus Contracts, Server, Client und Tests. Nach der Entfernung gibt es keine Bulk-Import-Session mehr, keine Bulk-spezifischen Shared-Schemas und keine registrierten Admin-Bulk-Endpunkte.

Nicht betroffen sein sollen die dokumentenbezogenen Parser, Extractor, Validatoren, Fallbacks, Controller und Routen von FT-21. Ebenso sind keine Datenbankmigrationen vorgesehen, weil der Bulk-Import laut Auftrag keinen persistenten DB-State hinterlässt.

## Schadenspotential

Mittel. Der direkte Fachumfang ist begrenzt, weil der Workflow nicht in der Oberfläche eingebunden ist und keinen persistenten Zustand hinterlässt. Fehlerhaft umgesetzt könnte die Entfernung aber FT-21 beschädigen, Shared-Route-Exports brechen, noch genutzte Projektservice-Funktionen entfernen oder Admin-Routen beziehungsweise Guards falsch bereinigen.

Das Risiko wird begrenzt, indem die spätere Umsetzung strikt auf die genannten Bulk-Import- und PDF-Mining-Dateien beschränkt bleibt, die FT-21-Schutzgrenze eingehalten wird und TypeScript sowie die relevanten Extraktions-Tests nach der Entfernung laufen.

## Vorgeschlagene Maßnahme

Variante A als bevorzugten Cleanup-Pfad vorbereiten. Vor Umsetzung muss die Nutzung von `isOrderNumberAlreadyImported` geprüft werden. Danach sollen die genannten Server-, Client-, Shared- und Test-Artefakte entfernt und die zentrale Route-Registrierung bereinigt werden.

Als Verifikation gelten mindestens:

- TypeScript-Prüfung mit `npx tsc --noEmit`
- verbleibende Unit- und Integration-Tests
- gezielte Prüfung der FT-21-Extraktions-Tests, insbesondere Parser-, Extractor- und Document-Processing-Tests

## Umsetzung

Abgeschlossen am 05.05.26. Der Auftragslog `logs/2026-05-05_bulk-import-pdf-mining-entfernen.md` dokumentiert die Entfernung der Bulk-Import- und Admin-PDF-Mining-Routen, Services, Contracts, Client-Artefakte und Tests. `ProjectDuplicateResolutionDialog` sowie `isOrderNumberAlreadyImported` blieben bewusst erhalten, weil sie weiterhin von FT-21 beziehungsweise Projekt-/Terminformularen genutzt werden.

Nach der Entfernung sind die Bulk-/PDF-Mining-Endpunkte serverseitig nicht mehr registriert. FT-21-Dokumentenextraktion und die bestehende Projekt-Duplikatprüfung blieben laut Log unverändert.

## Quelle

- Auftragsdatei vom 05.05.26: `C:\Users\r.rose\Downloads\codex-auftrag-bulk-import-remove.md`
- Gezielte Wiki-Kontextprüfung vom 05.05.26: `docs/wiki/decisions/README.md`, `docs/wiki/decisions/w-17-system-dump-benutzer-und-rollen.md`, `docs/wiki/features/ft-21-dokumentenextraktion/ft-21-dokumentenextraktion.md`
- Umsetzungslog vom 05.05.26: `logs/2026-05-05_bulk-import-pdf-mining-entfernen.md`
