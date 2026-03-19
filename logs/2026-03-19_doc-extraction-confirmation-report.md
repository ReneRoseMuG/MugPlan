# Doc Extraction Confirmation Report

## Zweck

Der bestehende Dokumentextraktions-Dialog wurde um einen kompakten bestaetigenden Report erweitert. Erfolgreich erkannte Felder werden sichtbar zusammengefasst, nicht erkannte Felder werden mit kurzem Grund ausgewiesen, ohne den bestehenden Uebernahmefluss fuer Kunde, Projekt und Termin zu veraendern.

## Scope

- Erweiterung des bestehenden Extraktions-Contracts um `fieldReport`
- Serverseitige Ableitung eines scope-spezifischen Feldreports fuer `customer_form`, `project_form` und `appointment_form`
- Darstellung von `Erfolgreich erkannt` und `Nicht erkannt` im bestehenden Dialog
- Uebernahme der neuen Reportdaten in die drei vorhandenen Aufrufpfade
- Vorab- und Regressions-Tests fuer Backend, Dialog und Wiring aktualisiert
- `docs/TEST_MATRIX.md` gepflegt

## Technische Entscheidungen

- Es wurde kein neuer Endpunkt und kein neuer Dialog-Flow eingefuehrt; die Erweiterung haengt am bestehenden Extraktionspfad.
- Die Parserlogik bleibt unveraendert. Der Report wird nach der bestehenden Normalisierung auf dem validierten Extraktionsergebnis aufgebaut.
- Der Report ist rein informativ und blockiert die Uebernahme nicht.
- Die Feldliste ist bewusst scope-spezifisch, damit Kunde, Projekt und Termin nur die fuer ihren Aufrufpfad relevanten Diagnosefelder sehen.
- Vorhandene `warnings` bleiben erhalten und wurden nicht in den neuen Report umgebaut.

## Betroffene Dateien

- `shared/routes.ts`
- `server/services/documentProcessingService.ts`
- `server/services/extractionValidator.ts`
- `client/src/components/DocumentExtractionDialog.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `tests/integration/server/documentExtraction.routes.test.ts`
- `tests/unit/validation/extractionValidator.structure.test.ts`
- `tests/unit/validation/dtoValidators.test.ts`
- `tests/unit/validation/extractionFieldReport.test.ts`
- `tests/unit/ui/documentExtractionDialog.ui.test.tsx`
- `tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx`
- `tests/unit/ui/customerData.documentExtractionFlow.test.tsx`
- `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
- `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

Ausgefuehrt:

- `npm run typecheck`
- gezielter Vitest-Lauf fuer die Dokumentextraktions-Tests
- voller Testlauf auf Nutzerwunsch:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`
  - `npm run test:e2e:browser`

Einordnung:

- Die auftragsrelevanten Dokumentextraktions-Tests sind gruen.
- Der volle Testlauf enthaelt zusätzliche rote Tests ausserhalb der Dokumentextraktion. Diese wurden hier nicht als Feature-Blocker gewertet, weil der Branch von `work` abgezweigt wurde und bereits geloeste Fixes aus einem anderen Arbeitsbranch noch nicht enthaelt.

## Bekannte Einschraenkungen

- Der Report erklaert nur fehlende Felder anhand der vorhandenen Extraktionsergebnisse; er fuehrt keine zusaetzliche Tiefenanalyse des PDF-Layouts durch.
- Die branchweiten Fremdfehler aus dem vollen Testlauf wurden in diesem Auftrag bewusst nicht behoben.
